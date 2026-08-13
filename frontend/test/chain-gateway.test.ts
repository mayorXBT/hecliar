import { describe, expect, it, vi } from "vitest";
import { zeroHash, type Hex } from "viem";
import { ChainGameGateway } from "@/lib/game/chain-gateway";
import { packSettlement, type Attestation } from "@/lib/game/attestation";

const handle = (n: number): Hex =>
  `0x${n.toString(16).padStart(64, "0")}` as Hex;

const signature = new Uint8Array([1, 2, 3]);

const attest = (h: Hex, value: bigint | boolean): Attestation => ({
  handle: h,
  plaintext: { value },
  covalidatorSignatures: [signature],
});

const challengeHandles = (dice: readonly Hex[]) => ({
  dice,
  effectiveCount: handle(99),
  effectCodes: [zeroHash, zeroHash] as readonly Hex[],
});

// Four active dice per side, so slots 4, 5, 10 and 11 stay zero.
const activeDice = [
  handle(1), handle(2), handle(3), handle(4), zeroHash, zeroHash,
  handle(5), handle(6), handle(7), handle(8), zeroHash, zeroHash,
];

const fullReveal = (): Attestation[] => [
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((n) => attest(handle(n), BigInt((n % 6) + 1))),
  attest(handle(99), BigInt(3)),
];

describe("packSettlement", () => {
  it("keeps inactive slots canonically zero without attestations", () => {
    const settlement = packSettlement(challengeHandles(activeDice), fullReveal());

    expect(settlement.dieValues).toHaveLength(12);
    expect(settlement.dieValues[4]).toBe(BigInt(0));
    expect(settlement.dieValues[5]).toBe(BigInt(0));
    expect(settlement.dieSignatures[4]).toEqual([]);
    expect(settlement.dieSignatures[10]).toEqual([]);
    // An active slot carries its value and the covalidator's signature.
    expect(settlement.dieValues[0]).toBe(BigInt(2));
    expect(settlement.dieSignatures[0]).toEqual(["0x010203"]);
    expect(settlement.effectiveCount).toBe(BigInt(3));
  });

  it("rejects a missing attestation rather than settling a partial round", () => {
    const revealed = fullReveal().filter((a) => a.handle !== handle(3));
    expect(() => packSettlement(challengeHandles(activeDice), revealed)).toThrow(
      /Missing attestation/,
    );
  });

  it("rejects an attestation for a handle that was never requested", () => {
    const revealed = [...fullReveal(), attest(handle(1234), BigInt(1))];
    expect(() => packSettlement(challengeHandles(activeDice), revealed)).toThrow(
      /unexpected handle/,
    );
  });

  it("rejects an unsigned attestation", () => {
    const revealed = fullReveal().map((a) =>
      a.handle === handle(2) ? { ...a, covalidatorSignatures: [] } : a,
    );
    expect(() => packSettlement(challengeHandles(activeDice), revealed)).toThrow(
      /Missing signatures/,
    );
  });
});

function fakeContract(overrides: Record<string, unknown> = {}) {
  return {
    write: {
      settleChallenge: vi.fn().mockResolvedValue(undefined),
      ...(overrides.write as object ?? {}),
    },
    read: {
      getMyRoundHandles: vi.fn(),
      getChallengeHandles: vi.fn(),
      getPublicMatch: vi.fn(),
      getRoundResult: vi.fn(),
      requiredRoundFee: vi.fn(),
      ...(overrides.read as object ?? {}),
    },
    address: handle(1),
  };
}

const account = "0x1111111111111111111111111111111111111111" as const;

describe("ChainGameGateway.getPrivatePlayer", () => {
  it("decrypts only this player's own dice, gadget and scanner result", async () => {
    const contract = fakeContract({
      read: {
        getMyRoundHandles: vi.fn().mockResolvedValue({
          dice: [handle(1), handle(2), handle(3), handle(4), zeroHash, zeroHash],
          gadget: handle(50),
          gadgetTarget: zeroHash,
          scannerResult: handle(60),
        }),
      },
    });
    const attestedDecrypt = vi.fn().mockResolvedValue([
      attest(handle(1), BigInt(5)),
      attest(handle(2), BigInt(2)),
      attest(handle(3), BigInt(6)),
      attest(handle(4), BigInt(1)),
      attest(handle(50), BigInt(1)),
      attest(handle(60), true),
    ]);

    const gateway = new ChainGameGateway(contract as never, account, {
      walletClient: { mock: true },
      lightning: async () => ({ attestedDecrypt, attestedReveal: vi.fn() }),
    });

    const view = await gateway.getPrivatePlayer(BigInt(1));

    expect(view.ownDice).toEqual([5, 2, 6, 1]);
    expect(view.gadget).toBe("jammer");
    expect(view.scannerResult).toBe(true);
    // Only the four active dice plus the two set handles are ever requested.
    expect(attestedDecrypt.mock.calls[0][1]).toHaveLength(6);
  });

  it("returns no dice when there is no wallet to sign the decryption", async () => {
    const contract = fakeContract();
    const gateway = new ChainGameGateway(contract as never, account, {});

    const view = await gateway.getPrivatePlayer(BigInt(1));

    expect(view).toEqual({ ownDice: [], gadget: null, scannerResult: null });
    expect(contract.read.getMyRoundHandles).not.toHaveBeenCalled();
  });

  it("returns no dice between rounds, while the slots are still zero", async () => {
    const contract = fakeContract({
      read: {
        getMyRoundHandles: vi.fn().mockResolvedValue({
          dice: [zeroHash, zeroHash, zeroHash, zeroHash, zeroHash, zeroHash],
          gadget: zeroHash,
          gadgetTarget: zeroHash,
          scannerResult: zeroHash,
        }),
      },
    });
    const attestedDecrypt = vi.fn();
    const gateway = new ChainGameGateway(contract as never, account, {
      walletClient: { mock: true },
      lightning: async () => ({ attestedDecrypt, attestedReveal: vi.fn() }),
    });

    expect(await gateway.getPrivatePlayer(BigInt(1))).toEqual({
      ownDice: [],
      gadget: null,
      scannerResult: null,
    });
    expect(attestedDecrypt).not.toHaveBeenCalled();
  });
});

