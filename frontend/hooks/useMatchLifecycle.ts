"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  DieFace,
  GameGateway,
  PrivatePlayerView,
  PublicMatchView,
  RoundResultView,
} from "@hecliar/game-logic";

/**
 * The match state machine, lifted out of MatchScreen unchanged.
 *
 * This is the part of the old 493-line file that was worth keeping: refresh,
 * retry, partial-read recovery, and the automatic advance of a robot turn or
 * a challenge settlement, each with a bounded retry budget. The behaviour is
 * deliberately identical — the split exists so the table can be restyled
 * without editing the file that owns this logic.
 */

type Keyed<T> = {
  matchKey: string;
  value: T;
};

type AutomaticAttempt = {
  failures: number;
  state: "scheduled" | "in-flight" | "retryable" | "succeeded" | "exhausted";
};

type ActionOutcome =
  | { state: "skipped" }
  | { state: "succeeded"; refreshedPublic: PublicMatchView | null }
  | { state: "failed"; refreshedPublic: PublicMatchView | null; recoveryRequired: boolean };

export const partialRefreshMessage =
  "The current table state was found, but it could not be fully refreshed. Refresh before continuing.";

export class RefreshFailure extends Error {
  constructor(
    readonly publicMatch: PublicMatchView | null,
    readonly failedReads: Array<"public" | "private" | "result">,
    readonly reason: unknown,
  ) {
    super("Match refresh was incomplete.");
    this.name = "RefreshFailure";
  }
}

export type MatchLifecycle = {
  publicMatch: PublicMatchView | null;
  privatePlayer: PrivatePlayerView | null;
  result: RoundResultView | null;
  pendingAction: string | null;
  error: string | null;
  recoveryRequired: boolean;
  automaticSafeExit: boolean;
  refreshAfterError(): void;
  raise(bid: { quantity: number; face: DieFace }): void;
  challenge(): void;
  useGadget(target: number): void;
  continueMatch(): void;
  rematch(): void;
};

