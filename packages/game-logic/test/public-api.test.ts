import { describe, expect, it } from "vitest";
import {
  DEFAULT_DICE_COUNT,
  applyRoundWin,
  countFace,
  isHigherBid,
  legalRaises,
  parseDiceCount,
  resolveChallenge,
  type Mode,
  type PublicMatchView,
} from "../src";

const publicMatch: PublicMatchView = {
  matchId: 1n,
  mode: "robot",
  status: "active-turn",
  players: ["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002"],
  settings: { diceCount: 4, gadgetsEnabled: false, mode: "robot", difficulty: "easy" },
  activeSeat: 0,
  bid: null,
  score: [0, 0],
  round: 1,
  actionSequence: 0,
  deadlines: { actionDeadline: 45, abandonmentDeadline: 120 },
};

const mode: Mode = "robot";

describe("package public API", () => {
  it("keeps rules and public match projections consumable from the package root", () => {
    expect(DEFAULT_DICE_COUNT).toBe(4);
    expect(parseDiceCount(6)).toBe(6);
    expect(isHigherBid({ quantity: 1, face: 1, bidder: 0, sequence: 0 }, { quantity: 1, face: 2 })).toBe(true);
    expect(legalRaises(null, 3)).toHaveLength(36);
    expect(countFace([[2], [2]], 2)).toBe(2);
    expect(resolveChallenge([[2], [1]], { quantity: 1, face: 2, bidder: 0, sequence: 0 }, []).winner).toBe(0);
    expect(applyRoundWin([1, 0], 0).matchWinner).toBe(0);
    expect(publicMatch).toMatchObject({ mode, bid: null, deadlines: { actionDeadline: 45, abandonmentDeadline: 120 } });
  });
});
