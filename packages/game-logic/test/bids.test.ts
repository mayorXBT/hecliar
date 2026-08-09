import { describe, expect, it } from "vitest";
import { isHigherBid, legalRaises } from "../src/bids";
import type { Bid } from "../src/types";

const current: Bid = { quantity: 2, face: 5, bidder: 0, sequence: 1 };

describe("bid ordering", () => {
  it.each([
    [{ quantity: 2, face: 6 }, true],
    [{ quantity: 3, face: 1 }, true],
    [{ quantity: 2, face: 5 }, false],
    [{ quantity: 2, face: 4 }, false],
    [{ quantity: 1, face: 6 }, false],
  ] as const)("rejects a raise that does not strictly exceed the quantity-face ordering: %o higher=%s", (candidate, expected) => {
    expect(isHigherBid(current, candidate)).toBe(expected);
  });

  it("returns every and only strict raise after a bid of two fives", () => {
    const raises = legalRaises(current, 4);
    expect(raises).toEqual([
      { quantity: 2, face: 6 },
      { quantity: 3, face: 1 }, { quantity: 3, face: 2 }, { quantity: 3, face: 3 }, { quantity: 3, face: 4 }, { quantity: 3, face: 5 }, { quantity: 3, face: 6 },
      { quantity: 4, face: 1 }, { quantity: 4, face: 2 }, { quantity: 4, face: 3 }, { quantity: 4, face: 4 }, { quantity: 4, face: 5 }, { quantity: 4, face: 6 },
      { quantity: 5, face: 1 }, { quantity: 5, face: 2 }, { quantity: 5, face: 3 }, { quantity: 5, face: 4 }, { quantity: 5, face: 5 }, { quantity: 5, face: 6 },
      { quantity: 6, face: 1 }, { quantity: 6, face: 2 }, { quantity: 6, face: 3 }, { quantity: 6, face: 4 }, { quantity: 6, face: 5 }, { quantity: 6, face: 6 },
      { quantity: 7, face: 1 }, { quantity: 7, face: 2 }, { quantity: 7, face: 3 }, { quantity: 7, face: 4 }, { quantity: 7, face: 5 }, { quantity: 7, face: 6 },
      { quantity: 8, face: 1 }, { quantity: 8, face: 2 }, { quantity: 8, face: 3 }, { quantity: 8, face: 4 }, { quantity: 8, face: 5 }, { quantity: 8, face: 6 },
    ]);
    expect(new Set(raises.map(({ quantity, face }) => `${quantity}-${face}`)).size).toBe(37);
  });

  it("returns every opening bid exactly once when no bid is active", () => {
    const raises = legalRaises(null, 4);
    expect(raises).toEqual([
      { quantity: 1, face: 1 }, { quantity: 1, face: 2 }, { quantity: 1, face: 3 }, { quantity: 1, face: 4 }, { quantity: 1, face: 5 }, { quantity: 1, face: 6 },
      { quantity: 2, face: 1 }, { quantity: 2, face: 2 }, { quantity: 2, face: 3 }, { quantity: 2, face: 4 }, { quantity: 2, face: 5 }, { quantity: 2, face: 6 },
      { quantity: 3, face: 1 }, { quantity: 3, face: 2 }, { quantity: 3, face: 3 }, { quantity: 3, face: 4 }, { quantity: 3, face: 5 }, { quantity: 3, face: 6 },
      { quantity: 4, face: 1 }, { quantity: 4, face: 2 }, { quantity: 4, face: 3 }, { quantity: 4, face: 4 }, { quantity: 4, face: 5 }, { quantity: 4, face: 6 },
      { quantity: 5, face: 1 }, { quantity: 5, face: 2 }, { quantity: 5, face: 3 }, { quantity: 5, face: 4 }, { quantity: 5, face: 5 }, { quantity: 5, face: 6 },
      { quantity: 6, face: 1 }, { quantity: 6, face: 2 }, { quantity: 6, face: 3 }, { quantity: 6, face: 4 }, { quantity: 6, face: 5 }, { quantity: 6, face: 6 },
      { quantity: 7, face: 1 }, { quantity: 7, face: 2 }, { quantity: 7, face: 3 }, { quantity: 7, face: 4 }, { quantity: 7, face: 5 }, { quantity: 7, face: 6 },
      { quantity: 8, face: 1 }, { quantity: 8, face: 2 }, { quantity: 8, face: 3 }, { quantity: 8, face: 4 }, { quantity: 8, face: 5 }, { quantity: 8, face: 6 },
    ]);
    expect(new Set(raises.map(({ quantity, face }) => `${quantity}-${face}`)).size).toBe(48);
  });
});
