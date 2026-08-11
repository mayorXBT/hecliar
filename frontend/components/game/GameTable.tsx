import { useState } from "react";
import type { PrivatePlayerView, PublicMatchView } from "@hecliar/game-logic";
import { ActionStatus } from "./ActionStatus";
import { BidControls, type RaiseHandler } from "./BidControls";
import { DiceTray } from "./DiceTray";

export function GameTable({ publicMatch, privatePlayer, onRaise, onChallenge, onUseGadget, pendingAction = null }: { publicMatch: PublicMatchView; privatePlayer: PrivatePlayerView; onRaise: RaiseHandler; onChallenge(): Promise<void> | void; onUseGadget(target: number): Promise<void> | void; pendingAction?: string | null }) {
  const bid = publicMatch.bid;
  const [choosingTarget, setChoosingTarget] = useState(false);
  const canUse = !pendingAction && publicMatch.activeSeat === 0 && publicMatch.status === "active-turn" && (privatePlayer.gadget !== "scanner" || bid !== null);
  return <section className="game-table" aria-label="Hecliar game table">
    <section className="table-surface table-status-rail" aria-label="Round status">
      <div className="table-status-rail__opponent" aria-label="Opponent">
        <p className="eyebrow">Opponent</p>
        <strong>Robot</strong>
        <DiceTray visibility="hidden" count={publicMatch.settings.diceCount} />
      </div>
      <div className="table-status-rail__score" aria-label={`Score you ${publicMatch.score[0]}, robot ${publicMatch.score[1]}`}>
        <p className="eyebrow">Score</p>
        <div className="scoreline"><span>{publicMatch.score[0]}</span><i>:</i><span>{publicMatch.score[1]}</span></div>
      </div>
      <div className="table-status-rail__turn">
        <p className="eyebrow">Turn status</p>
        <ActionStatus status={publicMatch.status} activeSeat={publicMatch.activeSeat} />
      </div>
    </section>
    <section className="table-surface bid-surface" aria-label="Current bid">
      <div className="living-bid-line" aria-hidden="true"><i /><span /><span /><span /></div>
      <p className="eyebrow">Current bid</p>
      <h1>{bid ? `At least ${bid.quantity} dice show ${bid.face}` : "Open the bidding"}</h1>
    </section>
    <section className="table-surface hand-surface" aria-label="Your hand">
      <div className="hand-heading">
        <div><p className="eyebrow">Your hand</p><h2>Your dice</h2></div>
        {privatePlayer.gadget && <button className="gadget-chip" type="button" disabled={!canUse} onClick={() => privatePlayer.gadget === "scanner" ? onUseGadget(0) : setChoosingTarget(true)}>Use {privatePlayer.gadget}</button>}
      </div>
      <DiceTray visibility="owner" dice={privatePlayer.ownDice} count={privatePlayer.ownDice.length} />
      {choosingTarget && <div className="target-picker" aria-label="Choose gadget target">{privatePlayer.ownDice.map((_, index) => <button key={index} type="button" aria-label={`Target die ${index + 1}`} disabled={Boolean(pendingAction)} onClick={() => { setChoosingTarget(false); onUseGadget(index); }}>Die {index + 1}</button>)}</div>}
      {privatePlayer.scannerResult !== null && <p className="scanner-result">Scanner: the current bid is {privatePlayer.scannerResult ? "supported" : "not supported"}.</p>}
      <BidControls match={publicMatch} onRaise={onRaise} onChallenge={onChallenge} pending={Boolean(pendingAction)} />
    </section>
    {pendingAction && <p className="live-note" aria-live="polite">{pendingAction} pending</p>}
  </section>;
}
