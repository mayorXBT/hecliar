import Link from "next/link";
import type { Seat } from "@hecliar/game-logic";

export function MatchResult({ winner, score, onRematch, pendingAction = null }: { winner: Seat; score: readonly [number, number]; onRematch(): void; pendingAction?: string | null }) {
  return <section className="hecliar-panel result-panel result-panel--match" aria-live="polite"><p className="eyebrow">Match result</p><h1>{winner === 0 ? "You took the table" : "The robot took the table"}</h1><p className="final-score"><span>{score[0]}</span> {"\u2014"} <span>{score[1]}</span></p><div className="action-row"><button className="primary-action" type="button" disabled={Boolean(pendingAction)} aria-busy={Boolean(pendingAction)} onClick={onRematch}>Play again</button><Link className="secondary-action" href="/">Home</Link></div>{pendingAction && <p className="live-note">{pendingAction} pending</p>}</section>;
}
