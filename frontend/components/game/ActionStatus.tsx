import type { MatchStatus, Seat } from "@hecliar/game-logic";

const copy: Record<MatchStatus, string> = {
  "waiting-for-player": "Waiting for another player",
  "waiting-for-ready": "Waiting for both players to get ready",
  rolling: "Rolling fresh dice",
  "active-turn": "",
  "resolving-challenge": "Verifying the challenge",
  "round-complete": "Round complete",
  "match-complete": "Match complete",
  cancelled: "Match cancelled",
};

export function ActionStatus({ status, activeSeat }: { status: MatchStatus; activeSeat: Seat }) {
  const message = status === "active-turn" ? (activeSeat === 0 ? "Your turn — raise or challenge" : "Robot is thinking") : copy[status];
  return <section className="action-status" aria-live="polite"><span className={status === "resolving-challenge" ? "status-dot pending" : "status-dot"} />{message}</section>;
}
