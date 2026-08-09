import { describe, expect, it } from "vitest";
import {
  SeededRandom,
  chooseRobotAction,
  getRobotProfile,
  isLegalRobotAction,
  probabilityBidIsTrue,
  type RobotObservation,
} from "../src";

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

  it("returns certainty when the robot already satisfies the bid", () => {
    const view = {
      ...observation("medium", 1),
      currentBid: { quantity: 2, face: 5 as const, bidder: 0 as const, sequence: 3 },
    };
    expect(probabilityBidIsTrue(view)).toBe(1);
  });

  it("returns zero when unknown dice cannot supply the remaining matches", () => {
    const view = {
      ...observation("medium", 1),
      ownDice: [1, 2, 3] as const,
      dicePerSide: 3 as const,
      currentBid: { quantity: 6, face: 6 as const, bidder: 0 as const, sequence: 3 },
    };
    expect(probabilityBidIsTrue(view)).toBe(0);
  });
});

describe("robot action legality", () => {
  it("rejects fractional gadget targets instead of accepting non-index values", () => {
    const view = {
      ...observation("hard", 1972),
      gadget: { kind: "scanner" as const, used: false },
    };
    expect(isLegalRobotAction(view, { type: "use-gadget", target: 1.5 })).toBe(false);
  });

  it("accepts only integer gadget indexes inside the dice range", () => {
    const view = {
      ...observation("hard", 1972),
      gadget: { kind: "scanner" as const, used: false },
    };
    expect(isLegalRobotAction(view, { type: "use-gadget", target: -1 })).toBe(false);
    expect(isLegalRobotAction(view, { type: "use-gadget", target: 4 })).toBe(false);
    expect(isLegalRobotAction(view, { type: "use-gadget", target: 0 })).toBe(true);
    expect(isLegalRobotAction(view, { type: "use-gadget", target: 3 })).toBe(true);
  });

  it("keeps actions legal across distinct 3-to-6-die positions", () => {
    const positions: readonly RobotObservation[] = [
      {
        ...observation("easy", 1),
        ownDice: [1, 2, 3],
        dicePerSide: 3,
        currentBid: null,
      },
      observation("medium", 1),
      {
        ...observation("hard", 1972),
        ownDice: [5, 5, 2, 1, 3],
        dicePerSide: 5,
        gadget: { kind: "scanner", used: false },
      },
      {
        ...observation("hard", 9),
        ownDice: [1, 2, 3, 4, 5, 6],
        dicePerSide: 6,
        currentBid: { quantity: 6, face: 6, bidder: 0, sequence: 6 },
      },
    ];

    for (const view of positions) {
      expect(isLegalRobotAction(view, chooseRobotAction(view))).toBe(true);
    }
  });

  it("keeps 100 seeded actions legal across varied public positions", () => {
    const positions = [
      (seed: number): RobotObservation => ({
        ...observation("easy", seed),
        ownDice: [1, 2, 3],
        dicePerSide: 3,
        currentBid: null,
      }),
      (seed: number): RobotObservation => observation("medium", seed),
      (seed: number): RobotObservation => ({
        ...observation("hard", seed),
        ownDice: [5, 5, 2, 1, 3],
        dicePerSide: 5,
        gadget: null,
      }),
      (seed: number): RobotObservation => ({
        ...observation("hard", seed),
        ownDice: [1, 2, 3, 4, 5, 6],
        dicePerSide: 6,
        currentBid: { quantity: 6, face: 6, bidder: 0, sequence: 6 },
      }),
    ] as const;

    for (let seed = 1; seed <= 100; seed += 1) {
      const view = positions[(seed - 1) % positions.length](seed);
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

it("keeps the documented profile values that control robot behavior", () => {
  expect(getRobotProfile("easy")).toEqual({
    challengeBelow: 0.08,
    bluffChance: 0.03,
    maxBluffQuantity: 0,
    gadgets: false,
  });
  expect(getRobotProfile("medium")).toEqual({
    challengeBelow: 0.24,
    bluffChance: 0.14,
    maxBluffQuantity: 1,
    gadgets: false,
  });
  expect(getRobotProfile("hard")).toEqual({
    challengeBelow: 0.38,
    bluffChance: 0.24,
    maxBluffQuantity: 2,
    gadgets: true,
  });
});

describe("deterministic robot strategy", () => {
  it("raises the hand-supported opening bid instead of always challenging", () => {
    const view = { ...observation("easy", 1), currentBid: null };
    expect(chooseRobotAction(view)).toEqual({ type: "raise", bid: { quantity: 1, face: 2 } });
    expect(chooseRobotAction({ ...observation("easy", 1), currentBid: null }))
      .toEqual({ type: "raise", bid: { quantity: 1, face: 2 } });
  });

  it("selects the seeded legal raise for a medium bid position", () => {
    expect(chooseRobotAction(observation("medium", 1)))
      .toEqual({ type: "raise", bid: { quantity: 5, face: 1 } });
  });

  it("uses an available hard gadget at its seeded legal die index", () => {
    const view = {
      ...observation("hard", 1972),
      gadget: { kind: "scanner" as const, used: false },
    };
    expect(chooseRobotAction(view)).toEqual({ type: "use-gadget", target: 0 });
  });

  it("takes the raise path when a hard robot has no gadget", () => {
    const view = { ...observation("hard", 1), currentBid: null };
    expect(chooseRobotAction(view)).toEqual({ type: "raise", bid: { quantity: 3, face: 6 } });
  });
});
