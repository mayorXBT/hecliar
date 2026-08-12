import type { Bid, DieFace } from "@hecliar/game-logic";
import { clsx } from "clsx";
import { Die } from "./Die";

/**
 * A bid is a sentence a player said out loud, so it reads as one — with the
 * claimed face shown as the die itself rather than spelled as a numeral.
 * `size="lead"` is the current bid on the table, which is the single most
 * important fact in the game and the only place the table uses display type.
 */
export function BidLine({
  bid,
  size = "body",
  emptyLabel = "No bid yet",
}: {
  bid: Pick<Bid, "quantity" | "face"> | null;
  size?: "body" | "lead";
  emptyLabel?: string;
}) {
  if (!bid) {
    return <p className={clsx("hx-bid", `hx-bid--${size}`, "hx-bid--empty")}>{emptyLabel}</p>;
  }

  return (
    <p
      aria-label={`At least ${bid.quantity} dice show ${bid.face}`}
      className={clsx("hx-bid", `hx-bid--${size}`)}
    >
      <span aria-hidden="true">At least </span>
      <span aria-hidden="true" className="hx-bid-qty">
        {bid.quantity}
      </span>
      <span aria-hidden="true"> dice show </span>
      <span aria-hidden="true" className="hx-bid-face">
        <Die face={bid.face as DieFace} size="sm" state="face" />
      </span>
    </p>
  );
}
