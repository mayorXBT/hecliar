"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { keccak256, toHex } from "viem";
import { normalizeRoomCode, isValidRoomCode } from "@/lib/room-code";
import { GameGatewayProvider, useGameGateway, useGatewayState } from "@/hooks/useGameGateway";

function RoomPage() {
  const gateway = useGameGateway();
  const { unavailable } = useGatewayState();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const normalized = normalizeRoomCode(rawCode ?? "");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isValidRoomCode(normalized)) {
      setError("Invalid room code. Codes are 8 characters long.");
    }
  }, [normalized]);

  async function join() {
    if (!gateway) {
      setError(unavailable ?? "No game transport is available.");
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const roomHash = keccak256(toHex(normalized));
      const matchId = await gateway.joinFriendRoom(roomHash);
      router.push(`/match/${matchId}`);
    } catch {
      setError("Could not join the room. It may be full, expired, or no longer accepting players.");
      setJoining(false);
    }
  }

  return (
    <main className="setup-page">
      <h2>Join a Private Room</h2>
      <div className="room-code-display">
        <span className="room-code">{normalized}</span>
      </div>
      {error && <p className="error-note" role="alert">{error}</p>}
      {!error && (
        <>
          <p className="sub-copy">Review the host&apos;s dice and gadget settings before joining.</p>
          <button
            className="primary-action"
            disabled={joining || !isValidRoomCode(normalized)}
            onClick={join}
          >
            {joining ? "Joining…" : "Join Room"}
          </button>
        </>
      )}
      <Link className="secondary-action" href="/play/friend">Back</Link>
    </main>
  );
}

export default function RoomJoinPage() {
  return <GameGatewayProvider><RoomPage /></GameGatewayProvider>;
}
