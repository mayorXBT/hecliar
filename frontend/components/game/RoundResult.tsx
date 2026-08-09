import type { RoundResultView } from "@hecliar/game-logic";
import { DiceTray } from "./DiceTray";

export function RoundResult({ result, score, onContinue }: { result: RoundResultView; score: readonly [number, number]; onContinue(): void }) {
  const winner = result.winner === result.bid.bidder ? "The bid held" : "The challenge caught the bluff";
  return <section className="hecliar-panel result-panel" aria-live="polite"><p className="eyebrow">Round result</p><h2>{winner}</h2><p>Score: {score[0]} — {score[1]}</p><p>Bid: at least {result.bid.quantity} dice show {result.bid.face}.</p><div className="reveal-grid"><div><span>You</span><DiceTray visibility="revealed" dice={result.rolls[0]} count={result.rolls[0].length} /></div><div><span>Robot</span><DiceTray visibility="revealed" dice={result.rolls[1]} count={result.rolls[1].length} /></div></div><dl className="result-metrics"><div><dt>Base count</dt><dd>{result.baseCount}</dd></div>{result.effects.map((effect) => <div key={`${effect.owner}-${effect.kind}`}><dt>{effect.kind} adjustment</dt><dd>{effect.delta > 0 ? "+" : ""}{effect.delta}</dd></div>)}<div><dt>Effective count</dt><dd>{result.effectiveCount}</dd></div></dl><button className="primary-action" type="button" onClick={onContinue}>Next round</button></section>;
}
