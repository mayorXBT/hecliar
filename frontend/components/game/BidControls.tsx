"use client";

import { useMemo, useState } from "react";
import { legalRaises, type DieFace, type PublicMatchView } from "@hecliar/game-logic";

export type RaiseHandler = (bid: { quantity: number; face: DieFace }) => Promise<void> | void;

export function BidControls({ match, onRaise, onChallenge, pending = false }: { match: PublicMatchView; onRaise: RaiseHandler; onChallenge(): Promise<void> | void; pending?: boolean }) {
  const [quantity, setQuantity] = useState(match.bid?.quantity ?? 1);
  const [face, setFace] = useState<DieFace>(match.bid?.face ?? 1);
  const legal = useMemo(() => legalRaises(match.bid, match.settings.diceCount), [match.bid, match.settings.diceCount]);
  const canAct = match.status === "active-turn" && match.activeSeat === 0;
  const canRaise = !pending && canAct && legal.some((bid) => bid.quantity === quantity && bid.face === face);
  const canChallenge = !pending && canAct && match.bid !== null;
  return <section className="bid-controls" aria-label="Bid controls">
    <div className="bid-picker">
      <span className="field-label">Quantity</span>
      <div className="segmented-control selector-grid" role="group" aria-label="Quantity">{Array.from({ length: match.settings.diceCount * 2 }, (_, index) => index + 1).map((value) => <button key={value} type="button" aria-pressed={quantity === value} aria-label={`Quantity ${value}`} onClick={() => setQuantity(value)}>{value}</button>)}</div>
    </div>
    <div className="bid-picker">
      <span className="field-label">Face</span>
      <div className="segmented-control selector-grid" role="group" aria-label="Face">{([1, 2, 3, 4, 5, 6] as const).map((value) => <button key={value} type="button" aria-pressed={face === value} aria-label={`Face ${value}`} onClick={() => setFace(value)}>{value}</button>)}</div>
    </div>
    <div className="action-row table-action-region" role="group" aria-label="Table actions">
      <button className="raise-action" type="button" disabled={!canRaise} onClick={() => onRaise({ quantity, face })}>Raise</button>
      <button className="challenge-action" type="button" disabled={!canChallenge} onClick={() => onChallenge()}>Challenge</button>
    </div>
  </section>;
}
