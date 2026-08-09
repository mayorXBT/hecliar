export type DieFace = 1 | 2 | 3 | 4 | 5 | 6;
export type DiceCount = 3 | 4 | 5 | 6;
export type Seat = 0 | 1;
export type Mode = "robot" | "friend";
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

export type Deadlines = Readonly<{
  actionDeadline: number;
  abandonmentDeadline: number;
}>;

export type PublicMatchView = Readonly<{
  matchId: bigint;
  mode: Mode;
  status: MatchStatus;
  players: readonly [`0x${string}`, `0x${string}`];
  settings: MatchSettings;
  activeSeat: Seat;
  startingSeat?: Seat;
  bid: Bid | null;
  score: readonly [number, number];
  round: number;
  actionSequence: number;
  deadlines: Deadlines;
  rematchAccepted?: readonly [boolean, boolean];
}>;

export type PrivatePlayerView = Readonly<{
  ownDice: readonly DieFace[];
  gadget: GadgetKind | null;
  scannerResult: boolean | null;
}>;

export type RoundResultView = Readonly<{
  rolls: readonly [readonly DieFace[], readonly DieFace[]];
  bid: Bid;
  baseCount: number;
  effectiveCount: number;
  effects: readonly Readonly<{ owner: Seat; kind: Exclude<GadgetKind, "scanner">; delta: number }>[];
  winner: Seat;
}>;

export interface GameGateway {
  createRobotMatch(settings: MatchSettings): Promise<bigint>;
  createFriendRoom(settings: MatchSettings, roomHash: `0x${string}`): Promise<bigint>;
  joinFriendRoom(roomHash: `0x${string}`): Promise<bigint>;
  setReady(matchId: bigint): Promise<void>;
  getPublicMatch(matchId: bigint): Promise<PublicMatchView>;
  getPrivatePlayer(matchId: bigint): Promise<PrivatePlayerView>;
  getRoundResult(matchId: bigint): Promise<RoundResultView | null>;
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
