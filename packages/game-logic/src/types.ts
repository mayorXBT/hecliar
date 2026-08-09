export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceCount = 3 | 4 | 5 | 6;
export type Seat = 0 | 1;
export type Difficulty = "easy" | "medium" | "hard";
export type MatchStatus =
  | "waiting-for-player"
  | "waiting-for-ready"
  | "rolling"
  | "active-turn"
  | "resolving-challenge"
  | "round-complete"
  | "match-complete"
  | "cancelled";
export type GadgetKind = "echo" | "jammer" | "scanner";

export type Bid = Readonly<{
  quantity: number;
  face: DieFace;
  bidder: Seat;
  sequence: number;
}>;

export type MatchSettings = Readonly<{
  diceCount: DiceCount;
  gadgetsEnabled: boolean;
  mode: "robot" | "friend";
  difficulty?: Difficulty;
}>;

export type PublicMatchView = Readonly<{
  matchId: bigint;
  status: MatchStatus;
  players: readonly [`0x${string}`, `0x${string}`];
  settings: MatchSettings;
  activeSeat: Seat;
  startingSeat: Seat;
  currentBid: Bid | null;
  score: readonly [number, number];
  round: number;
  actionSequence: number;
  actionDeadline: number;
  abandonmentDeadline: number;
  rematchAccepted: readonly [boolean, boolean];
}>;

export type PrivatePlayerView = Readonly<{
  ownDice: readonly DieFace[];
  gadget: GadgetKind | null;
  scannerResult: boolean | null;
}>;

export interface GameGateway {
  createRobotMatch(settings: MatchSettings): Promise<bigint>;
  createFriendRoom(settings: MatchSettings, roomHash: `0x${string}`): Promise<bigint>;
  joinFriendRoom(roomHash: `0x${string}`): Promise<bigint>;
  setReady(matchId: bigint): Promise<void>;
  getPublicMatch(matchId: bigint): Promise<PublicMatchView>;
  getPrivatePlayer(matchId: bigint): Promise<PrivatePlayerView>;
  raise(matchId: bigint, bid: Omit<Bid, "bidder" | "sequence">, expectedSequence: number): Promise<void>;
  challenge(matchId: bigint, expectedSequence: number): Promise<void>;
  useGadget(matchId: bigint, target: number, expectedSequence: number): Promise<void>;
  settleChallenge(matchId: bigint, expectedSequence: number): Promise<void>;
  continueMatch(matchId: bigint, expectedSequence: number): Promise<void>;
  requestRobotAction(matchId: bigint, expectedSequence: number): Promise<void>;
  claimTurnTimeout(matchId: bigint, expectedSequence: number): Promise<void>;
  claimAbandonment(matchId: bigint, expectedSequence: number): Promise<void>;
  acceptRematch(matchId: bigint): Promise<void>;
}
