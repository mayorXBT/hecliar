"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GameGateway, PublicMatchView } from "@hecliar/game-logic";

export function usePublicMatch(gateway: GameGateway | null, matchId: bigint | null) {
  const [match, setMatch] = useState<PublicMatchView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollingRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const refresh = useCallback(async () => {
    if (!gateway || matchId === null) return;
    try {
      const view = await gateway.getPublicMatch(matchId);
      setMatch(view);
      setError(null);
    } catch (err) {
      setError("Could not load match state.");
    } finally {
      setLoading(false);
    }
  }, [gateway, matchId]);

  useEffect(() => {
    setLoading(true);
    void refresh();
    pollingRef.current = setInterval(refresh, 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [refresh]);

  return { match, error, loading, refresh };
}
