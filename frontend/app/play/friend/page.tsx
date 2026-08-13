"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchSettings } from "@hecliar/game-logic";
import { MatchSetup } from "@/components/setup/MatchSetup";
import { generateRoomCode } from "@/lib/room-code";
import {
  persistLastMatch,
  persistLastMode,
  persistRoomCode,
  persistRoomMatch,
} from "@/lib/storage/public-recovery";
import { GameGatewayProvider, useGameGateway, useGatewayState } from "@/hooks/useGameGateway";

function FriendSetup() {
  const gateway = useGameGateway();
  const { unavailable } = useGatewayState();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function create(settings: MatchSettings) {
    if (!gateway) {
      setError(unavailable ?? "No game transport is available.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const { code, hash } = generateRoomCode();
      // The id has to survive the redirect: the room screen uses it to poll,
      // and the host has no other way to recover it from the code alone.
      const created = await gateway.createFriendRoom(settings, hash);
      // Scoped to the room as well, so the room screen recognises this
      // browser as the host of this specific room and not of whichever match
      // it happened to play last.
      persistRoomMatch(code, created);
      persistRoomCode(code);
      persistLastMode("friend");
      persistLastMatch(created);
      router.push(`/room/${code}`);
    } catch (caught) {
      // The local gateway has no friend mode, and telling someone to "try
      // again" when retrying cannot possibly work is worse than saying so.
      const message = caught instanceof Error ? caught.message : "";
      setError(
        /not available in the local/i.test(message)
          ? "Friend mode needs the on-chain transport. Set NEXT_PUBLIC_GAME_TRANSPORT to chain and connect a wallet, or play the robot instead."
          : "Could not create the room. Try again.",
      );
      setCreating(false);
    }
  }

  return (
    <main className="setup-page">
      <MatchSetup mode="friend" onStart={create} />
      {creating && <p className="live-note" aria-live="polite">Creating your private room…</p>}
      {error && <p className="error-note" role="alert">{error}</p>}
    </main>
  );
}

export default function FriendSetupPage() {
  return <GameGatewayProvider mode="friend"><FriendSetup /></GameGatewayProvider>;
}
