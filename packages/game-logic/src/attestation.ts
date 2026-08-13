/**
 * Turning covalidator attestations into a settlement the contract will accept.
 *
 * This lived twice — once in the frontend and once in the contract tests — and
 * the two had to be kept in step by hand. That is a poor arrangement for code
 * whose job is deciding which signed values get submitted for on-chain
 * verification, so it lives here, where both can import it.
 *
 * Deliberately free of viem and of any Inco import: it is pure data shaping,
 * and keeping it dependency-free is what lets the contract tests, the browser
 * and any script share exactly the same implementation.
 */

export type Hex = `0x${string}`;

export const ZERO_HANDLE: Hex = `0x${"0".repeat(64)}`;

export const nonZero = (handles: readonly Hex[]): Hex[] =>
  handles.filter((handle) => handle !== ZERO_HANDLE);

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

export type Fixed12<T> = [T, T, T, T, T, T, T, T, T, T, T, T];

export type ChallengeSettlement = {
  dieValues: Fixed12<bigint>;
  dieSignatures: Fixed12<Hex[]>;
  effectiveCount: bigint;
  effectiveCountSignatures: Hex[];
};

export function toHexSignature(signature: Uint8Array): Hex {
  let out = "";
  // Indexed rather than iterated: the frontend targets below ES2015, where
  // iterating a typed array needs downlevelIteration.
  for (let i = 0; i < signature.length; i += 1) {
    out += signature[i].toString(16).padStart(2, "0");
  }
  return `0x${out}`;
}

/**
 * Build the settlement the contract will verify.
 *
 * Every check is deliberate. settleChallenge reverts with InvalidAttestation
 * on a value or signature the covalidator did not produce, and with
 * InvalidInactiveSlot when an unused slot is not canonically zero. A settlement
 * assembled loosely therefore fails on chain, after gas, with an error that
 * names a slot number. Failing here instead names the handle.
 */
export function packSettlement(
  handles: ChallengeHandles,
  revealed: readonly Attestation[],
): ChallengeSettlement {
  const expected = new Set<string>();
  for (const handle of [...handles.dice, handles.effectiveCount, ...handles.effectCodes]) {
    if (handle === ZERO_HANDLE) continue;
    const key = handle.toLowerCase();
    if (expected.has(key)) throw new Error(`Duplicate requested handle ${handle}`);
    expected.add(key);
  }

  const byHandle = new Map<string, Attestation>();
  for (const attestation of revealed) {
    const key = attestation.handle.toLowerCase();
    if (!expected.has(key)) {
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
  expected.forEach((handle) => {
    if (!byHandle.has(handle)) throw new Error(`Missing attestation for handle ${handle}`);
  });

  // Unused die slots stay zero with no signatures, or the contract rejects the
  // settlement with InvalidInactiveSlot.
  const valueFor = (handle: Hex) =>
    handle === ZERO_HANDLE ? BigInt(0) : BigInt(byHandle.get(handle.toLowerCase())!.plaintext.value);
  const signaturesFor = (handle: Hex): Hex[] =>
    handle === ZERO_HANDLE
      ? []
      : byHandle.get(handle.toLowerCase())!.covalidatorSignatures.map(toHexSignature);

  return {
    dieValues: toFixed12(handles.dice.map(valueFor), "dieValues"),
    dieSignatures: toFixed12(handles.dice.map(signaturesFor), "dieSignatures"),
    effectiveCount: valueFor(handles.effectiveCount),
    effectiveCountSignatures: signaturesFor(handles.effectiveCount),
  };
}

/**
 * ChallengeSettlement declares uint256[12] and bytes[][12]. The runtime check
 * keeps the assertion honest: a short array would otherwise encode as a
 * silently wrong settlement.
 */
export function toFixed12<T>(values: readonly T[], label: string): Fixed12<T> {
  if (values.length !== 12) {
    throw new Error(`${label} must have 12 slots, received ${values.length}`);
  }
  return values as unknown as Fixed12<T>;
}

/**
 * The covalidator is an observer. It polls the chain and can only serve a
 * handle once it has seen the block that created it, so a read that closely
 * follows a write legitimately fails with "ciphertext not found". Base Sepolia
 * block times make this more likely than a local node, not less.
 *
 * This turns the race into a bounded wait without hiding real failures: a
 * denied decryption still fails, once the observer has had its chance.
 */
export async function withCovalidatorRetry<T>(
  operation: () => Promise<T>,
  label: string,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  const attempts = options.attempts ?? 12;
  const delayMs = options.delayMs ?? 750;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  const reason = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(
    `${label} did not succeed after ${attempts} attempts over ` +
      `${(attempts * delayMs) / 1000}s. Last error: ${reason}`,
  );
}
