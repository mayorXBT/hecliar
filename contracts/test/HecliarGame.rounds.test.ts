import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { zeroHash, type Hex } from "viem";
import hre from "hardhat";
import {
  activeRobotFixture,
  createAttestedFixture,
  decryptHandles,
  fundAndStartNextRound,
  nonZero,
  revealAndPack,
  settlePresetRound,
  withConfirmedWrites,
} from "./helpers/inco";

const presetDice = [1n, 2n, 3n, 4n, 2n, 3n, 4n, 5n];
type Fixed12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];
type TestSettlement = {
  dieValues: Fixed12<bigint>;
  dieSignatures: Fixed12<Hex[]>;
  effectiveCount: bigint;
  effectiveCountSignatures: Hex[];
};
const validSignature: Hex[] = ["0x01"];

function localSettlement(
  effectiveCount: bigint,
  dice: readonly bigint[] = presetDice,
): TestSettlement {
  const dieValues: Fixed12<bigint> = [
    dice[0],
    dice[1],
    dice[2],
    dice[3],
    0n,
    0n,
    dice[4],
    dice[5],
    dice[6],
    dice[7],
    0n,
    0n,
  ];
  return {
    dieValues,
    dieSignatures: [
      [...validSignature],
      [...validSignature],
      [...validSignature],
      [...validSignature],
      [],
      [],
      [...validSignature],
      [...validSignature],
      [...validSignature],
      [...validSignature],
      [],
      [],
    ],
    effectiveCount,
    effectiveCountSignatures: [...validSignature],
  };
}

async function activeLocalRobotFixture() {
  const [human, robot, unrelated] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const game = withConfirmedWrites(
    await hre.viem.deployContract("HecliarGameHarness"),
    publicClient,
  );
  await game.write.setPresetSecrets([presetDice, []]);
  await game.write.createRobotMatch(
    [4, false, robot.account.address],
    { account: human.account, value: 0n },
  );
  return { game, human, robot, unrelated, publicClient };
}

/**
 * hardhat-viem resolves a write as soon as the transaction is submitted, not
 * when it is mined, so reading state on the next line can return the value
 * from before the call. Measured at 3 stale reads in 48 iterations, which is
 * why the bid-loop tests failed on a different quantity each run.
 */
async function confirmed(
  publicClient: Awaited<ReturnType<typeof hre.viem.getPublicClient>>,
  write: Promise<`0x${string}`>,
) {
  await publicClient.waitForTransactionReceipt({ hash: await write });
}

type LocalFixture = Awaited<ReturnType<typeof activeLocalRobotFixture>>;

async function settleLocalRound(
  fixture: LocalFixture,
  winner: 0 | 1,
) {
  const state = await fixture.game.read.getPublicMatch([1n]);
  const bidder = Number(state.activeSeat) as 0 | 1;
  const bidderWallet = bidder === 0 ? fixture.human : fixture.robot;
  const challengerWallet = bidder === 0 ? fixture.robot : fixture.human;
  const quantity = winner === bidder ? 2 : 3;
  // Every write is confirmed before the next reads or depends on the sequence:
  // an unconfirmed write leaves the next read one step behind and the run
  // fails with StaleSequence.
  await confirmed(fixture.publicClient, fixture.game.write.setPresetEffectiveCounts([[2n]]));
  await confirmed(fixture.publicClient, fixture.game.write.raise(
    [1n, quantity, 3, state.actionSequence],
    { account: bidderWallet.account },
  ));
  await confirmed(fixture.publicClient, fixture.game.write.challenge(
    [1n, state.actionSequence + 1],
    { account: challengerWallet.account },
  ));
  await confirmed(fixture.publicClient, fixture.game.write.settleChallenge(
    [1n, localSettlement(2n), state.actionSequence + 2],
    { account: challengerWallet.account },
  ));
}

async function startNextLocalRound(
  fixture: LocalFixture,
  dice = presetDice,
) {
  await confirmed(fixture.publicClient, fixture.game.write.setPresetSecrets([dice, []]));
  const state = await fixture.game.read.getPublicMatch([1n]);
  const fee = await fixture.game.read.requiredRoundFee([4, false]);
  await confirmed(fixture.publicClient, fixture.game.write.fundAndStartNextRound(
    [1n, state.actionSequence],
    { account: fixture.human.account, value: fee },
  ));
}

