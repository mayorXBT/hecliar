import type { PublicMatchView, Seat } from "@hecliar/game-logic";

/**
 * Which seat this player is sitting in.
 *
 * The table used to assume seat 0 throughout, which is always true against the
 * robot and half wrong in a friend match: the host takes seat 0 and the guest
 * seat 1. A guest therefore saw the host's dice labelled as their own, the
 * score the wrong way round, and — worst — "your turn" on the host's turn,
 * which enabled the controls and produced a NotActivePlayer revert.
 *
 * Falls back to seat 0 when there is no wallet, which is the in-memory robot
 * game, where the human really is seat 0.
 */
export function seatOf(
  match: Pick<PublicMatchView, "players">,
  account: `0x${string}` | null,
): Seat {
  if (!account) return 0;
  const me = account.toLowerCase();
  return match.players[1]?.toLowerCase() === me ? 1 : 0;
}

export const otherSeat = (seat: Seat): Seat => (seat === 0 ? 1 : 0);

/**
 * What to call the other side. A human opponent is not a robot, and in a
 * friend room they may be a stranger holding the code rather than a friend.
 */
export const opponentName = (mode: PublicMatchView["mode"]): string =>
  mode === "robot" ? "Robot" : "Opponent";
