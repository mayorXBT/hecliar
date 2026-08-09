import type { DiceCount } from "./types";

export const DEFAULT_DICE_COUNT: DiceCount = 4;

export function parseDiceCount(value: unknown): DiceCount {
  if (!Number.isInteger(value) || Number(value) < 3 || Number(value) > 6) {
    throw new RangeError("dice count must be an integer from 3 through 6");
  }
  return value as DiceCount;
}
