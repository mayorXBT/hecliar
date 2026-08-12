"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Read as an external store rather than as state set inside an effect, so
 * nothing renders once and then corrects itself.
 *
 * The server and jsdom have no matchMedia. Both are treated as "reduce",
 * which is the safe default: markup arrives in its settled state and nothing
 * animates before the client has had a chance to say otherwise.
 */

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSnapshot() {
  if (typeof window === "undefined" || !window.matchMedia) return true;
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
  return true;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
