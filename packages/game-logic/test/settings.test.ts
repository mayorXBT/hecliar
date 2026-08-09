import { describe, expect, it } from "vitest";
import { DEFAULT_DICE_COUNT, parseDiceCount } from "../src/settings";

describe("dice settings", () => {
  it("defaults to four dice", () => expect(DEFAULT_DICE_COUNT).toBe(4));

  it.each([3, 4, 5, 6])("accepts %i dice", (value) => {
    expect(parseDiceCount(value)).toBe(value);
  });

  it.each([2, 7, 4.5, "4"])("rejects %p rather than allowing an out-of-range or non-integer dice count", (value) => {
    expect(() => parseDiceCount(value)).toThrow("dice count must be an integer from 3 through 6");
  });
});