describe("HecliarGame active rounds", function () {
  it("supports a deterministic Hardhat-local round without weakening production randomness", async function () {
    const before = BigInt(await time.latest());
    const { game } = await activeLocalRobotFixture();
    const state = await game.read.getPublicMatch([1n]);
    expect(state.status).to.equal(3);
    expect(state.actionSequence).to.equal(0);
    expect(state.actionDeadline >= before + 45n).to.equal(true);
    expect(state.abandonmentDeadline >= before + 120n).to.equal(true);
  });

  it("accepts every in-bounds opening bid", async function () {
    for (let quantity = 1; quantity <= 8; quantity += 1) {
      for (let face = 1; face <= 6; face += 1) {
        const { game, human, publicClient } = await activeLocalRobotFixture();
        await confirmed(publicClient, game.write.raise([1n, quantity, face, 0], {
          account: human.account,
        }));
        const state = await game.read.getPublicMatch([1n]);
        expect(state.currentBid.quantity).to.equal(quantity);
        expect(state.currentBid.face).to.equal(face);
      }
    }
  });

  it("accepts every strictly higher bid", async function () {
    const validHigherBids: Array<readonly [number, number]> = [[2, 6]];
    for (let quantity = 3; quantity <= 8; quantity += 1) {
      for (let face = 1; face <= 6; face += 1) {
        validHigherBids.push([quantity, face]);
      }
    }

    for (const [quantity, face] of validHigherBids) {
      const { game, human, robot, publicClient } = await activeLocalRobotFixture();
      await confirmed(publicClient, game.write.raise([1n, 2, 5, 0], { account: human.account }));
      await confirmed(publicClient, game.write.raise([1n, quantity, face, 1], {
        account: robot.account,
      }));

      const state = await game.read.getPublicMatch([1n]);
      expect(state.currentBid.quantity).to.equal(quantity);
      expect(state.currentBid.face).to.equal(face);
      expect(state.currentBid.bidderSeat).to.equal(1);
      expect(state.currentBid.sequence).to.equal(2);
      expect(state.actionSequence).to.equal(2);
      expect(state.activeSeat).to.equal(0);
    }
  });

  it("rejects equal, lower, and out-of-bounds bids without changing state", async function () {
    const invalidBids = [
      [2, 5],
      [2, 4],
      [1, 6],
      [0, 1],
      [9, 1],
      [1, 0],
      [1, 7],
    ] as const;

    for (const [quantity, face] of invalidBids) {
      const { game, human, robot } = await activeLocalRobotFixture();
      await game.write.raise([1n, 2, 5, 0], { account: human.account });
      await expect(
        game.write.raise([1n, quantity, face, 1], {
          account: robot.account,
        }),
      ).to.be.rejectedWith("InvalidBid");

      const state = await game.read.getPublicMatch([1n]);
      expect(state.currentBid.quantity).to.equal(2);
      expect(state.currentBid.face).to.equal(5);
      expect(state.actionSequence).to.equal(1);
      expect(state.activeSeat).to.equal(1);
    }
  });

  it("rejects stale and out-of-turn raises", async function () {
    const { game, human, robot } = await activeLocalRobotFixture();
    await expect(
      game.write.raise([1n, 1, 2, 4], { account: human.account }),
    ).to.be.rejectedWith("StaleSequence");
    await expect(
      game.write.raise([1n, 1, 2, 0], { account: robot.account }),
    ).to.be.rejectedWith("NotActivePlayer");
  });

  it("rotates the turn and refreshes the 45/120 second deadlines", async function () {
    const { game, human } = await activeLocalRobotFixture();
    const before = BigInt(await time.latest());
    await game.write.raise([1n, 1, 2, 0], { account: human.account });

    const state = await game.read.getPublicMatch([1n]);
    expect(state.activeSeat).to.equal(1);
    expect(state.actionDeadline >= before + 45n).to.equal(true);
    expect(state.actionDeadline <= before + 46n).to.equal(true);
    expect(state.abandonmentDeadline >= before + 120n).to.equal(true);
    expect(state.abandonmentDeadline <= before + 121n).to.equal(true);
  });

  it("rejects a challenge before any bid exists", async function () {
    const { game, human } = await activeLocalRobotFixture();
    await expect(
      game.write.challenge([1n, 0], { account: human.account }),
    ).to.be.rejectedWith("NoBid");
  });

  it("rejects stale and out-of-turn challenges", async function () {
    const { game, human, robot } = await activeLocalRobotFixture();
    await game.write.raise([1n, 2, 3, 0], { account: human.account });
    await expect(
      game.write.challenge([1n, 0], { account: robot.account }),
    ).to.be.rejectedWith("StaleSequence");
    await expect(
      game.write.challenge([1n, 1], { account: human.account }),
    ).to.be.rejectedWith("NotActivePlayer");
  });

  it("moves a challenge into resolving exactly once and publishes only reveal handles", async function () {
    const { game, human, robot } = await activeLocalRobotFixture();
    await game.write.setPresetEffectiveCounts([[3n]]);
    await game.write.raise([1n, 2, 3, 0], { account: human.account });
    await game.write.challenge([1n, 1], { account: robot.account });

    const state = await game.read.getPublicMatch([1n]);
    expect(state.status).to.equal(4);
    expect(state.actionSequence).to.equal(2);
    const handles = await game.read.getChallengeHandles([1n]);
    expect(handles.dice.slice(0, 4)).to.deep.equal(
      presetDice.slice(0, 4).map((value) =>
        `0x${value.toString(16).padStart(64, "0")}`),
    );
    expect(handles.dice.slice(4, 6).every((value) =>
      value === `0x${"0".repeat(64)}`)).to.equal(true);
    expect(handles.effectiveCount).to.equal(
      `0x${(3n).toString(16).padStart(64, "0")}`,
    );
    expect(handles.effectCodes).to.deep.equal([
      `0x${"0".repeat(64)}`,
      `0x${"0".repeat(64)}`,
    ]);

    await expect(
      game.write.challenge([1n, 2], { account: human.account }),
    ).to.be.rejectedWith("WrongStatus");
  });

  it("settles truthful and false bids from verified dice and count attestations", async function () {
    for (const [quantity, expectedScore, expectedWinner] of [
      [2, [1, 0], 0],
      [3, [0, 1], 1],
    ] as const) {
      const { game, human, robot } = await activeLocalRobotFixture();
      await game.write.setPresetEffectiveCounts([[2n]]);
      await game.write.raise([1n, quantity, 3, 0], {
        account: human.account,
      });
      await game.write.challenge([1n, 1], { account: robot.account });
      await game.write.settleChallenge(
        [1n, localSettlement(2n), 2],
        { account: robot.account },
      );

      const state = await game.read.getPublicMatch([1n]);
      expect([...state.score]).to.deep.equal(expectedScore);
      expect(state.status).to.equal(5);
      expect(state.actionSequence).to.equal(3);
      const result = await game.read.getRoundResult([1n, 1]);
      expect(result.settled).to.equal(true);
      expect(result.baseCount).to.equal(2);
      expect(result.effectiveCount).to.equal(2n);
      expect(result.winnerSeat).to.equal(expectedWinner);
      expect([...result.resultingScore]).to.deep.equal(expectedScore);
      expect(result.revealedRolls[0].slice(0, 4)).to.deep.equal([1, 2, 3, 4]);
      expect(result.revealedRolls[1].slice(0, 4)).to.deep.equal([2, 3, 4, 5]);
    }
  });

  it("rejects tampered active dice, signatures, and effective counts without scoring", async function () {
    for (const mutate of [
      (settlement: ReturnType<typeof localSettlement>) => {
        settlement.dieValues[0] = 6n;
      },
      (settlement: ReturnType<typeof localSettlement>) => {
        settlement.dieSignatures[0] = ["0x02"];
      },
      (settlement: ReturnType<typeof localSettlement>) => {
        settlement.effectiveCount = 1n;
      },
      (settlement: ReturnType<typeof localSettlement>) => {
        settlement.effectiveCountSignatures = ["0x02"];
      },
    ]) {
      const { game, human, robot } = await activeLocalRobotFixture();
      await game.write.setPresetEffectiveCounts([[2n]]);
      await game.write.raise([1n, 2, 3, 0], { account: human.account });
      await game.write.challenge([1n, 1], { account: robot.account });
      const settlement = localSettlement(2n);
      mutate(settlement);

      await expect(
        game.write.settleChallenge([1n, settlement, 2]),
      ).to.be.rejectedWith("InvalidAttestation");
      const state = await game.read.getPublicMatch([1n]);
      expect([...state.score]).to.deep.equal([0, 0]);
      expect(state.status).to.equal(4);
      expect(state.actionSequence).to.equal(2);
      await expect(game.read.getRoundResult([1n, 1])).to.be.rejectedWith(
        "RoundNotSettled",
      );
    }
  });

  it("requires canonical zero packing for every inactive die slot", async function () {
    for (const mutate of [
      (settlement: ReturnType<typeof localSettlement>) => {
        settlement.dieValues[4] = 1n;
      },
      (settlement: ReturnType<typeof localSettlement>) => {
        settlement.dieSignatures[4] = ["0x01"];
      },
    ]) {
      const { game, human, robot } = await activeLocalRobotFixture();
      await game.write.setPresetEffectiveCounts([[2n]]);
      await game.write.raise([1n, 2, 3, 0], { account: human.account });
      await game.write.challenge([1n, 1], { account: robot.account });
      const settlement = localSettlement(2n);
      mutate(settlement);
      await expect(
        game.write.settleChallenge([1n, settlement, 2]),
      ).to.be.rejectedWith("InvalidInactiveSlot");
      expect([...(await game.read.getPublicMatch([1n])).score]).to.deep.equal([
        0, 0,
      ]);
    }
  });

  it("scores exactly once and rejects stale or duplicate settlement", async function () {
    const { game, human, robot } = await activeLocalRobotFixture();
    await game.write.setPresetEffectiveCounts([[2n]]);
    await game.write.raise([1n, 2, 3, 0], { account: human.account });
    await game.write.challenge([1n, 1], { account: robot.account });
    const settlement = localSettlement(2n);

    await expect(
      game.write.settleChallenge([1n, settlement, 1]),
    ).to.be.rejectedWith("StaleSequence");
    await game.write.settleChallenge([1n, settlement, 2]);
    await expect(
      game.write.settleChallenge([1n, settlement, 2]),
    ).to.be.rejectedWith("WrongStatus");
    expect([...(await game.read.getPublicMatch([1n])).score]).to.deep.equal([
      1, 0,
    ]);
  });

  it("requires the Robot human to pay the exact next-round fee", async function () {
    const fixture = await activeLocalRobotFixture();
    await settleLocalRound(fixture, 0);
    await fixture.game.write.setTestIncoFee([7n]);
    await fixture.game.write.setPresetSecrets([presetDice, []]);
    const state = await fixture.game.read.getPublicMatch([1n]);
    const fee = 56n;

    await expect(
      fixture.game.write.fundAndStartNextRound(
        [1n, state.actionSequence - 1],
        { account: fixture.human.account, value: fee },
      ),
    ).to.be.rejectedWith("StaleSequence");
    await expect(
      fixture.game.write.fundAndStartNextRound(
        [1n, state.actionSequence],
        { account: fixture.robot.account, value: fee },
      ),
    ).to.be.rejectedWith("NotRoundFunder");
    await expect(
      fixture.game.write.fundAndStartNextRound(
        [1n, state.actionSequence],
        { account: fixture.human.account, value: fee - 1n },
      ),
    ).to.be.rejectedWith("InsufficientIncoFee");
    await expect(
      fixture.game.write.fundAndStartNextRound(
        [1n, state.actionSequence],
        { account: fixture.human.account, value: fee + 1n },
      ),
    ).to.be.rejectedWith("InsufficientIncoFee");
    expect((await fixture.game.read.getPublicMatch([1n])).roundNumber).to.equal(
      1,
    );
  });

  it("starts a fresh round, alternates the starter, and preserves immutable results", async function () {
    const fixture = await activeLocalRobotFixture();
    await settleLocalRound(fixture, 0);
    const firstResult = await fixture.game.read.getRoundResult([1n, 1]);
    const firstHandles = await fixture.game.read.getMyRoundHandles([1n], {
      account: fixture.human.account,
    });
    const secondDice = [6n, 5n, 4n, 3n, 1n, 2n, 5n, 6n];
    await startNextLocalRound(fixture, secondDice);

    const state = await fixture.game.read.getPublicMatch([1n]);
    expect(state.status).to.equal(3);
    expect(state.roundNumber).to.equal(2);
    expect(state.startingSeat).to.equal(1);
    expect(state.activeSeat).to.equal(1);
    expect(state.actionSequence).to.equal(4);
    expect(state.currentBid.quantity).to.equal(0);
    const secondHandles = await fixture.game.read.getMyRoundHandles([1n], {
      account: fixture.human.account,
    });
    expect(secondHandles.dice).not.to.deep.equal(firstHandles.dice);
    expect(await fixture.game.read.getRoundResult([1n, 1])).to.deep.equal(
      firstResult,
    );
  });

  it("completes a match 2-0 exactly once", async function () {
    const fixture = await activeLocalRobotFixture();
    await settleLocalRound(fixture, 0);
    await startNextLocalRound(fixture);
    await settleLocalRound(fixture, 0);

    const state = await fixture.game.read.getPublicMatch([1n]);
    expect([...state.score]).to.deep.equal([2, 0]);
    expect(state.status).to.equal(6);
    await expect(
      fixture.game.write.fundAndStartNextRound(
        [1n, state.actionSequence],
        { account: fixture.human.account, value: 0n },
      ),
    ).to.be.rejectedWith("WrongStatus");
  });

  it("completes a match 2-1 with alternating starters", async function () {
    const fixture = await activeLocalRobotFixture();
    await settleLocalRound(fixture, 0);
    await startNextLocalRound(fixture);
    expect((await fixture.game.read.getPublicMatch([1n])).startingSeat).to.equal(
      1,
    );
    await settleLocalRound(fixture, 1);
    await startNextLocalRound(fixture);
    expect((await fixture.game.read.getPublicMatch([1n])).startingSeat).to.equal(
      0,
    );
    await settleLocalRound(fixture, 0);

    const state = await fixture.game.read.getPublicMatch([1n]);
    expect([...state.score]).to.deep.equal([2, 1]);
    expect(state.status).to.equal(6);
    expect(state.roundNumber).to.equal(3);
  });
});

