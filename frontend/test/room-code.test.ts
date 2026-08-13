import { describe, expect, it } from "vitest";
import {
  generateRoomCode,
  isValidRoomCode,
  normalizeRoomCode,
  roomHashFromCode,
} from "@/lib/room-code";

/**
 * The bug this guards against made friend mode impossible in a browser: the
 * host created a room under a hash of random bytes while the guest joined
 * under a hash of the printed code, so joinRoom always reverted with
 * RoomNotFound. Nothing failed loudly, because no UI ever called join.
 */
describe("room codes", () => {
  it("gives the host and the guest the same hash", () => {
    for (let i = 0; i < 50; i += 1) {
      const { code, hash } = generateRoomCode();
      // What a guest computes, holding only the printed code.
      expect(roomHashFromCode(code)).toBe(hash);
    }
  });

  it("survives the ways a code gets retyped", () => {
    const { code, hash } = generateRoomCode();
    expect(roomHashFromCode(code.toLowerCase())).toBe(hash);
    expect(roomHashFromCode(` ${code} `)).toBe(hash);
    expect(roomHashFromCode(code.split("").join("-"))).toBe(hash);
  });

  it("produces valid, distinct codes", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i += 1) {
      const { code } = generateRoomCode();
      expect(isValidRoomCode(code), `${code} should be valid`).toBe(true);
      expect(code).toHaveLength(12);
      seen.add(code);
    }
    // Collisions at this sample size would mean the generator is not random.
    expect(seen.size).toBe(200);
  });

  it("excludes the characters people confuse when reading a code aloud", () => {
    // The alphabet omits I, L, O and U on purpose.
    const codes = Array.from({ length: 300 }, () => generateRoomCode().code).join("");
    for (const confusable of ["I", "L", "O", "U"]) {
      expect(codes.includes(confusable), `${confusable} should not appear`).toBe(false);
    }
  });

  it("rejects codes of the wrong shape", () => {
    expect(isValidRoomCode("")).toBe(false);
    expect(isValidRoomCode("ABC")).toBe(false);
    expect(isValidRoomCode("ABCDEFGHIJKLM")).toBe(false);
    expect(normalizeRoomCode("abc-123!")).toBe("ABC123");
  });
});
