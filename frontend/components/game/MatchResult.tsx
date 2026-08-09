import Link from "next/link";
import type { Seat } from "@hecliar/game-logic";

export function MatchResult({ winner, score, onRematch }: { winner: Seat; score: readonly [number, number]; onRematch(): void }) {
  return <section className="hecliar-panel result-panel" aria-live="polite"><p className="eyebrow">Match result</p><h1>{winner === 0 ? "You took the table" : "The robot took the table"}</h1><p className="final-score"><span>{score[0]}</span> — <span>{score[1]}</span></p><div className="action-row"><button className="primary-action" type="button" onClick={onRematch}>Play again</button><Link className="secondary-action" href="/">Home</Link></div></section>;
}
