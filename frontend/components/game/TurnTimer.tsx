"use client";

import { useEffect, useState } from "react";
import { clsx } from "clsx";

/**
 * The turn deadline, which `PublicMatchView.deadlines.actionDeadline` has
 * always carried and nothing has ever shown.
 *
 * The two gateways disagree on units: local-game.ts emits milliseconds,
 * chain-gateway.ts passes the raw Solidity block.timestamp in seconds. Until
 * they agree, normalize here — anything below 1e12 cannot be a millisecond
 * timestamp in this century.
 */
function toMillis(deadline: number): number {
  return deadline < 1e12 ? deadline * 1000 : deadline;
}

export function TurnTimer({ deadline, label }: { deadline: number; label: string }) {
  // Not a lazy initializer: reading the clock during render is impure, and
  // it would also produce a server/client mismatch.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const target = toMillis(deadline);
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (remaining === null) return null;

  const seconds = Math.ceil(remaining / 1000);
  const low = seconds <= 10;

  return (
    <span
      aria-label={`${seconds} seconds remaining`}
      className={clsx("hx-timer", low && "is-low")}
    >
      {label} · {seconds}s
    </span>
  );
}
