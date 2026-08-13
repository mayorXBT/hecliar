import { describe, expect, it } from "vitest";
import { opponentName, otherSeat, seatOf } from "@/lib/game/seat";

const HOST = "0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa" as const;
const GUEST = "0xBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbbBBBBbbbb" as const;
const match = { players: [HOST, GUEST] as [`0x${string}`, `0x${string}`] };

describe("seatOf", () => {
  it("seats the host at 0 and the guest at 1", () => {
    expect(seatOf(match, HOST)).toBe(0);
    expect(seatOf(match, GUEST)).toBe(1);
  });

  it("ignores address casing, which wallets and RPCs disagree about", () => {
    expect(seatOf(match, GUEST.toLowerCase() as `0x${string}`)).toBe(1);
    expect(seatOf(match, HOST.toUpperCase().replace("0X", "0x") as `0x${string}`)).toBe(0);
  });

  it("falls back to seat 0 without a wallet, which is the robot game", () => {
    expect(seatOf(match, null)).toBe(0);
  });

  it("treats an unrelated address as a spectator in seat 0", () => {
    // Not a player at all; the contract would reject any action anyway.
    expect(seatOf(match, "0x1111111111111111111111111111111111111111")).toBe(0);
  });
});

describe("otherSeat", () => {
  it("is its own inverse", () => {
    expect(otherSeat(0)).toBe(1);
    expect(otherSeat(1)).toBe(0);
    expect(otherSeat(otherSeat(1))).toBe(1);
  });
});

describe("opponentName", () => {
  it("only calls the opponent a robot when it is one", () => {
    expect(opponentName("robot")).toBe("Robot");
    expect(opponentName("friend")).toBe("Opponent");
  });
});
