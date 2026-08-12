import { expect } from "chai";
import { zeroHash } from "viem";
import hre from "hardhat";
import {
  createAttestedFixture,
  createRobotFixture,
  decryptHandles,
  decryptOwnerRoll,
  nonZero,
} from "./helpers/inco";

describe("HecliarGame confidential rounds", function () {
  for (const diceCount of [3, 4, 5, 6] as const) {
    it(`creates ${diceCount} confidential dice per side`, async function () {
      const fixture = await createRobotFixture({
        diceCount,
        gadgetsEnabled: false,
      });

      expect(nonZero(fixture.humanHandles.dice)).to.have.length(diceCount);
      expect(nonZero(fixture.robotHandles.dice)).to.have.length(diceCount);
    });
  }

  it("creates one gadget handle for each enabled side and none when disabled", async function () {
    const enabled = await createRobotFixture({
      diceCount: 4,
      gadgetsEnabled: true,
    });
    expect(enabled.humanHandles.gadget).not.to.equal(zeroHash);
    expect(enabled.robotHandles.gadget).not.to.equal(zeroHash);

    const disabled = await createRobotFixture({
      diceCount: 4,
      gadgetsEnabled: false,
    });
    expect(disabled.humanHandles.gadget).to.equal(zeroHash);
    expect(disabled.robotHandles.gadget).to.equal(zeroHash);
  });

  it("charges exactly one fee per random die and gadget operation", async function () {
    const game = await hre.viem.deployContract("HecliarGame");
    const threeDice = await game.read.requiredRoundFee([3, false]);
    const sixDice = await game.read.requiredRoundFee([6, false]);
    const fourDiceWithGadgets = await game.read.requiredRoundFee([4, true]);
    const fourDiceWithoutGadgets = await game.read.requiredRoundFee([4, false]);

    expect(sixDice).to.equal(threeDice * 2n);
    expect(fourDiceWithGadgets - fourDiceWithoutGadgets).to.equal(
      threeDice / 3n,
    );
  });

  it("rejects an underfunded round before generating handles", async function () {
    const [human, robot] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const fee = await game.read.requiredRoundFee([4, false]);

    await expect(
      game.write.createRobotMatch([4, false, robot.account.address], {
        account: human.account,
        value: fee - 1n,
      }),
    ).to.be.rejectedWith("InsufficientIncoFee");
    expect(await game.read.nextMatchId()).to.equal(1n);
  });

  it("rejects surplus funding instead of trapping it", async function () {
    const [human, robot] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const fee = await game.read.requiredRoundFee([4, false]);

    await expect(
      game.write.createRobotMatch([4, false, robot.account.address], {
        account: human.account,
        value: fee + 1n,
      }),
    ).to.be.rejectedWith("InsufficientIncoFee");
    expect(await game.read.nextMatchId()).to.equal(1n);
  });

  it("requires distinct human and robot wallets", async function () {
    const [human] = await hre.viem.getWalletClients();
    const game = await hre.viem.deployContract("HecliarGame");
    const fee = await game.read.requiredRoundFee([4, false]);

    await expect(
      game.write.createRobotMatch([4, false, human.account.address], {
        account: human.account,
        value: fee,
      }),
    ).to.be.rejectedWith("SameWallet");
  });

  it("returns only the caller's own round handles", async function () {
    const fixture = await createRobotFixture({
      diceCount: 4,
      gadgetsEnabled: true,
    });

    await expect(
      fixture.game.read.getRoundHandlesForSeat([1n, 1], {
        account: fixture.human.account,
      }),
    ).to.be.rejectedWith("UnauthorizedHandleView");
    await expect(
      fixture.game.read.getRoundHandlesForSeat([1n, 0], {
        account: fixture.robot.account,
      }),
    ).to.be.rejectedWith("UnauthorizedHandleView");
    await expect(
      fixture.game.read.getMyRoundHandles([1n], {
        account: fixture.unrelated.account,
      }),
    ).to.be.rejectedWith("NotPlayer");
  });

  // The real contract, not the harness: HecliarGameHarness stubs
  // _grantStoredSecret to an empty body, so no owner is ever granted the right
  // to decrypt and this claim cannot be tested against it. "In range" also
  // only holds for e.randBounded(6).add(1), not for the harness presets.
  it("allows each owner to decrypt only its own unique dice in range", async function () {
    const fixture = await createAttestedFixture({
      diceCount: 4,
      gadgetsEnabled: false,
    });
    const humanRoll = await decryptOwnerRoll(fixture, fixture.human);
    const robotRoll = await decryptOwnerRoll(fixture, fixture.robot);
    const activeHandles = [
      ...nonZero(fixture.humanHandles.dice),
      ...nonZero(fixture.robotHandles.dice),
    ];

    expect([...humanRoll, ...robotRoll].every((die) => die >= 1 && die <= 6)).to
      .equal(true);
    expect(new Set(activeHandles).size).to.equal(8);
    await expect(
      decryptHandles(
        fixture.robot,
        nonZero(fixture.humanHandles.dice),
      ),
    ).to.be.rejected;
    await expect(
      decryptHandles(
        fixture.unrelated,
        nonZero(fixture.humanHandles.dice),
      ),
    ).to.be.rejected;
  });
});
