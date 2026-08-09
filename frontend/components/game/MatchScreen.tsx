"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  GameGateway,
  PrivatePlayerView,
  PublicMatchView,
  RoundResultView,
} from "@hecliar/game-logic";
import { GameTable } from "./GameTable";
import { MatchResult } from "./MatchResult";
import { RoundResult } from "./RoundResult";

type Keyed<T> = {
  matchKey: string;
  value: T;
};

function parseMatchId(rawMatchId: string | string[] | undefined): bigint | null {
  if (typeof rawMatchId !== "string" || !/^[1-9]\d*$/.test(rawMatchId)) return null;
  try {
    return BigInt(rawMatchId);
  } catch {
    return null;
  }
}

function RecoveryNotice({
  message,
  onRefresh,
  refreshing,
}: {
  message: string;
  onRefresh(): void;
  refreshing: boolean;
}) {
  return <div className="recovery-note">
    <p className="error-note" role="alert">{message}</p>
    <div className="recovery-actions">
      <button className="secondary-action" type="button" disabled={refreshing} onClick={onRefresh}>Refresh table</button>
      <Link className="secondary-action" href="/play/robot">Start a new match</Link>
    </div>
  </div>;
}

function MatchLifecycle({
  gateway,
  matchId,
  matchKey,
}: {
  gateway: GameGateway;
  matchId: bigint;
  matchKey: string;
}) {
  const pendingRef = useRef<string | null>(null);
  const recoveryRequiredRef = useRef(false);
  const automaticAttempts = useRef(new Set<string>());
  const [publicSnapshot, setPublicSnapshot] = useState<Keyed<PublicMatchView> | null>(null);
  const [privateSnapshot, setPrivateSnapshot] = useState<Keyed<PrivatePlayerView> | null>(null);
  const [resultSnapshot, setResultSnapshot] = useState<Keyed<RoundResultView | null> | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryRequired, setRecoveryRequired] = useState(false);

  const setRecovery = useCallback((required: boolean) => {
    recoveryRequiredRef.current = required;
    setRecoveryRequired(required);
  }, []);

  const refresh = useCallback(async (loadPrivate = true) => {
    const targetKey = matchKey;
    const publicRequest = gateway.getPublicMatch(matchId).then((nextPublic) => {
      setPublicSnapshot({ matchKey: targetKey, value: nextPublic });
    });
    const privateRequest = loadPrivate
      ? gateway.getPrivatePlayer(matchId).then((nextPrivate) => {
        setPrivateSnapshot({ matchKey: targetKey, value: nextPrivate });
      })
      : Promise.resolve();
    const resultRequest = gateway.getRoundResult(matchId).then((nextResult) => {
      setResultSnapshot({ matchKey: targetKey, value: nextResult });
    });
    await Promise.all([publicRequest, privateRequest, resultRequest]);
  }, [gateway, matchId, matchKey]);

  const refreshAfterError = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = "Refresh";
    setPendingAction("Refresh");
    setError(null);
    try {
      await refresh(true);
      setRecovery(false);
    } catch {
      setRecovery(true);
      setError("The table could not be refreshed. You can retry or start a new match.");
    } finally {
      pendingRef.current = null;
      setPendingAction(null);
    }
  }, [refresh, setRecovery]);

  const runAction = useCallback(async (
    label: string,
    work: () => Promise<void>,
    options: { clearPrivate?: boolean; refreshPrivate?: boolean } = {},
  ) => {
    if (pendingRef.current || recoveryRequiredRef.current) return;
    pendingRef.current = label;
    setPendingAction(label);
    setError(null);
    if (options.clearPrivate) setPrivateSnapshot(null);
    try {
      await work();
      await refresh(options.refreshPrivate ?? true);
      setRecovery(false);
    } catch {
      try {
        await refresh(true);
        setRecovery(false);
        setError("That action did not go through. The table was refreshed and is ready to retry.");
      } catch {
        setRecovery(true);
        setError("That action failed and the table could not be refreshed. Refresh before retrying.");
      }
    } finally {
      pendingRef.current = null;
      setPendingAction(null);
    }
  }, [refresh, setRecovery]);

  useEffect(() => {
    void refresh(true).catch(() => {
      setRecovery(true);
      setError("This local match is no longer available. Refresh it or start a new match.");
    });
  }, [gateway, matchId, refresh, setRecovery]);

  const publicMatch = publicSnapshot?.matchKey === matchKey ? publicSnapshot.value : null;
  const privatePlayer = privateSnapshot?.matchKey === matchKey ? privateSnapshot.value : null;
  const result = resultSnapshot?.matchKey === matchKey ? resultSnapshot.value : null;

  useEffect(() => {
    if (!publicMatch || recoveryRequired) return;
    if (publicMatch.status === "resolving-challenge") {
      const attemptKey = `${matchKey}:settle:${publicMatch.actionSequence}`;
      if (automaticAttempts.current.has(attemptKey)) return;
      automaticAttempts.current.add(attemptKey);
      const timer = window.setTimeout(() => {
        void runAction(
          "Challenge verification",
          () => gateway.settleChallenge(matchId, publicMatch.actionSequence),
          { clearPrivate: true, refreshPrivate: false },
        );
      }, 700);
      return () => window.clearTimeout(timer);
    }
    if (publicMatch.status === "active-turn" && publicMatch.activeSeat === 1) {
      const attemptKey = `${matchKey}:robot:${publicMatch.actionSequence}`;
      if (automaticAttempts.current.has(attemptKey)) return;
      automaticAttempts.current.add(attemptKey);
      const delay = 800 + Math.floor(Math.random() * 1001);
      const timer = window.setTimeout(() => {
        void runAction("Robot", () => gateway.requestRobotAction(matchId, publicMatch.actionSequence));
      }, delay);
      return () => window.clearTimeout(timer);
    }
  }, [gateway, matchId, matchKey, publicMatch, recoveryRequired, runAction]);

  if (!publicMatch) {
    return <main className="match-page">
      <p className="live-note" aria-live="polite">{pendingAction ? `${pendingAction} pending` : "Loading your private table\u2026"}</p>
      {error && <RecoveryNotice message={error} onRefresh={() => void refreshAfterError()} refreshing={Boolean(pendingAction)} />}
    </main>;
  }

  const recovery = error
    ? <RecoveryNotice message={error} onRefresh={() => void refreshAfterError()} refreshing={Boolean(pendingAction)} />
    : null;

  if (publicMatch.status === "match-complete" && result) {
    const winner = publicMatch.score[0] === 2 ? 0 : 1;
    return <main className="match-page">
      <MatchResult
        winner={winner}
        score={publicMatch.score}
        pendingAction={pendingAction}
        onRematch={() => void runAction("Rematch", () => gateway.acceptRematch(matchId), { clearPrivate: true })}
      />
      {recovery}
    </main>;
  }
  if (publicMatch.status === "round-complete" && result) {
    return <main className="match-page">
      <RoundResult
        result={result}
        score={publicMatch.score}
        pendingAction={pendingAction}
        onContinue={() => void runAction(
          "Next round",
          () => gateway.continueMatch(matchId, publicMatch.actionSequence),
          { clearPrivate: true },
        )}
      />
      {recovery}
    </main>;
  }
  if (!privatePlayer) {
    return <main className="match-page">
      <p className="live-note" aria-live="polite">{pendingAction ? `${pendingAction} pending` : "Loading fresh private dice\u2026"}</p>
      {recovery}
    </main>;
  }
  const controlLock = pendingAction ?? (recoveryRequired ? "Refresh required" : null);
  return <main className="match-page">
    <GameTable
      publicMatch={publicMatch}
      privatePlayer={privatePlayer}
      pendingAction={controlLock}
      onRaise={(bid) => void runAction("Raise", () => gateway.raise(matchId, bid, publicMatch.actionSequence))}
      onChallenge={() => void runAction(
        "Challenge",
        () => gateway.challenge(matchId, publicMatch.actionSequence),
        { clearPrivate: true, refreshPrivate: false },
      )}
      onUseGadget={(target) => void runAction("Gadget", () => gateway.useGadget(matchId, target, publicMatch.actionSequence))}
    />
    {recovery}
  </main>;
}

export function MatchScreen({
  gateway,
  rawMatchId,
}: {
  gateway: GameGateway | null;
  rawMatchId: string | string[] | undefined;
}) {
  const matchId = parseMatchId(rawMatchId);
  if (matchId === null) {
    return <main className="match-page">
      <p className="error-note" role="alert">This is an invalid match link.</p>
      <Link className="primary-action" href="/play/robot">Start a new match</Link>
    </main>;
  }
  if (!gateway) {
    return <main className="match-page">
      <p className="error-note" role="alert">Local play is unavailable. Start a new match with local transport enabled.</p>
      <Link className="primary-action" href="/play/robot">Start a new match</Link>
    </main>;
  }
  const matchKey = matchId.toString();
  return <MatchLifecycle key={matchKey} gateway={gateway} matchId={matchId} matchKey={matchKey} />;
}