const describeInco = hre.network.name === "anvil" ? describe : describe.skip;

describeInco("HecliarGame attested challenge lifecycle", function () {
  it("keeps opponent dice private until challenge and settles exact real attestations", async function () {
    const fixture = await createAttestedFixture();
    await expect(
      decryptHandles(fixture.robot, nonZero(fixture.humanHandles.dice)),
    ).to.be.rejected;
    await expect(
      fixture.game.read.getChallengeHandles([1n]),
    ).to.be.rejectedWith("WrongStatus");

    await fixture.game.write.raise([1n, 1, 1, 0], {
      account: fixture.human.account,
    });
    await fixture.game.write.challenge([1n, 1], {
      account: fixture.robot.account,
    });
    const handles = await fixture.game.read.getChallengeHandles([1n]);
    expect(nonZero(handles.dice)).to.have.length(8);
    expect(handles.effectiveCount).not.to.equal(zeroHash);
    expect(handles.effectCodes).to.deep.equal([zeroHash, zeroHash]);

    const settlement = await revealAndPack(fixture.game, 1n);
    await fixture.game.write.settleChallenge([1n, settlement, 2], {
      account: fixture.robot.account,
    });
    const result = await fixture.game.read.getRoundResult([1n, 1]);
    expect(result.settled).to.equal(true);
    expect(result.effectiveCount).to.equal(settlement.effectiveCount);
  });

  it("rejects tampered real die and count attestations without scoring", async function () {
    for (const mutate of [
      (settlement: Awaited<ReturnType<typeof revealAndPack>>) => {
        settlement.dieValues[0] =
          settlement.dieValues[0] === 6n ? 1n : settlement.dieValues[0] + 1n;
      },
      (settlement: Awaited<ReturnType<typeof revealAndPack>>) => {
        settlement.dieSignatures[0] = ["0xdead"];
      },
      (settlement: Awaited<ReturnType<typeof revealAndPack>>) => {
        settlement.effectiveCount += 1n;
      },
      (settlement: Awaited<ReturnType<typeof revealAndPack>>) => {
        settlement.effectiveCountSignatures = ["0xdead"];
      },
    ]) {
      const fixture = await createAttestedFixture();
      await fixture.game.write.raise([1n, 1, 1, 0], {
        account: fixture.human.account,
      });
      await fixture.game.write.challenge([1n, 1], {
        account: fixture.robot.account,
      });
      const settlement = await revealAndPack(fixture.game, 1n);
      mutate(settlement);
      await expect(
        fixture.game.write.settleChallenge([1n, settlement, 2]),
      ).to.be.rejectedWith("InvalidAttestation");
      const state = await fixture.game.read.getPublicMatch([1n]);
      expect([...state.score]).to.deep.equal([0, 0]);
      expect(state.status).to.equal(4);
    }
  });

  it("generates fresh owner-only handles for the next funded round", async function () {
    const fixture = await createAttestedFixture();
    await settlePresetRound(fixture, { winner: 0 });
    const oldHumanDice = nonZero(fixture.humanHandles.dice);
    await fundAndStartNextRound(fixture);
    const newHumanHandles = await fixture.game.read.getMyRoundHandles([1n], {
      account: fixture.human.account,
    });
    const newHumanDice = nonZero(newHumanHandles.dice);
    expect(newHumanDice).not.to.deep.equal(oldHumanDice);
    await decryptHandles(fixture.human, newHumanDice);
    await expect(decryptHandles(fixture.robot, newHumanDice)).to.be.rejected;
    await expect(
      decryptHandles(fixture.unrelated, newHumanDice),
    ).to.be.rejected;
  });
});