export function useMatchLifecycle({
  gateway,
  matchId,
  matchKey,
}: {
  gateway: GameGateway;
  matchId: bigint;
  matchKey: string;
}): MatchLifecycle {
  const pendingRef = useRef<string | null>(null);
  const recoveryRequiredRef = useRef(false);
  const automaticAttempts = useRef(new Map<string, AutomaticAttempt>());
  // Highest actionSequence this table has shown. Guards against a lagging RPC
  // node rendering an older view over a newer one. The hook is keyed by match,
  // so this starts fresh for each match rather than needing a reset.
  const lastSequenceRef = useRef(-1);
  const [publicSnapshot, setPublicSnapshot] = useState<Keyed<PublicMatchView> | null>(null);
  const [privateSnapshot, setPrivateSnapshot] = useState<Keyed<PrivatePlayerView> | null>(null);
  const [resultSnapshot, setResultSnapshot] = useState<Keyed<RoundResultView | null> | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recoveryRequired, setRecoveryRequired] = useState(false);
  const [automaticRevision, setAutomaticRevision] = useState(0);
  const [automaticSafeExit, setAutomaticSafeExit] = useState(false);

  const setRecovery = useCallback((required: boolean) => {
    recoveryRequiredRef.current = required;
    setRecoveryRequired(required);
  }, []);

  const refresh = useCallback(async (loadPrivate = true) => {
    const targetKey = matchKey;
    const publicRequest = gateway.getPublicMatch(matchId).then((nextPublic) => {
      // A public RPC load-balances across nodes at different heights, so a
      // read can come back from one that has not seen the latest block. Left
      // alone it moves the table backwards: dice vanish, a settled round
      // reopens, the current bid reverts to an older one.
      //
      // actionSequence only ever increases, so it says which of two views is
      // older. Anything behind what is already on screen is dropped rather
      // than rendered.
      if (nextPublic.actionSequence < lastSequenceRef.current) return null;
      lastSequenceRef.current = nextPublic.actionSequence;
      setPublicSnapshot({ matchKey: targetKey, value: nextPublic });
      return nextPublic;
    });
    const privateRequest = loadPrivate
      ? gateway.getPrivatePlayer(matchId).then((nextPrivate) => {
        setPrivateSnapshot({ matchKey: targetKey, value: nextPrivate });
      })
      : Promise.resolve();
    const resultRequest = gateway.getRoundResult(matchId).then((nextResult) => {
      setResultSnapshot({ matchKey: targetKey, value: nextResult });
    });
    const [publicResult, privateResult, resultResult] = await Promise.allSettled([
      publicRequest,
      privateRequest,
      resultRequest,
    ]);
    const failedReads: RefreshFailure["failedReads"] = [];
    let reason: unknown;
    if (publicResult.status === "rejected") {
      failedReads.push("public");
      reason = publicResult.reason;
    }
    if (privateResult.status === "rejected") {
      failedReads.push("private");
      reason ??= privateResult.reason;
      setPrivateSnapshot(null);
    }
    if (resultResult.status === "rejected") {
      failedReads.push("result");
      reason ??= resultResult.reason;
      setResultSnapshot(null);
    }
    if (failedReads.length > 0) {
      throw new RefreshFailure(
        publicResult.status === "fulfilled" ? publicResult.value : null,
        failedReads,
        reason,
      );
    }
    return publicResult.status === "fulfilled" ? publicResult.value : null;
  }, [gateway, matchId, matchKey]);

  const refreshAfterError = useCallback(async () => {
    if (pendingRef.current) return;
    pendingRef.current = "Refresh";
    setPendingAction("Refresh");
    setError(null);
    try {
      await refresh(true);
      setRecovery(false);
    } catch (refreshError) {
      setRecovery(true);
      setError(
        refreshError instanceof RefreshFailure && refreshError.publicMatch
          ? partialRefreshMessage
          : "The table could not be refreshed. You can retry or start a new match.",
      );
    } finally {
      pendingRef.current = null;
      setPendingAction(null);
    }
  }, [refresh, setRecovery]);

  const runAction = useCallback(async (
    label: string,
    work: () => Promise<void>,
    options: { clearPrivate?: boolean; refreshPrivate?: boolean } = {},
  ): Promise<ActionOutcome> => {
    if (pendingRef.current || recoveryRequiredRef.current) return { state: "skipped" };
    pendingRef.current = label;
    setPendingAction(label);
    setError(null);
    if (options.clearPrivate) setPrivateSnapshot(null);
    try {
      try {
        await work();
      } catch {
        try {
          const refreshedPublic = await refresh(true);
          setRecovery(false);
          setError("That action did not go through. The table was refreshed and is ready to retry.");
          return { state: "failed", refreshedPublic, recoveryRequired: false };
        } catch (refreshError) {
          const refreshedPublic = refreshError instanceof RefreshFailure
            ? refreshError.publicMatch
            : null;
          if (
            options.clearPrivate
            || (
              refreshError instanceof RefreshFailure
              && refreshError.failedReads.includes("private")
            )
          ) {
            setPrivateSnapshot(null);
          }
          setRecovery(true);
          setError(refreshedPublic
            ? partialRefreshMessage
            : "That action failed and the table could not be refreshed. Refresh before retrying.");
          return { state: "failed", refreshedPublic, recoveryRequired: true };
        }
      }
      try {
        const refreshedPublic = await refresh(options.refreshPrivate ?? true);
        setRecovery(false);
        return { state: "succeeded", refreshedPublic };
      } catch {
        try {
          const refreshedPublic = await refresh(true);
          setRecovery(false);
          return { state: "succeeded", refreshedPublic };
        } catch (refreshError) {
          const refreshedPublic = refreshError instanceof RefreshFailure
            ? refreshError.publicMatch
            : null;
          if (
            options.clearPrivate
            || (
              refreshError instanceof RefreshFailure
              && refreshError.failedReads.includes("private")
            )
          ) {
            setPrivateSnapshot(null);
          }
          setRecovery(true);
          setError(refreshedPublic
            ? partialRefreshMessage
            : "That action failed and the table could not be refreshed. Refresh before retrying.");
          return { state: "succeeded", refreshedPublic };
        }
      }
    } finally {
      pendingRef.current = null;
      setPendingAction(null);
    }
  }, [refresh, setRecovery]);

  const runAutomaticAction = useCallback(async (
    attemptKey: string,
    label: string,
    work: () => Promise<void>,
    isCurrentAttempt: (refreshedPublic: PublicMatchView) => boolean,
    options: { clearPrivate?: boolean; refreshPrivate?: boolean } = {},
  ) => {
    const scheduled = automaticAttempts.current.get(attemptKey);
    if (!scheduled || scheduled.state !== "scheduled") return;
    automaticAttempts.current.set(attemptKey, {
      ...scheduled,
      state: "in-flight",
    });

    const outcome = await runAction(label, work, options);
    const completed = automaticAttempts.current.get(attemptKey);
    if (!completed) return;
    if (outcome.state === "succeeded") {
      automaticAttempts.current.set(attemptKey, {
        ...completed,
        state: "succeeded",
      });
    } else if (
      outcome.state === "failed"
      && outcome.refreshedPublic
      && !isCurrentAttempt(outcome.refreshedPublic)
    ) {
      automaticAttempts.current.set(attemptKey, {
        ...completed,
        state: "succeeded",
      });
      if (!outcome.recoveryRequired) {
        setRecovery(false);
        setError(null);
      }
    } else if (outcome.state === "skipped") {
      automaticAttempts.current.set(attemptKey, {
        ...completed,
        state: "retryable",
      });
      setAutomaticRevision((revision) => revision + 1);
    } else {
      const failures = completed.failures + 1;
      if (failures < 2) {
        automaticAttempts.current.set(attemptKey, {
          failures,
          state: "retryable",
        });
        setAutomaticRevision((revision) => revision + 1);
      } else {
        automaticAttempts.current.set(attemptKey, {
          failures,
          state: "exhausted",
        });
        setPrivateSnapshot(null);
        setAutomaticSafeExit(true);
        setRecovery(true);
        setError(`${label} could not continue after one retry. Start a new match safely.`);
      }
    }
  }, [runAction, setRecovery]);

  useEffect(() => {
    void Promise.resolve().then(() => refresh(true)).catch((refreshError) => {
      setRecovery(true);
      setError(
        refreshError instanceof RefreshFailure && refreshError.publicMatch
          ? partialRefreshMessage
          : "This local match is no longer available. Refresh it or start a new match.",
      );
    });
  }, [gateway, matchId, refresh, setRecovery]);

  const publicMatch = publicSnapshot?.matchKey === matchKey ? publicSnapshot.value : null;
  const privatePlayer = privateSnapshot?.matchKey === matchKey ? privateSnapshot.value : null;
  const result = resultSnapshot?.matchKey === matchKey ? resultSnapshot.value : null;

  useEffect(() => {
    const attemptsByKey = automaticAttempts.current;
    if (!publicMatch || pendingAction || recoveryRequired) return;
    if (publicMatch.status === "resolving-challenge") {
      const attemptKey = `${matchKey}:settle:${publicMatch.actionSequence}`;
      const prior = attemptsByKey.get(attemptKey);
      if (prior && prior.state !== "retryable") return;
      const failures = prior?.failures ?? 0;
      if (failures >= 2) return;
      attemptsByKey.set(attemptKey, {
        failures,
        state: "scheduled",
      });
      const timer = window.setTimeout(() => {
        void runAutomaticAction(
          attemptKey,
          "Challenge verification",
          () => gateway.settleChallenge(matchId, publicMatch.actionSequence),
          (refreshedPublic) => (
            refreshedPublic.status === "resolving-challenge"
            && refreshedPublic.actionSequence === publicMatch.actionSequence
          ),
          { clearPrivate: true, refreshPrivate: false },
        );
      }, 700);
      return () => {
        window.clearTimeout(timer);
        const current = attemptsByKey.get(attemptKey);
        if (current?.state === "scheduled") {
          attemptsByKey.set(attemptKey, {
            ...current,
            state: "retryable",
          });
        }
      };
    }
    if (publicMatch.status === "active-turn" && publicMatch.activeSeat === 1) {
      const attemptKey = `${matchKey}:robot:${publicMatch.actionSequence}`;
      const prior = attemptsByKey.get(attemptKey);
      if (prior && prior.state !== "retryable") return;
      const failures = prior?.failures ?? 0;
      if (failures >= 2) return;
      attemptsByKey.set(attemptKey, {
        failures,
        state: "scheduled",
      });
      const delay = 800 + Math.floor(Math.random() * 1001);
      const timer = window.setTimeout(() => {
        void runAutomaticAction(
          attemptKey,
          "Robot",
          () => gateway.requestRobotAction(matchId, publicMatch.actionSequence),
          (refreshedPublic) => (
            refreshedPublic.status === "active-turn"
            && refreshedPublic.activeSeat === 1
            && refreshedPublic.actionSequence === publicMatch.actionSequence
          ),
        );
      }, delay);
      return () => {
        window.clearTimeout(timer);
        const current = attemptsByKey.get(attemptKey);
        if (current?.state === "scheduled") {
          attemptsByKey.set(attemptKey, {
            ...current,
            state: "retryable",
          });
        }
      };
    }
  }, [automaticRevision, gateway, matchId, matchKey, pendingAction, publicMatch, recoveryRequired, runAutomaticAction]);

  return {
    publicMatch,
    privatePlayer,
    result,
    pendingAction,
    error,
    recoveryRequired,
    automaticSafeExit,
    refreshAfterError: () => void refreshAfterError(),
    raise: (bid) =>
      void runAction("Raise", () =>
        gateway.raise(matchId, bid, publicMatch?.actionSequence ?? 0)),
    challenge: () =>
      void runAction(
        "Challenge",
        () => gateway.challenge(matchId, publicMatch?.actionSequence ?? 0),
        { clearPrivate: true, refreshPrivate: false },
      ),
    useGadget: (target) =>
      void runAction("Gadget", () =>
        gateway.useGadget(matchId, target, publicMatch?.actionSequence ?? 0)),
    continueMatch: () =>
      void runAction(
        "Next round",
        () => gateway.continueMatch(matchId, publicMatch?.actionSequence ?? 0),
        { clearPrivate: true },
      ),
    rematch: () =>
      void runAction("Rematch", () => gateway.acceptRematch(matchId), { clearPrivate: true }),
  };
}
