const KEY_MATCH_ID = "hecliar.last-match-id";
const KEY_ROOM_CODE = "hecliar.last-room-code";
const KEY_MODE = "hecliar.last-mode";

export function persistLastMatch(matchId: bigint): void {
  try { sessionStorage.setItem(KEY_MATCH_ID, matchId.toString()); } catch { /* quota or private mode */ }
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
