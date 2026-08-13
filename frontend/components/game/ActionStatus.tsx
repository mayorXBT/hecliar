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
  mySeat = 0,
  opponent = "Robot",
}: {
  status: MatchStatus;
  activeSeat: Seat;
  /** Seat 0 against the robot; the guest of a friend room sits in seat 1. */
  mySeat?: Seat;
  opponent?: string;
}) {
  const yourTurn = status === "active-turn" && activeSeat === mySeat;
  // "Robot is thinking" in a friend match named the wrong opponent and, worse,
  // was decided by a seat check that a guest always failed.
  const message =
    status === "active-turn"
      ? yourTurn
        ? "Your turn — raise or challenge"
        : `${opponent} is thinking`
      : COPY[status];

  const tone: PipTone =
    status === "active-turn" ? (yourTurn ? "verified" : "pending") : TONE[status];

  return (
    <StatusPip live tone={tone}>
      {message}
    </StatusPip>
  );
}
