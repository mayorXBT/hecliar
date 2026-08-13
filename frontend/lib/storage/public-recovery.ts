const KEY_MATCH_ID = "hecliar.last-match-id";
const KEY_ROOM_CODE = "hecliar.last-room-code";
const KEY_MODE = "hecliar.last-mode";
const KEY_ROOM_MATCH = "hecliar.room-match";

export function persistLastMatch(matchId: bigint): void {
  try { sessionStorage.setItem(KEY_MATCH_ID, matchId.toString()); } catch { /* quota or private mode */ }
}

/**
 * A match id remembered against the room it belongs to.
 *
 * The unscoped key is shared by every match this browser has played, so a
 * guest opening a room link while an older id was still in storage would be
 * shown the host's "waiting to start" screen and never be offered Join at
 * all. Keyed by room code, an id from a different room simply does not match.
 */
export function persistRoomMatch(code: string, matchId: bigint): void {
  try { sessionStorage.setItem(`${KEY_ROOM_MATCH}.${code}`, matchId.toString()); } catch {}
}

export function readRoomMatchRaw(code: string): string | null {
  try { return sessionStorage.getItem(`${KEY_ROOM_MATCH}.${code}`); } catch { return null; }
}

/** The raw string, for callers that need a stable snapshot to compare. */
export function readLastMatchRaw(): string | null {
  try { return sessionStorage.getItem(KEY_MATCH_ID); } catch { return null; }
}

export function readLastMatch(): bigint | null {
  try {
    const raw = sessionStorage.getItem(KEY_MATCH_ID);
    return raw ? BigInt(raw) : null;
  } catch { return null; }
}

export function persistRoomCode(code: string): void {
  try { sessionStorage.setItem(KEY_ROOM_CODE, code); } catch {}
}

export function readRoomCode(): string | null {
  try { return sessionStorage.getItem(KEY_ROOM_CODE); } catch { return null; }
}

export function persistLastMode(mode: "robot" | "friend"): void {
  try { sessionStorage.setItem(KEY_MODE, mode); } catch {}
}

export function readLastMode(): "robot" | "friend" | null {
  try {
    const raw = sessionStorage.getItem(KEY_MODE);
    if (raw === "robot" || raw === "friend") return raw;
    return null;
  } catch { return null; }
}

export function clearRecoveryState(): void {
  try {
    sessionStorage.removeItem(KEY_MATCH_ID);
    sessionStorage.removeItem(KEY_ROOM_CODE);
    sessionStorage.removeItem(KEY_MODE);
  } catch {}
}
