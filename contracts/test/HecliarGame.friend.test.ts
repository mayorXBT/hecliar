import { expect } from "chai";
import { keccak256, toHex, zeroHash } from "viem";
import hre from "hardhat";
import { withConfirmedWrites, withCovalidatorRetry } from "./helpers/inco";

/**
 * Friend mode against the real contract, so Inco fees and grants are real.
 *
 * The rooms suite covers creating, joining and expiry but never setReady,
 * which is the transition that actually starts a match: when both seats are
 * ready it calls _generateRound, which spends an Inco fee per die.
 */

const describeInco = hre.network.name === "anvil" ? describe : describe.skip;

const roomHash = (code: string) => keccak256(toHex(code));

async function friendRoom(code: string, diceCount: 3 | 4 | 5 | 6 = 4) {
  const [host, guest] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const game = withConfirmedWrites(
    await hre.viem.deployContract("HecliarGame"),
    publicClient,
  );
  const hash = roomHash(code);

  await game.write.createRoom([hash, diceCount, false, 3600n], {
    account: host.account,
  });
  const matchId = await game.read.matchByRoomHash([hash]);
  await game.write.joinRoom([hash], { account: guest.account });

  // Each seat funds its own dice, so readying up is payable.
  const seatFee = await game.read.requiredSeatFee([diceCount, false]);

  return { game, host, guest, publicClient, matchId, diceCount, seatFee };
}

describeInco("HecliarGame friend mode", function () {
  it("moves a room to waiting-for-ready once a guest joins", async function () {
    const { game, matchId, host, guest } = await friendRoom("ready-room");
    const state = await game.read.getPublicMatch([matchId]);

    expect(state.status).to.equal(1); // WaitingForReady
    expect(state.players[0].toLowerCase()).to.equal(host.account.address.toLowerCase());
    expect(state.players[1].toLowerCase()).to.equal(guest.account.address.toLowerCase());
  });

  it("deals confidential dice to both seats once both are ready", async function () {
    const { game, matchId, host, guest, diceCount, seatFee } = await friendRoom("dealt-room");

    await game.write.setReady([matchId], { account: host.account, value: seatFee });
    const halfway = await game.read.getPublicMatch([matchId]);
    expect(halfway.status, "one ready should not start the match").to.equal(1);

    await game.write.setReady([matchId], { account: guest.account, value: seatFee });

    const started = await game.read.getPublicMatch([matchId]);
    expect(started.status, "both ready should start the match").to.equal(3);
    expect(started.roundNumber).to.equal(1);

    // The point of the mode: each seat holds its own confidential dice, and
    // the contract has granted only that seat the right to read them.
    for (const player of [host, guest]) {
      const handles = await withCovalidatorRetry(async () => {
        const read = await game.read.getMyRoundHandles([matchId], {
          account: player.account,
        });
        const dealt = read.dice.filter((die) => die !== zeroHash);
        if (dealt.length === 0) throw new Error("dice not rolled yet");
        return dealt;
      }, `dice for ${player.account.address}`);

      expect(handles).to.have.length(diceCount);
    }
  });

  it("rejects an unfunded ready instead of failing inside the roll", async function () {
    const { game, matchId, host } = await friendRoom("unfunded-room");

    await expect(
      game.write.setReady([matchId], { account: host.account, value: 0n }),
    ).to.be.rejectedWith("InsufficientIncoFee");
  });

  it("charges each seat exactly half the round", async function () {
    const { game, diceCount } = await friendRoom("halves-room");
    for (const gadgets of [false, true]) {
      const round = await game.read.requiredRoundFee([diceCount, gadgets]);
      const seat = await game.read.requiredSeatFee([diceCount, gadgets]);
      expect(seat * 2n, `dice=${diceCount} gadgets=${gadgets}`).to.equal(round);
    }
  });

  it("refuses to let a non-player read the round handles", async function () {
    const { game, matchId, host, guest, seatFee } = await friendRoom("private-room");
    await game.write.setReady([matchId], { account: host.account, value: seatFee });
    await game.write.setReady([matchId], { account: guest.account, value: seatFee });

    const [, , outsider] = await hre.viem.getWalletClients();
    await expect(
      game.read.getMyRoundHandles([matchId], { account: outsider.account }),
    ).to.be.rejectedWith("NotPlayer");
  });
});
