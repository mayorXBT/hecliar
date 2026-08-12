"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MatchSettings } from "@hecliar/game-logic";
import { MatchSetup } from "@/components/setup/MatchSetup";
import { persistLastMatch } from "@/lib/storage/public-recovery";
import { GameGatewayProvider, useGameGateway, useGatewayState } from "@/hooks/useGameGateway";

function RobotSetup() {
  const gateway = useGameGateway();
  const { unavailable } = useGatewayState();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  async function start(settings: MatchSettings) {
    if (!gateway) { setError(unavailable ?? "No game transport is available."); return; }
    setStarting(true); setError(null);
    try {
      const id = await gateway.createRobotMatch(settings);
      persistLastMatch(id);
      router.push(`/match/${id}`);
    } catch { setError("Could not start the match. Try again."); setStarting(false); }
  }
  return <main className="setup-page"><MatchSetup mode="robot" onStart={start} />{starting && <p className="live-note" aria-live="polite">Setting the table...</p>}{error && <p className="error-note" role="alert">{error}</p>}</main>;
}

export default function RobotSetupPage() { return <GameGatewayProvider><RobotSetup /></GameGatewayProvider>; }
