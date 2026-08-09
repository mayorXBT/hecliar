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

  it("omits equal and lower bids while including exactly the 37 higher raises for eight dice", () => {
    const raises = legalRaises(current, 4);
    expect(raises).toHaveLength(37);
    expect(raises).toContainEqual({ quantity: 2, face: 6 });
    expect(raises).toContainEqual({ quantity: 8, face: 6 });
    expect(raises).not.toContainEqual({ quantity: 2, face: 5 });
  });
});
