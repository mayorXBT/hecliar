"use client";

import { useMemo, useState } from "react";
import { legalRaises, type DieFace, type PublicMatchView, type Seat } from "@hecliar/game-logic";
import { clsx } from "clsx";
import { Button } from "@/components/ui/Button";
import { Die } from "@/components/ui/Die";

export type RaiseHandler = (bid: { quantity: number; face: DieFace }) => Promise<void> | void;

const FACES = [1, 2, 3, 4, 5, 6] as const;

/**
 * The old picker rendered diceCount*2 quantity buttons plus six face buttons
 * as undifferentiated targets, with nothing to say which were legal. At six
 * dice that is eighteen identical controls and no path through them.
 *
 * Three changes, in order of how often they help:
 *
 * 1. Quick chips for the next three legal raises, taken straight from
 *    legalRaises(). Most turns are now one tap.
 * 2. Faces render as dice rather than numerals, so the row reads as dice.
 * 3. An illegal combination says why it is illegal instead of leaving Raise
 *    disabled with no explanation.
 *
 * Illegal combinations stay selectable on purpose. A disabled control that
 * cannot tell you why is worse than an enabled one that can.
 */
export function BidControls({
  match,
  onRaise,
  onChallenge,
  pending = false,
  mySeat = 0,
}: {
  match: PublicMatchView;
  onRaise: RaiseHandler;
  onChallenge(): Promise<void> | void;
  pending?: boolean;
  /** Seat 0 against the robot; the guest of a friend room sits in seat 1. */
  mySeat?: Seat;
}) {
  const [quantity, setQuantity] = useState(match.bid?.quantity ?? 1);
  const [face, setFace] = useState<DieFace>(match.bid?.face ?? 1);

  const legal = useMemo(
    () => legalRaises(match.bid, match.settings.diceCount),
    [match.bid, match.settings.diceCount],
  );

  const legalKeys = useMemo(
    () => new Set(legal.map((bid) => `${bid.quantity}:${bid.face}`)),
    [legal],
  );

  // Only meaningful once there is a bid to beat. With no standing bid the
  // three smallest legal bids are 1x1, 1x2, 1x3, which is not advice.
  const quick = useMemo(() => (match.bid ? legal.slice(0, 3) : []), [legal, match.bid]);

  // Gating on seat 0 handed the guest of a friend room live controls on the
  // host's turn, and the contract answered NotActivePlayer.
  const canAct = match.status === "active-turn" && match.activeSeat === mySeat;
  const selectionLegal = legalKeys.has(`${quantity}:${face}`);
  const canRaise = !pending && canAct && selectionLegal;
  const canChallenge = !pending && canAct && match.bid !== null;

  return (
    <section aria-label="Bid controls" className="bid-controls">
      {quick.length > 0 && (
        <div className="bid-quick">
          <span className="bid-quick-label">Next legal raise</span>
          <div aria-label="Quick raises" className="bid-quick-row" role="group">
            {quick.map((bid) => (
              <button
                aria-label={`Raise to ${bid.quantity} dice showing ${bid.face}`}
                className={clsx(
                  "bid-quick-chip",
                  quantity === bid.quantity && face === bid.face && "is-selected",
                )}
                disabled={pending || !canAct}
                key={`${bid.quantity}:${bid.face}`}
                onClick={() => {
                  setQuantity(bid.quantity);
                  setFace(bid.face);
                }}
                type="button"
              >
                <span className="bid-quick-qty">{bid.quantity}</span>
                <span aria-hidden="true">×</span>
                <Die face={bid.face} size="sm" state="face" />
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bid-picker">
        <span className="field-label" id="bid-quantity-label">
          Quantity
        </span>
        <div
          aria-labelledby="bid-quantity-label"
          className="segmented-control selector-grid"
          role="group"
        >
          {Array.from({ length: match.settings.diceCount * 2 }, (_, i) => i + 1).map((value) => (
            <button
              aria-label={`Quantity ${value}`}
              aria-pressed={quantity === value}
              key={value}
              onClick={() => setQuantity(value)}
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="bid-picker">
        <span className="field-label" id="bid-face-label">
          Face
        </span>
        <div
          aria-labelledby="bid-face-label"
          className="segmented-control selector-grid face-grid"
          role="group"
        >
          {FACES.map((value) => (
            <button
              aria-label={`Face ${value}`}
              aria-pressed={face === value}
              className={clsx(!legalKeys.has(`${quantity}:${value}`) && "is-unreachable")}
              key={value}
              onClick={() => setFace(value)}
              type="button"
            >
              <Die face={value} size="sm" state="face" />
            </button>
          ))}
        </div>
      </div>

      {canAct && !selectionLegal && match.bid && (
        <p className="bid-hint">
          A raise has to beat {match.bid.quantity} dice showing {match.bid.face} — go higher
          on quantity, or keep the quantity and go higher on the face.
        </p>
      )}

      <div
        aria-label="Table actions"
        className="action-row table-action-region"
        role="group"
      >
        <Button
          className="raise-action"
          disabled={!canRaise}
          onClick={() => onRaise({ quantity, face })}
          variant="primary"
        >
          Raise
        </Button>
        <Button
          className="challenge-action"
          disabled={!canChallenge}
          fullWidth
          onClick={() => onChallenge()}
          variant="challenge"
        >
          Challenge
        </Button>
      </div>
    </section>
  );
}
