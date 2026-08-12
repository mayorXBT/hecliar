import type { RoundResultView } from "@hecliar/game-logic";
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
}: {
  result: RoundResultView;
  score: readonly [number, number];
  onContinue(): void;
  pendingAction?: string | null;
}) {
  const held = result.winner === result.bid.bidder;

  const rows: ReceiptRow[] = [
    {
      label: `Dice showing ${result.bid.face}`,
      value: String(result.baseCount),
      kind: "base",
    },
    ...result.effects.map((effect) => ({
      label: `${effect.kind} (${effect.owner === 0 ? "yours" : "robot"})`,
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
      <h2>{held ? "The bid held" : "The challenge caught the bluff"}</h2>

      <p className="result-lead">
        The claim was at least {result.bid.quantity} dice showing {result.bid.face}.
      </p>

      <div className="reveal-grid">
        <div>
          <span>You</span>
          <DiceRow
            dice={result.rolls[0]}
            label="Your revealed dice"
            state="face"
            testId="revealed-die"
          />
        </div>
        <div>
          <span>Robot</span>
          <DiceRow
            dice={result.rolls[1]}
            label="Robot revealed dice"
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
            ? `${result.effectiveCount} is enough. The bidder takes the round.`
            : `${result.effectiveCount} falls short. The challenger takes the round.`
        }
      />

      <p className="result-score">
        Match score <strong>{score[0]}</strong> — <strong>{score[1]}</strong>
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
