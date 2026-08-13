"use client";

import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { PublicMatchView } from "@hecliar/game-logic";
import { ButtonLink } from "@/components/ui/Button";
import { GameGatewayProvider, useGameGateway, useGatewayState } from "@/hooks/useGameGateway";
import { isValidRoomCode, normalizeRoomCode, roomHashFromCode } from "@/lib/room-code";
import { persistLastMatch, persistLastMode, readLastMatchRaw } from "@/lib/storage/public-recovery";

/**
 * The room, for whoever opens it.
 *
 * The host arrives already holding a match id, persisted when the room was
 * created. A guest arrives with only the code and has to join first. After
 * that both sides are in the same state and see the same thing, so this is one
 * screen rather than two.
 *
 * Polling is deliberate: the other player acts in another browser, and the
 * only shared source of truth is the chain.
 */

const POLL_MS = 3000;

/** The stored id only changes when this tab writes it, and every writer also
 *  sets state, so there is nothing external to subscribe to. */
const subscribeToNothing = () => () => undefined;
const readStoredMatchId = () => readLastMatchRaw();

function RoomScreen() {
  const gateway = useGameGateway();
  const { unavailable, transport } = useGatewayState();
  const router = useRouter();
  const params = useParams<{ code: string }>();

  const rawCode = Array.isArray(params.code) ? params.code[0] : params.code;
  const code = normalizeRoomCode(rawCode ?? "");
  const valid = isValidRoomCode(code);

  const [joinedMatchId, setJoinedMatchId] = useState<bigint | null>(null);
  const [match, setMatch] = useState<PublicMatchView | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [readied, setReadied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  // The host's id survives the redirect from room creation; a guest has none
  // until they join.
  //
  // Read as an external store rather than as state set from an effect. The
  // server has no sessionStorage, so the server snapshot is null and the
  // client picks the id up on hydration without a mismatch and without a
  // render that shows the wrong screen.
  const storedMatchId = useSyncExternalStore(
    subscribeToNothing,
    readStoredMatchId,
    () => null,
  );
  const matchId = joinedMatchId ?? (storedMatchId === null ? null : BigInt(storedMatchId));

  const refresh = useCallback(async () => {
    if (!gateway || matchId === null) return;
    try {
      setMatch(await gateway.getPublicMatch(matchId));
    } catch {
      // A stale read against a lagging node is not worth surfacing; the next
      // poll will correct it.
    }
  }, [gateway, matchId]);

  useEffect(() => {
    if (matchId === null) return;
    // The first read is scheduled rather than called inline so the effect does
    // not set state during the render it was committed from.
    const first = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [matchId, refresh]);

  // Both ready means the dice have been dealt, and the table is where the
  // match continues.
  useEffect(() => {
    if (match?.status === "active-turn" && matchId !== null) {
      router.push(`/match/${matchId}`);
    }
  }, [match?.status, matchId, router]);

  async function run(label: string, work: () => Promise<void>) {
    if (busy.current) return;
    if (!gateway) {
      setError(unavailable ?? "No game transport is available.");
      return;
    }
    busy.current = true;
    setPending(label);
    setError(null);
    try {
      await work();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "";
      setError(
        /RoomNotFound/.test(message) ? "No room with that code. Check it and try again."
        : /RoomFull/.test(message) ? "That room already has two players."
        : /SameWallet/.test(message) ? "You created this room — open it in the other browser to join."
        : /RoomExpired/.test(message) ? "That room has expired. Ask for a new code."
        : `Could not ${label.toLowerCase()}. Try again.`,
      );
    } finally {
      busy.current = false;
      setPending(null);
    }
  }

  const join = () =>
    run("Join", async () => {
      const joined = await gateway!.joinFriendRoom(roomHashFromCode(code));
      persistLastMatch(joined);
      persistLastMode("friend");
      setJoinedMatchId(joined);
    });

  const ready = () =>
    run("Ready up", async () => {
      await gateway!.setReady(matchId!);
      setReadied(true);
      await refresh();
    });

  if (!valid) {
    return (
      <main className="setup-page">
        <p className="error-note" role="alert">
          That is not a valid room code. Codes are 12 characters.
        </p>
        <ButtonLink href="/play/friend">Create a room instead</ButtonLink>
      </main>
    );
  }

  const status = match?.status;
  const waitingForGuest = status === "waiting-for-player";
  const canReady = status === "waiting-for-ready" && !readied;

  return (
    <main className="setup-page">
      <section className="waiting-room" aria-live="polite">
        <p className="eyebrow">Private room</p>
        <h2>{matchId === null ? "Join this room" : "Waiting to start"}</h2>

        <div className="room-code-display">
          <span className="label">Room code</span>
          <span className="room-code">{code}</span>
        </div>

        {match && (
          <div className="room-settings">
            <span>{match.settings.diceCount} dice per side</span>
            <span>{match.settings.gadgetsEnabled ? "Gadgets on" : "No gadgets"}</span>
            {transport === "chain" && <span>Base Sepolia</span>}
          </div>
        )}

        <p className="quiet-note">
          {matchId === null
            ? "Joining puts you in seat two. The host is already waiting."
            : waitingForGuest
              ? "Share the code with one other person. They join by opening this page."
              : canReady
                ? transport === "chain"
                  ? "Readying up deals your dice and pays for them. Both players must ready before the match starts."
                  : "Both players must ready before the match starts."
                : readied
                  ? "You are ready. Waiting for the other player."
                  : "Getting the room…"}
        </p>

        <div className="room-actions">
          {matchId === null ? (
            <button className="primary-action" type="button" disabled={Boolean(pending)} onClick={join}>
              {pending ? "Joining…" : "Join room"}
            </button>
          ) : (
            <button
              className="primary-action"
              type="button"
              disabled={Boolean(pending) || !canReady}
              onClick={ready}
            >
              {pending ? "Confirming…" : readied ? "Ready" : "I'm ready"}
            </button>
          )}
          <ButtonLink href="/">Leave</ButtonLink>
        </div>

        {error && <p className="error-note" role="alert">{error}</p>}
      </section>
    </main>
  );
}

export default function RoomJoinPage() {
  return (
    <GameGatewayProvider>
      <RoomScreen />
    </GameGatewayProvider>
  );
}
