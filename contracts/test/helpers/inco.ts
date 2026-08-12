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

/**
 * The covalidator is an observer, not a synchronous service. It polls the
 * chain once a second ("Observed blocks" in its log) and can only attest to a
 * handle once it has seen the block that created it.
 *
 * A test that writes handles and immediately decrypts them is therefore
 * racing that poll. On a cold node the observer is still catching up and the
 * race is lost more often, which is why the suite scored differently on a
 * fresh node than on a warm one and why re-running changed the result.
 *
 * This converts that race into a bounded wait. It does not paper over real
 * failures: a wrong value or a genuinely missing attestation still fails,
 * just after the retries are exhausted rather than before the observer had a
 * chance.
 */
const COVALIDATOR_ATTEMPTS = 12;
const COVALIDATOR_DELAY_MS = 750;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withCovalidatorRetry<T>(
  operation: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= COVALIDATOR_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < COVALIDATOR_ATTEMPTS) await sleep(COVALIDATOR_DELAY_MS);
    }
  }
  throw new Error(
    `${label} did not succeed after ${COVALIDATOR_ATTEMPTS} attempts over ` +
      `${(COVALIDATOR_ATTEMPTS * COVALIDATOR_DELAY_MS) / 1000}s. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export async function createRobotFixture(options: {
  diceCount: 3 | 4 | 5 | 6;
  gadgetsEnabled: boolean;
}) {
  const [human, robot, unrelated] = await hre.viem.getWalletClients();
  const game = await hre.viem.deployContract("HecliarGameHarness");
  await game.write.setTestIncoFee([0n]);
  const dicePreset = Array.from({ length: options.diceCount * 2 }, (_e, i) => BigInt(i + 1));
  const gadgetPreset = options.gadgetsEnabled ? [1n, 2n] : [];
  await game.write.setPresetSecrets([dicePreset, gadgetPreset]);
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
    humanHandles: await whenRolled(() =>
      game.read.getMyRoundHandles([1n], { account: human.account }),
    ),
    robotHandles: await whenRolled(() =>
      game.read.getMyRoundHandles([1n], { account: robot.account }),
    ),
  };
}

/**
 * Confidential dice are not ready the instant createRobotMatch returns. The
 * contract requests randomness, and the covalidator computes it only after it
 * has observed the block. Reading the handles immediately races that compute
 * and yields zero handles or a revert.
 *
 * Waiting for a non-zero roll is what makes the suite repeatable — without it
 * the same test scored differently depending on how warm the node was.
 */
async function whenRolled<T extends { dice: readonly Hex[] }>(
  read: () => Promise<T>,
): Promise<T> {
  return withCovalidatorRetry(async () => {
    const handles = await read();
    if (nonZero(handles.dice).length === 0) {
      throw new Error("round handles are still all zero");
    }
    return handles;
  }, "round handles");
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
  return withCovalidatorRetry(
    () =>
      zap.attestedDecrypt(owner as unknown as LightningWalletClient, [...handles]),
    `attestedDecrypt of ${handles.length} handle(s)`,
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
    dieValues: toFixed12(handles.dice.map(valueFor), "dieValues"),
    dieSignatures: toFixed12(handles.dice.map(signaturesFor), "dieSignatures"),
    effectiveCount: valueFor(handles.effectiveCount),
    effectiveCountSignatures: signaturesFor(handles.effectiveCount),
    effectCodes: handles.effectCodes.map(valueFor),
    effectCodeSignatures: handles.effectCodes.map(signaturesFor),
  };
}

/**
 * ChallengeSettlement declares uint256[12] and bytes[][12], so the settlement
 * has to be a fixed 12-tuple rather than an array. The runtime check keeps the
 * assertion honest: a short array would otherwise be encoded as a silently
 * wrong settlement.
 */
// Mutable on purpose: the tamper tests rewrite individual slots to prove the
// contract rejects them. A mutable tuple still satisfies the ABI's readonly
// parameter type.
type Fixed12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];

function toFixed12<T>(values: readonly T[], label: string): Fixed12<T> {
  if (values.length !== 12) {
    throw new Error(`${label} must have 12 slots, received ${values.length}`);
  }
  return values as unknown as Fixed12<T>;
}

/**
 * Drive a round to settlement with real attestations.
 *
 * The local helpers in the round tests force an outcome with
 * setPresetEffectiveCounts. That is not available here because the count is
 * computed by the covalidator, so the outcome is chosen by picking a bid the
 * dice can or cannot support. Both hands are decrypted first — the test holds
 * both wallets, and the contract still never lets one player read the other's.
 *
 * Assumes gadgets are off, so the effective count equals the base count.
 */
export async function settlePresetRound(
  fixture: RobotFixture,
  options: { winner: 0 | 1 },
) {
  const state = (await fixture.game.read.getPublicMatch([1n])) as {
    activeSeat: number;
    actionSequence: number;
    diceCount: number;
  };
  const bidderSeat = Number(state.activeSeat) as 0 | 1;
  const bidder = bidderSeat === 0 ? fixture.human : fixture.robot;
  const challenger = bidderSeat === 0 ? fixture.robot : fixture.human;
  const sequence = Number(state.actionSequence);

  const mine = await decryptOwnerRoll(fixture, fixture.human);
  const theirs = await decryptOwnerRoll(fixture, fixture.robot);
  const face = mine[0];
  const onTable = [...mine, ...theirs].filter((die) => die === face).length;

  // Claiming no more than the table shows makes the bid hold, so the bidder
  // wins. Claiming one more than it can show makes it fail, so the challenger
  // wins.
  const quantity = options.winner === bidderSeat ? onTable : onTable + 1;
  const maxQuantity = Number(state.diceCount) * 2;
  if (quantity < 1 || quantity > maxQuantity) {
    throw new Error(
      `Cannot force winner ${options.winner}: face ${face} appears ${onTable} ` +
        `time(s), so the required bid of ${quantity} is outside 1..${maxQuantity}.`,
    );
  }

  await fixture.game.write.raise([1n, quantity, face, sequence], {
    account: bidder.account,
  });
  await fixture.game.write.challenge([1n, sequence + 1], {
    account: challenger.account,
  });
  const settlement = await revealAndPack(fixture.game, 1n);
  await fixture.game.write.settleChallenge([1n, settlement, sequence + 2], {
    account: challenger.account,
  });
  return settlement;
}

/**
 * Pay for the next round and wait until the new roll has actually landed.
 *
 * Waiting for handles that differ from the previous round's is what makes
 * "generates fresh owner-only handles" deterministic: the covalidator produces
 * the new dice asynchronously, so reading immediately can return the old ones.
 */
export async function fundAndStartNextRound(fixture: RobotFixture) {
  const before = nonZero(fixture.humanHandles.dice).join(",");
  const state = (await fixture.game.read.getPublicMatch([1n])) as {
    actionSequence: number;
    diceCount: number;
    gadgetsEnabled: boolean;
  };
  const fee = await fixture.game.read.requiredRoundFee([
    Number(state.diceCount) as 3 | 4 | 5 | 6,
    Boolean(state.gadgetsEnabled),
  ]);

  await fixture.game.write.fundAndStartNextRound(
    [1n, Number(state.actionSequence)],
    { account: fixture.human.account, value: fee },
  );

  return withCovalidatorRetry(async () => {
    const handles = await fixture.game.read.getMyRoundHandles([1n], {
      account: fixture.human.account,
    });
    const after = nonZero(handles.dice);
    if (after.length === 0 || after.join(",") === before) {
      throw new Error("next round dice have not been rolled yet");
    }
    return handles;
  }, "fresh round handles");
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
  const requested = nonZero([
    ...handles.dice,
    handles.effectiveCount,
    ...handles.effectCodes,
  ]);

  // Reveal and pack together: packByHandleOrder throws when an attestation is
  // missing, which is exactly what an unobserved handle looks like, so the
  // pack has to be inside the retry rather than after it.
  return withCovalidatorRetry(
    async () => packByHandleOrder(handles, await zap.attestedReveal(requested)),
    `attestedReveal of ${requested.length} handle(s) for match ${matchId}`,
  );
}
