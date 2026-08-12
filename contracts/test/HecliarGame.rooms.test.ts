import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { keccak256, stringToHex } from "viem";
import hre from "hardhat";

const roomHash = (name: string) => keccak256(stringToHex(name));

describe("HecliarGame rooms", function () {
  it("accepts contract dice counts 3 through 6 and rejects the rest", async function () {
    const game = await hre.viem.deployContract("HecliarGame");

    for (const diceCount of [3, 4, 5, 6]) {
      const hash = roomHash(`room-${diceCount}`);
      await game.write.createRoom([hash, diceCount, true, 3600n]);
      const id = await game.read.matchByRoomHash([hash]);
      expect((await game.read.getPublicMatch([id])).diceCount).to.equal(diceCount);
    }

    await expect(
      game.write.createRoom([roomHash("too-few"), 2, true, 3600n]),
    ).to.be.rejectedWith("InvalidDiceCount");
    await expect(
      game.write.createRoom([roomHash("too-many"), 7, true, 3600n]),
    ).to.be.rejectedWith("InvalidDiceCount");
  });

  it("creates inspectable friend rooms with a capped 24 hour lifetime", async function () {
    const [host] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const hash = roomHash("inspectable-room");
    const before = BigInt(await time.latest());

    await game.write.createRoom([hash, 4, true, 7n * 24n * 60n * 60n], {
      account: host.account,
    });

    const [id, state, expiresAt] = await game.read.inspectRoom([hash]);
    expect(id).to.equal(1n);
    expect(state.mode).to.equal(1);
    expect(state.status).to.equal(0);
    expect(state.players[0].toLowerCase()).to.equal(
      host.account.address.toLowerCase(),
    );
    expect(state.players[1]).to.equal("0x0000000000000000000000000000000000000000");
    expect(state.diceCount).to.equal(4);
    expect(state.gadgetsEnabled).to.equal(true);
    expect(expiresAt <= before + 24n * 60n * 60n + 1n).to.equal(true);
  });

  it("rejects duplicate and unknown room hashes", async function () {
    const game = await hre.viem.deployContract("HecliarGame");
    const hash = roomHash("unique-room");
    await game.write.createRoom([hash, 4, false, 3600n]);

    await expect(
      game.write.createRoom([hash, 4, false, 3600n]),
    ).to.be.rejectedWith("RoomExists");
    await expect(game.read.inspectRoom([roomHash("unknown")])).to.be.rejectedWith(
      "RoomNotFound",
    );
    await expect(game.write.joinRoom([roomHash("unknown")])).to.be.rejectedWith(
      "RoomNotFound",
    );
  });

  it("admits one distinct guest and rejects the host and a third wallet", async function () {
    const [host, guest, third] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const firstHash = roomHash("same-wallet-room");
    await game.write.createRoom([firstHash, 4, true, 3600n], {
      account: host.account,
    });

    await expect(
      game.write.joinRoom([firstHash], { account: host.account }),
    ).to.be.rejectedWith("SameWallet");

    await game.write.joinRoom([firstHash], { account: guest.account });
    const id = await game.read.matchByRoomHash([firstHash]);
    const state = await game.read.getPublicMatch([id]);
    expect(state.players[1].toLowerCase()).to.equal(
      guest.account.address.toLowerCase(),
    );
    expect(state.status).to.equal(1);
    await expect(
      game.write.joinRoom([firstHash], { account: third.account }),
    ).to.be.rejectedWith("RoomFull");
  });

  it("rejects admission after the room expires", async function () {
    const [, guest] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    const game = await hre.viem.deployContract("HecliarGame");
    const hash = roomHash("expired-room");
    // Confirm before reading: hardhat-viem resolves a write on submission, so
    // matchByRoomHash can return 0 here, making roomExpiry(0) return 0 and
    // setNextBlockTimestamp(0) fail on the previous block's timestamp.
    await publicClient.waitForTransactionReceipt({
      hash: await game.write.createRoom([hash, 4, false, 10n]),
    });
    const id = await game.read.matchByRoomHash([hash]);
    await time.setNextBlockTimestamp(await game.read.roomExpiry([id]));

    await expect(
      game.write.joinRoom([hash], { account: guest.account }),
    ).to.be.rejectedWith("RoomExpired");
  });

  it("stops applying the admission expiry after a guest joins", async function () {
    const [host, guest, third] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const hash = roomHash("joined-room");
    await game.write.createRoom([hash, 4, false, 10n], {
      account: host.account,
    });
    await game.write.joinRoom([hash], { account: guest.account });
    const id = await game.read.matchByRoomHash([hash]);
    await time.increaseTo((await game.read.roomExpiry([id])) + 1n);

    expect((await game.read.inspectRoom([hash]))[1].status).to.equal(1);
    await expect(
      game.write.joinRoom([hash], { account: third.account }),
    ).to.be.rejectedWith("RoomFull");
  });
});
