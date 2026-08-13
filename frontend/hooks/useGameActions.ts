"use client";

import { useCallback, useRef, useState } from "react";
import type { GameGateway, Bid } from "@hecliar/game-logic";

type ActionState = {
  label: string;
  pending: boolean;
  error: string | null;
  recoveryRequired: boolean;
};

export function useGameActions(gateway: GameGateway | null, matchId: bigint | null) {
  const [action, setAction] = useState<ActionState>({ label: "", pending: false, error: null, recoveryRequired: false });
  const pendingRef = useRef(false);

  const run = useCallback(async (label: string, work: () => Promise<void>, clearPrivate = false) => {
    if (!gateway || matchId === null || pendingRef.current) return;
    pendingRef.current = true;
    setAction({ label, pending: true, error: null, recoveryRequired: false });
    try {
      await work();
      setAction({ label, pending: false, error: null, recoveryRequired: false });
    } catch (err) {
      setAction({
        label,
        pending: false,
        error: err instanceof Error ? err.message : "Action failed",
        recoveryRequired: true,
      });
    } finally {
      pendingRef.current = false;
    }
  }, [gateway, matchId]);

  const raise = useCallback((bid: Omit<Bid, "bidder" | "sequence">, expectedSequence: number) => {
    return run("Raise", () => gateway!.raise(matchId!, bid, expectedSequence));
  }, [run, gateway, matchId]);

  const challenge = useCallback((expectedSequence: number) => {
    return run("Challenge", () => gateway!.challenge(matchId!, expectedSequence), true);
  }, [run, gateway, matchId]);

  const useGadget = useCallback((target: number, expectedSequence: number) => {
    return run("Gadget", () => gateway!.useGadget(matchId!, target, expectedSequence));
  }, [run, gateway, matchId]);

  const settle = useCallback((expectedSequence: number) => {
    return run("Resolution", () => gateway!.settleChallenge(matchId!, expectedSequence), true);
  }, [run, gateway, matchId]);

  const continueMatch = useCallback((expectedSequence: number) => {
    return run("Next round", () => gateway!.continueMatch(matchId!, expectedSequence), true);
  }, [run, gateway, matchId]);

  const rematch = useCallback(() => {
    return run("Rematch", () => gateway!.acceptRematch(matchId!), true);
  }, [run, gateway, matchId]);

  const reset = useCallback(() => {
    setAction({ label: "", pending: false, error: null, recoveryRequired: false });
  }, []);

  return { action, raise, challenge, useGadget, settle, continueMatch, rematch, reset, run };
}
