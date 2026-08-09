import type { Bid, DiceCount, DieFace } from "./types";

type CandidateBid = Readonly<{ quantity: number; face: DieFace }>;

export function isHigherBid(current: Bid, next: CandidateBid): boolean {
  return next.quantity > current.quantity
    || (next.quantity === current.quantity && next.face > current.face);
}

export function legalRaises(current: Bid | null, diceCount: DiceCount): CandidateBid[] {
  const result: CandidateBid[] = [];
  for (let quantity = 1; quantity <= diceCount * 2; quantity += 1) {
    for (let face = 1; face <= 6; face += 1) {
      const candidate = { quantity, face: face as DieFace };
      if (current === null || isHigherBid(current, candidate)) result.push(candidate);
    }
  }
  return result;
}
