import { describe, expect, it } from "vitest";
import { applyRoundWin, countFace, resolveChallenge } from "../src/resolution";

describe("challenge resolution", () => {
  it("counts only the challenged face, so ordinary ones do not make a truthful bid wild", () => {
    const result = resolveChallenge(
      [[5, 1, 5, 2], [5, 3, 4, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [],
    );
    expect(result).toMatchObject({ baseCount: 3, effectiveCount: 3, winner: 0 });
  });

  it("awards a false bid to the challenger", () => {
    const result = resolveChallenge(
      [[5, 1, 2, 2], [5, 3, 4, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [],
    );
    expect(result).toMatchObject({ effectiveCount: 2, winner: 1 });
  });

  it("counts matching faces across both revealed hands", () => {
    expect(countFace([[1, 6, 1], [2, 1, 5]], 1)).toBe(3);
  });

  it("adds one effective match only when an Echo target matches the challenged face", () => {
    const result = resolveChallenge(
      [[5, 2, 3], [4, 5, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [{ owner: 0, kind: "echo", target: 0 }],
    );
    expect(result).toMatchObject({ baseCount: 2, effectiveCount: 3, winner: 0 });
    expect(result.effects).toEqual([{ owner: 0, kind: "echo", delta: 1 }]);
  });

  it("does not add an Echo match when its selected die has another face", () => {
    const result = resolveChallenge(
      [[5, 2, 3], [4, 5, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [{ owner: 0, kind: "echo", target: 1 }],
    );
    expect(result).toMatchObject({ baseCount: 2, effectiveCount: 2, winner: 1 });
    expect(result.effects).toEqual([{ owner: 0, kind: "echo", delta: 0 }]);
  });

  it("removes one effective opponent match only when a Jammer target matches the challenged face", () => {
    const result = resolveChallenge(
      [[5, 2, 3], [4, 5, 6]],
      { quantity: 2, face: 5, bidder: 0, sequence: 4 },
      [{ owner: 0, kind: "jammer", target: 1 }],
    );
    expect(result).toMatchObject({ baseCount: 2, effectiveCount: 1, winner: 1 });
    expect(result.effects).toEqual([{ owner: 0, kind: "jammer", delta: -1 }]);
  });

  it("does not remove a Jammer match when its selected opponent die has another face", () => {
    const result = resolveChallenge(
      [[5, 2, 3], [4, 5, 6]],
      { quantity: 3, face: 5, bidder: 0, sequence: 4 },
      [{ owner: 0, kind: "jammer", target: 0 }],
    );
    expect(result).toMatchObject({ baseCount: 2, effectiveCount: 2, winner: 1 });
    expect(result.effects).toEqual([{ owner: 0, kind: "jammer", delta: 0 }]);
  });
});

describe("best of three", () => {
  it("ends exactly at two wins", () => {
    expect(applyRoundWin([1, 1], 0)).toEqual({ score: [2, 1], matchWinner: 0 });
  });

  it("does not declare a match winner after the first round win", () => {
    expect(applyRoundWin([0, 1], 0)).toEqual({ score: [1, 1], matchWinner: null });
  });

  it("increments seat one's score without declaring a match winner for its first win", () => {
    expect(applyRoundWin([1, 0], 1)).toEqual({ score: [1, 1], matchWinner: null });
  });

  it("declares seat one the match winner on its second win", () => {
    expect(applyRoundWin([1, 1], 1)).toEqual({ score: [1, 2], matchWinner: 1 });
  });
});
