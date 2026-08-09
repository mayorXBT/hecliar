import { expect } from "chai";
import { zeroHash } from "viem";
import hre from "hardhat";
import {
  createRobotFixture,
  decryptHandles,
  decryptOwnerRoll,
  getTestLightning,
  nonZero,
} from "./helpers/inco";

describe("HecliarGame confidential rounds", function () {
  for (const diceCount of [3, 4, 5, 6] as const) {
    it(`creates ${diceCount} confidential dice per side`, async function () {
      const fixture = await createRobotFixture({
        diceCount,
        gadgetsEnabled: false,
      });

      for (const handles of [
        fixture.humanHandles.dice,
        fixture.robotHandles.dice,
      ]) {
        expect(handles.slice(0, diceCount).every((handle) => handle !== zeroHash))
          .to.equal(true);
        expect(handles.slice(diceCount).every((handle) => handle === zeroHash))
          .to.equal(true);
      }
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

  it("matches the live Inco fee for every random die and gadget operation", async function () {
    const game = await hre.viem.deployContract("HecliarGame");
    const publicClient = await hre.viem.getPublicClient();
    const zap = await getTestLightning();
    const liveIncoFee = await publicClient.readContract({
      address: zap.executorAddress,
      abi: [
        {
          type: "function",
          name: "getFee",
          stateMutability: "view",
          inputs: [],
          outputs: [{ type: "uint256" }],
        },
      ] as const,
      functionName: "getFee",
    });

    expect(await game.read.requiredRoundFee([4, true])).to.equal(
      liveIncoFee * 10n,
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

  it("allows each owner to decrypt only its own unique dice in range", async function () {
    const fixture = await createRobotFixture({
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

  it("allows each owner to decrypt only its own gadget assignment", async function () {
    const fixture = await createRobotFixture({
      diceCount: 4,
      gadgetsEnabled: true,
    });
    const humanGadget = await decryptHandles(fixture.human, [
      fixture.humanHandles.gadget,
    ]);
    const robotGadget = await decryptHandles(fixture.robot, [
      fixture.robotHandles.gadget,
    ]);

    expect(Number(humanGadget[0].plaintext.value)).to.be.within(0, 2);
    expect(Number(robotGadget[0].plaintext.value)).to.be.within(0, 2);
    await expect(
      decryptHandles(fixture.robot, [fixture.humanHandles.gadget]),
    ).to.be.rejected;
    await expect(
      decryptHandles(fixture.human, [fixture.robotHandles.gadget]),
    ).to.be.rejected;
    await expect(
      decryptHandles(fixture.unrelated, [fixture.humanHandles.gadget]),
    ).to.be.rejected;
    await expect(
      decryptHandles(fixture.unrelated, [fixture.robotHandles.gadget]),
    ).to.be.rejected;
  });
});
