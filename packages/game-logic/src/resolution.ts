import type { Bid, DieFace, GadgetKind, Seat } from "./types";

export type AppliedGadget = Readonly<{
  owner: Seat;
  kind: Exclude<GadgetKind, "scanner">;
  target: number;
}>;

export function countFace(rolls: readonly (readonly DieFace[])[], face: DieFace): number {
  return rolls.flat().filter((die) => die === face).length;
}

export function resolveChallenge(
  rolls: readonly [readonly DieFace[], readonly DieFace[]],
  bid: Bid,
  gadgets: readonly AppliedGadget[],
) {
  const baseCount = countFace(rolls, bid.face);
  let effectiveCount = baseCount;
  const effects: { owner: Seat; kind: AppliedGadget["kind"]; delta: number }[] = [];

  for (const gadget of gadgets) {
    const targetSeat = gadget.kind === "echo" ? gadget.owner : ((1 - gadget.owner) as Seat);
    const matches = rolls[targetSeat][gadget.target] === bid.face;
    const delta = matches ? (gadget.kind === "echo" ? 1 : -1) : 0;
    effectiveCount += delta;
    effects.push({ owner: gadget.owner, kind: gadget.kind, delta });
  }

  const challenger = (1 - bid.bidder) as Seat;
  const winner = (effectiveCount >= bid.quantity ? bid.bidder : challenger) as Seat;
  return { baseCount, effectiveCount, winner, effects };
}

export function applyRoundWin(score: readonly [number, number], winner: Seat) {
  const next: [number, number] = [score[0], score[1]];
  next[winner] += 1;
  return { score: next, matchWinner: next[winner] === 2 ? winner : null };
}
