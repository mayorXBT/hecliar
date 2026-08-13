"use client";

import { useState } from "react";
import type { PrivatePlayerView, PublicMatchView, Seat } from "@hecliar/game-logic";
import { ActionStatus } from "./ActionStatus";
import { BidControls, type RaiseHandler } from "./BidControls";
import { TurnTimer } from "./TurnTimer";
import { BidLine } from "@/components/ui/BidLine";
import { DiceRow } from "@/components/ui/Die";
import { Surface } from "@/components/ui/Surface";

/**
 * Three zones with three different weights, because the old table gave the
 * opponent, the bid and your hand the same card and so directed the eye
 * nowhere.
 *
 *   opponent   surface 1, quiet — sealed dice and the score
 *   bid        surface 3, the stage — the one fact that decides your turn
 *   hand       surface 2, where you act
 *
 * The opponent's dice render as `sealed` rather than as blanks. They are
 * ciphertext on chain, and showing the handle makes that visible during the
 * round instead of only in the marketing copy.
 */
export function GameTable({
  publicMatch,
  privatePlayer,
  onRaise,
  onChallenge,
  onUseGadget,
  pendingAction = null,
  mySeat = 0,
  opponent = "Robot",
}: {
  publicMatch: PublicMatchView;
  privatePlayer: PrivatePlayerView;
  onRaise: RaiseHandler;
  onChallenge(): Promise<void> | void;
  onUseGadget(target: number): Promise<void> | void;
  pendingAction?: string | null;
  /** Seat 0 against the robot; the guest of a friend room sits in seat 1. */
  mySeat?: Seat;
  opponent?: string;
}) {
  const theirSeat: Seat = mySeat === 0 ? 1 : 0;
  const bid = publicMatch.bid;
  const [choosingTarget, setChoosingTarget] = useState(false);

  const canUseGadget =
    !pendingAction &&
    publicMatch.activeSeat === mySeat &&
    publicMatch.status === "active-turn" &&
    (privatePlayer.gadget !== "scanner" || bid !== null);

  const yourTurn = publicMatch.status === "active-turn" && publicMatch.activeSeat === mySeat;

  return (
    <section aria-label="Hecliar game table" className="game-table">
      <Surface aria-label="Opponent" className="opponent-surface" level={1}>
        <div className="opponent-id">
          <p className="eyebrow">Opponent</p>
          <strong>{opponent}</strong>
        </div>
        <DiceRow
          count={publicMatch.settings.diceCount}
          label={`${publicMatch.settings.diceCount} hidden opponent dice`}
          seedPrefix={`m${publicMatch.matchId}r${publicMatch.round}`}
          size="sm"
          state="sealed"
          testId="hidden-die"
        />
        <p
          aria-label={`Score you ${publicMatch.score[mySeat]}, ${opponent.toLowerCase()} ${publicMatch.score[theirSeat]}`}
          className="scoreline"
        >
          <span>{publicMatch.score[mySeat]}</span>
          <i aria-hidden="true">:</i>
          <span>{publicMatch.score[theirSeat]}</span>
        </p>
      </Surface>

      <Surface className="bid-surface" level={3}>
        <div className="bid-surface-head">
          <p className="eyebrow">Current bid</p>
          {yourTurn && (
            <TurnTimer deadline={publicMatch.deadlines.actionDeadline} label="Your turn" />
          )}
        </div>
        <h1 className="bid-headline">
          <BidLine bid={bid} emptyLabel="Open the bidding" size="lead" />
        </h1>
        <ActionStatus activeSeat={publicMatch.activeSeat} status={publicMatch.status} />
      </Surface>

      <Surface aria-label="Your hand" className="hand-surface" level={2}>
        <div className="hand-heading">
          <div>
            <p className="eyebrow">Your hand</p>
            <h2>Your dice</h2>
          </div>
          {privatePlayer.gadget && (
            <button
              className="gadget-chip"
              disabled={!canUseGadget}
              onClick={() =>
                privatePlayer.gadget === "scanner"
                  ? onUseGadget(0)
                  : setChoosingTarget(true)
              }
              type="button"
            >
              Use {privatePlayer.gadget}
            </button>
          )}
        </div>

        <DiceRow
          dice={privatePlayer.ownDice}
          label="Your dice"
          state="face"
          testId="own-die"
        />

        {choosingTarget && (
          <div aria-label="Choose gadget target" className="target-picker">
            {privatePlayer.ownDice.map((_, index) => (
              <button
                aria-label={`Target die ${index + 1}`}
                disabled={Boolean(pendingAction)}
                key={index}
                onClick={() => {
                  setChoosingTarget(false);
                  onUseGadget(index);
                }}
                type="button"
              >
                Die {index + 1}
              </button>
            ))}
          </div>
        )}

        {privatePlayer.scannerResult !== null && (
          <p className="scanner-result">
            Scanner: the current bid is{" "}
            {privatePlayer.scannerResult ? "supported" : "not supported"}.
          </p>
        )}

        <BidControls
          mySeat={mySeat}
          match={publicMatch}
          onChallenge={onChallenge}
          onRaise={onRaise}
          pending={Boolean(pendingAction)}
        />
      </Surface>

      {pendingAction && (
        <p aria-live="polite" className="live-note">
          {pendingAction} pending
        </p>
      )}
    </section>
  );
}
