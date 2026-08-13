"use client";

import { useEffect, useRef } from "react";
import type { GameGateway, PublicMatchView } from "@hecliar/game-logic";

export function useRobotTurn(
  gateway: GameGateway | null,
  matchId: bigint | null,
  match: PublicMatchView | null,
  onActionCompleted: () => void,
) {
  const requestedRef = useRef(false);

  useEffect(() => {
    if (!gateway || matchId === null || !match || match.status !== "active-turn" || match.activeSeat !== 1) return;
    if (requestedRef.current) return;
    requestedRef.current = true;

    const delay = 800 + Math.floor(Math.random() * 1001);
    const timer = window.setTimeout(async () => {
      try {
        await gateway.requestRobotAction(matchId, match.actionSequence);
        onActionCompleted();
      } catch {
        // retry once
        window.setTimeout(async () => {
          try { await gateway.requestRobotAction(matchId, match.actionSequence); onActionCompleted(); } catch {}
        }, 2000);
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      requestedRef.current = false;
    };
  }, [gateway, matchId, match?.actionSequence, match?.activeSeat, match?.status, onActionCompleted]);
}
