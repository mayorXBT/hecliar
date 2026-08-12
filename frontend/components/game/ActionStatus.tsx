import type { MatchStatus, Seat } from "@hecliar/game-logic";
import { StatusPip, type PipTone } from "@/components/ui/StatusPip";

const COPY: Record<MatchStatus, string> = {
  "waiting-for-player": "Waiting for another player",
  "waiting-for-ready": "Waiting for both players to get ready",
  rolling: "Rolling fresh dice",
  "active-turn": "",
  "resolving-challenge": "Verifying the challenge",
  "round-complete": "Round complete",
  "match-complete": "Match complete",
  cancelled: "Match cancelled",
};

const TONE: Record<MatchStatus, PipTone> = {
  "waiting-for-player": "pending",
  "waiting-for-ready": "pending",
  rolling: "pending",
  "active-turn": "idle",
  "resolving-challenge": "pending",
  "round-complete": "verified",
  "match-complete": "verified",
  cancelled: "failed",
};

export function ActionStatus({
  status,
  activeSeat,
}: {
  status: MatchStatus;
  activeSeat: Seat;
}) {
  const yourTurn = status === "active-turn" && activeSeat === 0;
  const message =
    status === "active-turn"
      ? yourTurn
        ? "Your turn — raise or challenge"
        : "Robot is thinking"
      : COPY[status];

  const tone: PipTone =
    status === "active-turn" ? (yourTurn ? "verified" : "pending") : TONE[status];

  return (
    <StatusPip live tone={tone}>
      {message}
    </StatusPip>
  );
}
