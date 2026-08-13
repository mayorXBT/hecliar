import type { RoundResultView, Seat } from "@hecliar/game-logic";
import { Button } from "@/components/ui/Button";
import { DiceRow } from "@/components/ui/Die";
import { Receipt, type ReceiptRow } from "@/components/ui/Receipt";
import { Surface } from "@/components/ui/Surface";

/**
 * The payoff. Both hands come out of the seal, and the count that decided
 * the round is itemised rather than asserted — the receipt is what makes
 * "settled by attested reveal" mean something to someone reading it.
 */
export function RoundResult({
  result,
  score,
  onContinue,
  pendingAction = null,
  mySeat = 0,
  opponent = "Robot",
}: {
  result: RoundResultView;
  /** Already ordered as [yours, theirs]. */
  score: readonly [number, number];
  onContinue(): void;
  pendingAction?: string | null;
  /** Seat 0 against the robot; the guest of a friend room sits in seat 1. */
  mySeat?: Seat;
  opponent?: string;
}) {
  const held = result.winner === result.bid.bidder;
  // Whether the bid held is the mechanism; who won is the thing a player
  // actually wants to know. "The bidder takes the round" made them remember
  // who had bid, one screen after the fact.
  const theirSeat: Seat = mySeat === 0 ? 1 : 0;
  const youWon = result.winner === mySeat;
  const winnerName = youWon ? "You take" : `${opponent} takes`;

  const rows: ReceiptRow[] = [
    {
      label: `Dice showing ${result.bid.face}`,
      value: String(result.baseCount),
      kind: "base",
    },
    ...result.effects.map((effect) => ({
      label: `${effect.kind} (${effect.owner === mySeat ? "yours" : opponent.toLowerCase()})`,
      value: `${effect.delta > 0 ? "+" : ""}${effect.delta}`,
      kind: "adjust" as const,
    })),
    {
      label: `Counted against a bid of ${result.bid.quantity}`,
      value: String(result.effectiveCount),
      kind: "total",
    },
  ];

  return (
    <Surface aria-live="polite" className="result-panel" level={3}>
      <p className="eyebrow">Round {held ? "held" : "caught"}</p>
      <h2>{youWon ? "You win the round" : `${opponent} wins the round`}</h2>
      <p className="result-because">
        {held ? "The bid held." : "The challenge caught the bluff."}
      </p>

      <p className="result-lead">
        The claim was at least {result.bid.quantity} dice showing {result.bid.face}.
      </p>

      <div className="reveal-grid">
        <div>
          <span>You</span>
          <DiceRow
            dice={result.rolls[mySeat]}
            label="Your revealed dice"
            state="face"
            testId="revealed-die"
          />
        </div>
        <div>
          <span>{opponent}</span>
          <DiceRow
            dice={result.rolls[theirSeat]}
            label={`${opponent} revealed dice`}
            state="face"
            testId="revealed-die"
          />
        </div>
      </div>

      <Receipt
        caption="Round result"
        outcome={held ? "held" : "caught"}
        rows={rows}
        verdict={
          held
            ? `${result.effectiveCount} is enough. ${winnerName} the round.`
            : `${result.effectiveCount} falls short. ${winnerName} the round.`
        }
      />

      {/* "0 — 1" leaves the player working out which number is theirs, so both
          sides are named. */}
      <p aria-label={`Match score, you ${score[0]}, ${opponent.toLowerCase()} ${score[1]}`} className="result-score">
        <span aria-hidden="true">
          You <strong>{score[0]}</strong>
        </span>
        <i aria-hidden="true">·</i>
        <span aria-hidden="true">
          {opponent} <strong>{score[1]}</strong>
        </span>
      </p>

      <Button
        aria-busy={Boolean(pendingAction)}
        disabled={Boolean(pendingAction)}
        onClick={onContinue}
        variant="primary"
      >
        {pendingAction ? "Starting next round" : "Next round"}
      </Button>

      {pendingAction && <p className="live-note">{pendingAction} pending</p>}
    </Surface>
  );
}
