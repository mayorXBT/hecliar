"use client";

import type { GameGateway } from "@hecliar/game-logic";
import { useMatchLifecycle } from "@/hooks/useMatchLifecycle";
import { Button, ButtonLink } from "@/components/ui/Button";
import { StatusPip } from "@/components/ui/StatusPip";
import { GameTable } from "./GameTable";
import { MatchResult } from "./MatchResult";
import { RoundResult } from "./RoundResult";

function RecoveryNotice({
  message,
  onRefresh,
  refreshing,
  allowRefresh,
}: {
  message: string;
  onRefresh(): void;
  refreshing: boolean;
  allowRefresh: boolean;
}) {
  return (
    <div className="recovery-note">
      <p className="error-note" role="alert">
        {message}
      </p>
      <div className="recovery-actions">
        {allowRefresh && (
          <Button disabled={refreshing} onClick={onRefresh} variant="secondary">
            Refresh table
          </Button>
        )}
        <ButtonLink href="/play/robot" variant="ghost">
          Start a new match
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * Presentation only. Every decision about what to show is a read of the
 * lifecycle's state; no fetching, retrying or scheduling happens here.
 */
export function MatchView({
  gateway,
  matchId,
  matchKey,
}: {
  gateway: GameGateway;
  matchId: bigint;
  matchKey: string;
}) {
  const match = useMatchLifecycle({ gateway, matchId, matchKey });
  const {
    publicMatch,
    privatePlayer,
    result,
    pendingAction,
    error,
    recoveryRequired,
    automaticSafeExit,
  } = match;

  const recovery = error ? (
    <RecoveryNotice
      allowRefresh={!automaticSafeExit}
      message={error}
      onRefresh={match.refreshAfterError}
      refreshing={Boolean(pendingAction)}
    />
  ) : null;

  if (!publicMatch) {
    return (
      <main className="match-page">
        <StatusPip live tone={pendingAction ? "pending" : "idle"}>
          {pendingAction ? `${pendingAction} pending` : "Loading your private table…"}
        </StatusPip>
        {recovery}
      </main>
    );
  }

  if (publicMatch.status === "match-complete" && result) {
    return (
      <main className="match-page">
        <MatchResult
          onRematch={match.rematch}
          pendingAction={pendingAction}
          score={publicMatch.score}
          winner={publicMatch.score[0] === 2 ? 0 : 1}
        />
        {recovery}
      </main>
    );
  }

  if (publicMatch.status === "round-complete" && result) {
    return (
      <main className="match-page">
        <RoundResult
          onContinue={match.continueMatch}
          pendingAction={pendingAction}
          result={result}
          score={publicMatch.score}
        />
        {recovery}
      </main>
    );
  }

  if (automaticSafeExit) {
    return (
      <main className="match-page">
        <p
          aria-label={`Score you ${publicMatch.score[0]}, robot ${publicMatch.score[1]}`}
          className="scoreline"
        >
          <span>{publicMatch.score[0]}</span>
          <i aria-hidden="true">:</i>
          <span>{publicMatch.score[1]}</span>
        </p>
        {recovery}
      </main>
    );
  }

  if (!privatePlayer) {
    return (
      <main className="match-page">
        <StatusPip live tone={pendingAction ? "pending" : "idle"}>
          {pendingAction ? `${pendingAction} pending` : "Loading fresh private dice…"}
        </StatusPip>
        {recovery}
      </main>
    );
  }

  return (
    <main className="match-page">
      <GameTable
        onChallenge={match.challenge}
        onRaise={match.raise}
        onUseGadget={match.useGadget}
        pendingAction={pendingAction ?? (recoveryRequired ? "Refresh required" : null)}
        privatePlayer={privatePlayer}
        publicMatch={publicMatch}
      />
      {recovery}
    </main>
  );
}
