"use client";

import type { GameGateway } from "@hecliar/game-logic";
import { ButtonLink } from "@/components/ui/Button";
import { useGatewayState } from "@/hooks/useGameGateway";
import { MatchView } from "./MatchView";

/**
 * Route guards, and nothing else. The state machine lives in
 * hooks/useMatchLifecycle and the rendering in MatchView.
 */

function parseMatchId(rawMatchId: string | string[] | undefined): bigint | null {
  if (typeof rawMatchId !== "string" || !/^[1-9]\d*$/.test(rawMatchId)) return null;
  try {
    return BigInt(rawMatchId);
  } catch {
    return null;
  }
}

function Blocked({ message }: { message: string }) {
  return (
    <main className="match-page">
      <p className="error-note" role="alert">
        {message}
      </p>
      <ButtonLink href="/play/robot" variant="primary">
        Start a new match
      </ButtonLink>
    </main>
  );
}

export function MatchScreen({
  gateway,
  rawMatchId,
  account,
}: {
  gateway: GameGateway | null;
  rawMatchId: string | string[] | undefined;
  /** Overrides the connected address. Injected alongside `gateway` in tests. */
  account?: `0x${string}` | null;
}) {
  const matchId = parseMatchId(rawMatchId);
  // Says which transport is missing and what to do about it, rather than
  // blaming local play when the real problem is a disconnected wallet.
  const { unavailable } = useGatewayState();

  if (matchId === null) {
    return <Blocked message="This is an invalid match link." />;
  }

  if (!gateway) {
    return <Blocked message={unavailable ?? "No game transport is available."} />;
  }

  const matchKey = matchId.toString();
  // Keyed so a changed match ID remounts the lifecycle rather than leaking
  // the previous match's snapshots into the new one.
  return (
    <MatchView
      accountOverride={account}
      gateway={gateway}
      key={matchKey}
      matchId={matchId}
      matchKey={matchKey}
    />
  );
}
