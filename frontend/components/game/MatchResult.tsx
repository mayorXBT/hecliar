import type { Seat } from "@hecliar/game-logic";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export function MatchResult({
  winner,
  score,
  onRematch,
  pendingAction = null,
  opponent = "Robot",
}: {
  /** 0 when this player won, already resolved against their own seat. */
  winner: Seat;
  /** Already ordered as [yours, theirs]. */
  score: readonly [number, number];
  onRematch(): void;
  pendingAction?: string | null;
  opponent?: string;
}) {
  const won = winner === 0;

  return (
    <Surface aria-live="polite" className="result-panel result-panel--match" level={3}>
      <p className="eyebrow">Match complete</p>
      <h1>{won ? "You took the table" : `${opponent} took the table`}</h1>

      <p aria-label={`Final score you ${score[0]}, ${opponent.toLowerCase()} ${score[1]}`} className="final-score">
        <span>{score[0]}</span>
        <i aria-hidden="true">:</i>
        <span>{score[1]}</span>
      </p>

      <p className="result-lead">
        {won
          ? "Neither hand was readable until the challenge that ended it."
          : "The robot read the odds, not your dice."}
      </p>

      <div className="action-row">
        <Button
          aria-busy={Boolean(pendingAction)}
          disabled={Boolean(pendingAction)}
          onClick={onRematch}
          variant="primary"
        >
          Play again
        </Button>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>

      {pendingAction && <p className="live-note">{pendingAction} pending</p>}
    </Surface>
  );
}
