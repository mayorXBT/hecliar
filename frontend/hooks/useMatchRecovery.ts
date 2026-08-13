"use client";

import { useCallback, useEffect, useState } from "react";
import { readLastMatch, persistLastMatch, clearRecoveryState } from "@/lib/storage/public-recovery";

export function useMatchRecovery() {
  const [lastMatchId, setLastMatchId] = useState<bigint | null>(null);

  useEffect(() => {
    setLastMatchId(readLastMatch());
  }, []);

  const save = useCallback((matchId: bigint) => {
    persistLastMatch(matchId);
    setLastMatchId(matchId);
  }, []);

  const clear = useCallback(() => {
    clearRecoveryState();
    setLastMatchId(null);
  }, []);

  return { lastMatchId, save, clear };
}
