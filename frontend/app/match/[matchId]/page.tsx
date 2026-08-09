"use client";

import { useParams } from "next/navigation";
import { MatchScreen } from "@/components/game/MatchScreen";
import { GameGatewayProvider, useGameGateway } from "@/hooks/useGameGateway";

function RoutedMatchScreen() {
  const gateway = useGameGateway();
  const params = useParams<{ matchId: string | string[] }>();
  return <MatchScreen gateway={gateway} rawMatchId={params.matchId} />;
}

export default function MatchPage() {
  return <GameGatewayProvider><RoutedMatchScreen /></GameGatewayProvider>;
}
