"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { PrivatePlayerView, PublicMatchView, RoundResultView } from "@hecliar/game-logic";
import { GameTable } from "@/components/game/GameTable";
import { MatchResult } from "@/components/game/MatchResult";
import { RoundResult } from "@/components/game/RoundResult";
import { GameGatewayProvider, useGameGateway } from "@/hooks/useGameGateway";

function MatchScreen() {
  const gateway = useGameGateway();
  const params = useParams<{ matchId: string }>();
  const [publicMatch, setPublicMatch] = useState<PublicMatchView | null>(null);
  const [privatePlayer, setPrivatePlayer] = useState<PrivatePlayerView | null>(null);
  const [result, setResult] = useState<RoundResultView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const matchId = params.matchId ? BigInt(params.matchId) : null;
  const refresh = useCallback(async () => {
    if (!gateway || matchId === null) return;
    const [nextPublic, nextPrivate, nextResult] = await Promise.all([gateway.getPublicMatch(matchId), gateway.getPrivatePlayer(matchId), gateway.getRoundResult(matchId)]);
    setPublicMatch(nextPublic); setPrivatePlayer(nextPrivate); setResult(nextResult);
  }, [gateway, matchId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh().catch(() => setError("This local match is no longer available. Start a new match.")); }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);
  useEffect(() => {
    if (!gateway || !publicMatch || matchId === null) return;
    if (publicMatch.status === "resolving-challenge") {
      const timer = window.setTimeout(() => { void gateway.settleChallenge(matchId, publicMatch.actionSequence).then(refresh).catch(() => setError("Could not verify the challenge. Refresh and try again.")); }, 700);
      return () => window.clearTimeout(timer);
    }
    if (publicMatch.status === "active-turn" && publicMatch.activeSeat === 1) {
      const delay = 800 + Math.floor(Math.random() * 1001);
      const timer = window.setTimeout(() => { void gateway.requestRobotAction(matchId, publicMatch.actionSequence).then(refresh).catch(() => setError("The robot could not act. Try the match again.")); }, delay);
      return () => window.clearTimeout(timer);
    }
  }, [gateway, matchId, publicMatch, refresh]);
  if (!gateway) return <main className="match-page"><p className="error-note" role="alert">Local play is unavailable. Start a new match with local transport enabled.</p></main>;
  if (error) return <main className="match-page"><p className="error-note" role="alert">{error}</p></main>;
  if (!publicMatch || !privatePlayer || matchId === null) return <main className="match-page"><p className="live-note" aria-live="polite">Loading your private table…</p></main>;
  const act = async (work: () => Promise<void>) => { setError(null); try { await work(); await refresh(); } catch { setError("That action did not go through. The table has been refreshed."); await refresh(); } };
  if (publicMatch.status === "match-complete" && result) return <main className="match-page"><MatchResult winner={result.winner === 0 || result.winner === 1 ? (publicMatch.score[0] === 2 ? 0 : 1) : 0} score={publicMatch.score} onRematch={() => void act(() => gateway.acceptRematch(matchId))} /></main>;
  if (publicMatch.status === "round-complete" && result) return <main className="match-page"><RoundResult result={result} onContinue={() => void act(() => gateway.continueMatch(matchId, publicMatch.actionSequence))} /></main>;
  return <main className="match-page"><GameTable publicMatch={publicMatch} privatePlayer={privatePlayer} onRaise={(bid) => act(() => gateway.raise(matchId, bid, publicMatch.actionSequence))} onChallenge={() => act(() => gateway.challenge(matchId, publicMatch.actionSequence))} onUseGadget={(target) => act(() => gateway.useGadget(matchId, target, publicMatch.actionSequence))} />{error && <p className="error-note" role="alert">{error}</p>}</main>;
}

export default function MatchPage() { return <GameGatewayProvider><MatchScreen /></GameGatewayProvider>; }
