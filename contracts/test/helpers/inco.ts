import { Lightning } from "@inco/lightning-js/lite";
import {
  bytesToHex,
  zeroHash,
  type Hex,
} from "viem";
import hre from "hardhat";

export const nonZero = (handles: readonly Hex[]) =>
  handles.filter((handle) => handle !== zeroHash);

export const getTestLightning = () => Lightning.localNode("mainnet");

export async function createRobotFixture(options: {
  diceCount: 3 | 4 | 5 | 6;
  gadgetsEnabled: boolean;
}) {
  const [human, robot, unrelated] = await hre.viem.getWalletClients();
  const game = await hre.viem.deployContract("HecliarGame");
  const roundFee = await game.read.requiredRoundFee([
    options.diceCount,
    options.gadgetsEnabled,
  ]);
  const publicClient = await hre.viem.getPublicClient();
  const startBlock = await publicClient.getBlockNumber();
  await game.write.createRobotMatch(
    [options.diceCount, options.gadgetsEnabled, robot.account.address],
    { account: human.account, value: roundFee },
  );

  return {
    game,
    human,
    robot,
    unrelated,
    roundFee,
    startBlock,
    publicClient,
    humanHandles: await game.read.getMyRoundHandles([1n], {
      account: human.account,
    }),
    robotHandles: await game.read.getMyRoundHandles([1n], {
      account: robot.account,
    }),
  };
}

export const activeRobotFixture = (
  options: {
    diceCount?: 3 | 4 | 5 | 6;
    gadgetsEnabled?: boolean;
  } = {},
) =>
  createRobotFixture({
    diceCount: options.diceCount ?? 4,
    gadgetsEnabled: options.gadgetsEnabled ?? false,
  });

type RobotFixture = Awaited<ReturnType<typeof createRobotFixture>>;
type TestLightning = Awaited<ReturnType<typeof getTestLightning>>;
type LightningWalletClient = Parameters<TestLightning["attestedDecrypt"]>[0];

export async function decryptOwnerRoll(
  fixture: RobotFixture,
  owner: RobotFixture["human"],
) {
  const handles = await fixture.game.read.getMyRoundHandles([1n], {
    account: owner.account,
  });
  const results = await decryptHandles(owner, nonZero(handles.dice));
  return results.map(
    (result) =>
      Number(result.plaintext.value) as 1 | 2 | 3 | 4 | 5 | 6,
  );
}

export async function decryptHandles(
  owner: RobotFixture["human"],
  handles: readonly Hex[],
) {
  const zap = await getTestLightning();
  return zap.attestedDecrypt(
    owner as unknown as LightningWalletClient,
    [...handles],
  );
}

type ChallengeHandles = {
  dice: readonly Hex[];
  effectiveCount: Hex;
  effectCodes: readonly Hex[];
};

type RevealedAttestation = {
  handle: string;
  plaintext: { value: bigint | boolean };
  covalidatorSignatures: readonly Uint8Array[];
};

export function packByHandleOrder(
  handles: ChallengeHandles,
  revealed: readonly RevealedAttestation[],
) {
  const requested = [
    ...handles.dice,
    handles.effectiveCount,
    ...handles.effectCodes,
  ];
  const expectedHandles = new Set<string>();
  for (const handle of requested) {
    if (handle === zeroHash) continue;
    const key = handle.toLowerCase();
    if (expectedHandles.has(key)) {
      throw new Error(`Duplicate requested handle ${handle}`);
    }
    expectedHandles.add(key);
  }

  const byHandle = new Map<string, RevealedAttestation>();

  for (const attestation of revealed) {
    const key = attestation.handle.toLowerCase();
    if (!expectedHandles.has(key)) {
      throw new Error(`Attestation set contains an unexpected handle ${attestation.handle}`);
    }
    if (byHandle.has(key)) {
      throw new Error(`Duplicate attestation for handle ${attestation.handle}`);
    }
    if (attestation.covalidatorSignatures.length === 0) {
      throw new Error(`Missing signatures for handle ${attestation.handle}`);
    }
    byHandle.set(key, attestation);
  }

  for (const handle of expectedHandles) {
    if (!byHandle.has(handle)) {
      throw new Error(`Missing attestation for handle ${handle}`);
    }
  }

  const valueFor = (handle: Hex) =>
    handle === zeroHash
      ? 0n
      : BigInt(byHandle.get(handle.toLowerCase())!.plaintext.value);
  const signaturesFor = (handle: Hex) =>
    handle === zeroHash
      ? []
      : byHandle
          .get(handle.toLowerCase())!
          .covalidatorSignatures.map((signature) => bytesToHex(signature));

  return {
    dieValues: handles.dice.map(valueFor),
    dieSignatures: handles.dice.map(signaturesFor),
    effectiveCount: valueFor(handles.effectiveCount),
    effectiveCountSignatures: signaturesFor(handles.effectiveCount),
    effectCodes: handles.effectCodes.map(valueFor),
    effectCodeSignatures: handles.effectCodes.map(signaturesFor),
  };
}

export async function revealAndPack(
  game: RobotFixture["game"],
  matchId: bigint,
) {
  const challengeGame = game as unknown as {
    read: {
      getChallengeHandles(args: readonly [bigint]): Promise<ChallengeHandles>;
    };
  };
  const handles = await challengeGame.read.getChallengeHandles([matchId]);
  const zap = await getTestLightning();
  const revealed = await zap.attestedReveal(
    nonZero([
      ...handles.dice,
      handles.effectiveCount,
      ...handles.effectCodes,
    ]),
  );
  return packByHandleOrder(handles, revealed);
}
