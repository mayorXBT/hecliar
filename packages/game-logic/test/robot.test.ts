import { describe, expect, it } from "vitest";
import {
  SeededRandom,
  chooseRobotAction,
  getRobotProfile,
  isLegalRobotAction,
  probabilityBidIsTrue,
  type RobotObservation,
} from "../src/robot";

const observation = (difficulty: RobotObservation["difficulty"], seed: number): RobotObservation => ({
  matchId: 1n,
  difficulty,
  ownDice: [5, 5, 2, 1],
  dicePerSide: 4,
  currentBid: { quantity: 3, face: 5, bidder: 0, sequence: 3 },
  publicHistory: [],
  scores: [0, 0],
  gadget: null,
  random: new SeededRandom(seed),
});

describe("robot probability", () => {
  it("uses only own dice and four unknown human dice", () => {
    expect(probabilityBidIsTrue(observation("medium", 1))).toBeCloseTo(1 - (5 / 6) ** 4, 8);
  });
});

describe.each(["easy", "medium", "hard"] as const)("%s robot", (difficulty) => {
  it("returns legal actions for 100 simulated positions", () => {
    for (let seed = 1; seed <= 100; seed += 1) {
      const view = observation(difficulty, seed);
      expect(isLegalRobotAction(view, chooseRobotAction(view))).toBe(true);
    }
  });
});

it("challenges when the current bid has no legal raise", () => {
  const view = {
    ...observation("easy", 9),
    currentBid: { quantity: 8, face: 6 as const, bidder: 0 as const, sequence: 8 },
  };
  expect(chooseRobotAction(view)).toEqual({ type: "challenge" });
});

it("keeps difficulty challenge, bluff, and gadget policies distinct", () => {
  const easy = getRobotProfile("easy");
  const medium = getRobotProfile("medium");
  const hard = getRobotProfile("hard");
  expect(easy.challengeBelow).toBeLessThan(medium.challengeBelow);
  expect(medium.challengeBelow).toBeLessThan(hard.challengeBelow);
  expect(easy.bluffChance).toBeLessThan(medium.bluffChance);
  expect(medium.bluffChance).toBeLessThan(hard.bluffChance);
  expect(easy.gadgets).toBe(false);
  expect(hard.gadgets).toBe(true);
});
