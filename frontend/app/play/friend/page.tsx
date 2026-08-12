"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchSettings } from "@hecliar/game-logic";
import { MatchSetup } from "@/components/setup/MatchSetup";
import { generateRoomCode } from "@/lib/room-code";
import { persistRoomCode, persistLastMode } from "@/lib/storage/public-recovery";
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
      persistRoomCode(code);
      persistLastMode("friend");
      await gateway.createFriendRoom(settings, hash);
      router.push(`/room/${code}`);
    } catch {
      setError("Could not create the room. Try again.");
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
  return <GameGatewayProvider><FriendSetup /></GameGatewayProvider>;
}
