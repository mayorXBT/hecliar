"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameGateway, PrivatePlayerView } from "@hecliar/game-logic";

export function usePrivatePlayer(gateway: GameGateway | null, matchId: bigint | null, deps: unknown[]) {
  const [player, setPlayer] = useState<PrivatePlayerView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!gateway || matchId === null) return;
    try {
      const view = await gateway.getPrivatePlayer(matchId);
      setPlayer(view);
      setError(null);
    } catch {
      setError("Could not load private state.");
    }
  }, [gateway, matchId]);

  useEffect(() => { void refresh(); }, [refresh, ...deps]);

  return { player, error, refresh };
}
