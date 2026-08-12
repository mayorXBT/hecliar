import { zeroHash, type Hex } from "viem";

/**
 * Client-side half of the confidential flow.
 *
 * This mirrors contracts/test/helpers/inco.ts, which is the version proven
 * against the real HecliarGame by the attested lifecycle tests. The two should
 * be extracted into a shared package rather than kept in step by hand — see
 * the note on packSettlement.
 */

export const nonZero = (handles: readonly Hex[]) =>
  handles.filter((handle) => handle !== zeroHash);

/**
 * The covalidator is an observer. It polls the chain and can only serve a
 * handle once it has seen the block that created it, so a read that follows a
 * write closely will legitimately fail with "ciphertext ... not found, it
 * might not have been processed yet".
 *
 * The contract tests hit this constantly on a local node and will hit it on
 * Base Sepolia too, where block times are longer. This turns the race into a
 * bounded wait without hiding real failures: a denied decryption still fails,
 * just after the observer has had its chance.
 */
const ATTEMPTS = 12;
const DELAY_MS = 750;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withCovalidatorRetry<T>(
  operation: () => Promise<T>,
  label: string,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < ATTEMPTS) await sleep(DELAY_MS);
    }
  }
  throw new Error(
    `${label} did not succeed after ${ATTEMPTS} attempts over ` +
      `${(ATTEMPTS * DELAY_MS) / 1000}s. ` +
      `Last error: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
  );
}

export type Attestation = {
  handle: string;
  plaintext: { value: bigint | boolean };
  covalidatorSignatures: readonly Uint8Array[];
};

export type ChallengeHandles = {
  dice: readonly Hex[];
  effectiveCount: Hex;
  effectCodes: readonly Hex[];
};

type Fixed12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];

export type ChallengeSettlement = {
  dieValues: Fixed12<bigint>;
  dieSignatures: Fixed12<Hex[]>;
  effectiveCount: bigint;
  effectiveCountSignatures: Hex[];
};

const toHexSignature = (signature: Uint8Array): Hex =>
  `0x${Array.from(signature, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;

/**
 * Build the settlement the contract will verify.
 *
 * Every check here is deliberate. settleChallenge reverts with
 * InvalidAttestation on a value or signature the covalidator did not produce,
 * and with InvalidInactiveSlot when an unused slot is not canonically zero, so
 * a settlement assembled loosely fails on chain rather than in the browser.
 * Failing here instead produces an error that names the handle.
 */
export function packSettlement(
  handles: ChallengeHandles,
  revealed: readonly Attestation[],
): ChallengeSettlement {
  const expected = new Set<string>();
  for (const handle of [...handles.dice, handles.effectiveCount, ...handles.effectCodes]) {
    if (handle === zeroHash) continue;
    expected.add(handle.toLowerCase());
  }

  const byHandle = new Map<string, Attestation>();
  for (const attestation of revealed) {
    const key = attestation.handle.toLowerCase();
    if (!expected.has(key)) {
      throw new Error(`Attestation set contains an unexpected handle ${attestation.handle}`);
    }
    if (attestation.covalidatorSignatures.length === 0) {
      throw new Error(`Missing signatures for handle ${attestation.handle}`);
    }
    byHandle.set(key, attestation);
  }
  Array.from(expected).forEach((handle) => {
    if (!byHandle.has(handle)) throw new Error(`Missing attestation for handle ${handle}`);
  });

  // Unused die slots must stay zero with no signatures, or the contract
  // rejects the settlement with InvalidInactiveSlot.
  const valueFor = (handle: Hex) =>
    handle === zeroHash ? BigInt(0) : BigInt(byHandle.get(handle.toLowerCase())!.plaintext.value);
  const signaturesFor = (handle: Hex): Hex[] =>
    handle === zeroHash
      ? []
      : byHandle.get(handle.toLowerCase())!.covalidatorSignatures.map(toHexSignature);

  if (handles.dice.length !== 12) {
    throw new Error(`Expected 12 die slots, received ${handles.dice.length}`);
  }

  return {
    dieValues: handles.dice.map(valueFor) as Fixed12<bigint>,
    dieSignatures: handles.dice.map(signaturesFor) as Fixed12<Hex[]>,
    effectiveCount: valueFor(handles.effectiveCount),
    effectiveCountSignatures: signaturesFor(handles.effectiveCount),
  };
}
