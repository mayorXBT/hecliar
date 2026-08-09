import { legalRaises } from "./bids";
import type { Bid, DiceCount, DieFace, Difficulty, GadgetKind, Seat } from "./types";

export type RobotAction =
  | Readonly<{ type: "raise"; bid: { quantity: number; face: DieFace } }>
  | Readonly<{ type: "challenge" }>
  | Readonly<{ type: "use-gadget"; target: number }>;

export type RobotObservation = Readonly<{
  matchId: bigint;
  difficulty: Difficulty;
  ownDice: readonly DieFace[];
  dicePerSide: DiceCount;
  currentBid: Bid | null;
  publicHistory: readonly Readonly<{ actor: Seat; type: "raise" | "challenge" | "use-gadget" }>[];
  scores: readonly [number, number];
  gadget: Readonly<{ kind: GadgetKind; used: boolean }> | null;
  random: SeededRandom;
}>;

export class SeededRandom {
  constructor(private state: number) {}

  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0x1_0000_0000;
  }
}

const PROFILES = {
  easy: { challengeBelow: 0.08, bluffChance: 0.03, maxBluffQuantity: 0, gadgets: false },
  medium: { challengeBelow: 0.24, bluffChance: 0.14, maxBluffQuantity: 1, gadgets: false },
  hard: { challengeBelow: 0.38, bluffChance: 0.24, maxBluffQuantity: 2, gadgets: true },
} as const;

export const getRobotProfile = (difficulty: Difficulty) => PROFILES[difficulty];

function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i += 1) result = result * (n - i + 1) / i;
  return result;
}

function binomialTail(n: number, minimum: number, p: number): number {
  if (minimum <= 0) return 1;
  if (minimum > n) return 0;
  let total = 0;
  for (let hits = minimum; hits <= n; hits += 1) {
    total += choose(n, hits) * p ** hits * (1 - p) ** (n - hits);
  }
  return total;
}

export function probabilityBidIsTrue(view: RobotObservation): number {
  const bid = view.currentBid;
  if (!bid) return 1;
  const ownMatches = view.ownDice.filter((die) => die === bid.face).length;
  return binomialTail(view.dicePerSide, bid.quantity - ownMatches, 1 / 6);
}

export function isLegalRobotAction(view: RobotObservation, action: RobotAction): boolean {
  if (action.type === "challenge") return view.currentBid !== null;
  if (action.type === "use-gadget") {
    return Boolean(view.gadget && !view.gadget.used
      && action.target >= 0 && action.target < view.dicePerSide);
  }
  return legalRaises(view.currentBid, view.dicePerSide)
    .some((bid) => bid.quantity === action.bid.quantity && bid.face === action.bid.face);
}

export function chooseRobotAction(view: RobotObservation): RobotAction {
  const profile = PROFILES[view.difficulty];
  const probability = probabilityBidIsTrue(view);
  if (view.currentBid && probability < profile.challengeBelow) return { type: "challenge" };

  if (profile.gadgets && view.gadget && !view.gadget.used && view.random.next() < 0.18) {
    return { type: "use-gadget", target: Math.floor(view.random.next() * view.dicePerSide) };
  }

  const raises = legalRaises(view.currentBid, view.dicePerSide);
  if (raises.length === 0) return { type: "challenge" };
  const supported = raises.filter((bid) => {
    const own = view.ownDice.filter((die) => die === bid.face).length;
    return bid.quantity <= own + profile.maxBluffQuantity;
  });
  const pool = supported.length > 0 && view.random.next() >= profile.bluffChance ? supported : raises;
  return { type: "raise", bid: pool[Math.floor(view.random.next() * pool.length)] };
}