describe("ChainGameGateway.settleChallenge", () => {
  it("submits covalidator-signed values rather than the client's own numbers", async () => {
    const settleChallenge = vi.fn().mockResolvedValue(undefined);
    const contract = fakeContract({
      write: { settleChallenge },
      read: {
        getChallengeHandles: vi.fn().mockResolvedValue(challengeHandles(activeDice)),
      },
    });
    const attestedReveal = vi.fn().mockResolvedValue(fullReveal());

    const gateway = new ChainGameGateway(contract as never, account, {
      walletClient: { mock: true },
      lightning: async () => ({ attestedDecrypt: vi.fn(), attestedReveal }),
    });

    await gateway.settleChallenge(BigInt(7), 3);

    // Zero handles are never sent for reveal.
    expect(attestedReveal.mock.calls[0][0]).toHaveLength(9);

    const [matchId, settlement, sequence] = settleChallenge.mock.calls[0][0];
    expect(matchId).toBe(BigInt(7));
    expect(sequence).toBe(3);
    expect(settlement.dieValues).toHaveLength(12);
    expect(settlement.effectiveCount).toBe(BigInt(3));
    expect(settlement.effectiveCountSignatures).toEqual(["0x010203"]);
  });
});

describe("ChainGameGateway decryption prompts", () => {
  const handles = {
    dice: [handle(1), handle(2), handle(3), handle(4), zeroHash, zeroHash],
    gadget: zeroHash,
    gadgetTarget: zeroHash,
    scannerResult: zeroHash,
  };
  const revealed = [1, 2, 3, 4].map((n) => attest(handle(n), BigInt(n)));

  function gatewayReading(getMyRoundHandles: ReturnType<typeof vi.fn>) {
    const attestedDecrypt = vi.fn().mockResolvedValue(revealed);
    const contract = fakeContract({ read: { getMyRoundHandles } });
    const chain = new ChainGameGateway(contract as never, account, {
      walletClient: { mock: true },
      lightning: async () => ({ attestedDecrypt, attestedReveal: vi.fn() }),
    });
    return { chain, attestedDecrypt };
  }

  it("asks the wallet to sign once for a hand, not once per read", async () => {
    // Every attestedDecrypt is a signature prompt. Polling used to call this
    // on a timer, which buried the player under dozens of them.
    const { chain, attestedDecrypt } = gatewayReading(
      vi.fn().mockResolvedValue(handles),
    );

    const first = await chain.getPrivatePlayer(BigInt(1));
    const second = await chain.getPrivatePlayer(BigInt(1));
    const third = await chain.getPrivatePlayer(BigInt(1));

    expect(attestedDecrypt).toHaveBeenCalledTimes(1);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("decrypts again when a new round deals new dice", async () => {
    const nextRound = {
      ...handles,
      dice: [handle(11), handle(12), handle(13), handle(14), zeroHash, zeroHash],
    };
    const getMyRoundHandles = vi
      .fn()
      .mockResolvedValueOnce(handles)
      .mockResolvedValue(nextRound);
    const { chain, attestedDecrypt } = gatewayReading(getMyRoundHandles);
    attestedDecrypt.mockResolvedValueOnce(revealed).mockResolvedValue(
      [11, 12, 13, 14].map((n) => attest(handle(n), BigInt((n % 6) + 1))),
    );

    await chain.getPrivatePlayer(BigInt(1));
    await chain.getPrivatePlayer(BigInt(1));

    // Different handles are a different hand, so the cache must not answer.
    expect(attestedDecrypt).toHaveBeenCalledTimes(2);
  });
});
