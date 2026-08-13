"use client";

import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { MatchScreen } from "@/components/game/MatchScreen";
import { GameGatewayProvider, useGameGateway, type Mode } from "@/hooks/useGameGateway";
import { readLastMode } from "@/lib/storage/public-recovery";

/**
 * The table serves both modes, so it is the one route that has to ask which
 * game it is showing. The mode is recorded when the match is created, which
 * is the only place it is known for certain — a match id alone does not say
 * whether it lives in memory or on the chain.
 *
 * Read as an external store, not from an effect: the server has no
 * sessionStorage, so the server snapshot is null and the client picks the
 * mode up on hydration without a mismatch.
 */
const subscribeToNothing = () => () => undefined;
const readMode = (): Mode | null => readLastMode();
const serverMode = (): Mode | null => null;

function RoutedMatchScreen() {
  const gateway = useGameGateway();
  const params = useParams<{ matchId: string | string[] }>();
  return <MatchScreen gateway={gateway} rawMatchId={params.matchId} />;
}

export default function MatchPage() {
  const mode = useSyncExternalStore(subscribeToNothing, readMode, serverMode);
  return (
    <GameGatewayProvider mode={mode}>
      <RoutedMatchScreen />
    </GameGatewayProvider>
  );
}
