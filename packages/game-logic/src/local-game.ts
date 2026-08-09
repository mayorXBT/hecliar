import { legalRaises } from "./bids";
import { resolveChallenge, applyRoundWin, type AppliedGadget } from "./resolution";
import { chooseRobotAction, isLegalRobotAction, SeededRandom, type RobotAction } from "./robot";
import type {
  Bid,
  DieFace,
  Difficulty,
  GameGateway,
  GadgetKind,
  MatchSettings,
  PrivatePlayerView,
  PublicMatchView,
  RoundResultView,
  Seat,
} from "./types";

const HUMAN = "0x0000000000000000000000000000000000000001" as const;
const ROBOT = "0x0000000000000000000000000000000000000002" as const;
const ROUND_DURATION_MS = 45_000;
const ABANDONMENT_MS = 120_000;

type LocalSecret = {
  rolls: [DieFace[], DieFace[]];
  gadget: [GadgetKind | null, GadgetKind | null];
  scannerResult: [boolean | null, boolean | null];
  gadgetUsed: [boolean, boolean];
  gadgetTarget: [number | null, number | null];
};

type LocalRecord = {
  publicView: PublicMatchView;
  secret: LocalSecret;
  result: RoundResultView | null;
  random: SeededRandom;
};

export type LocalGameOptions = Readonly<{
  rolls?: readonly (readonly DieFace[])[];
  gadgets?: readonly (readonly [GadgetKind, GadgetKind])[];
  robotActions?: readonly RobotAction[];
}>;

function clonePublic(view: PublicMatchView): PublicMatchView {
  return {
    ...view,
    settings: { ...view.settings },
    players: [...view.players] as PublicMatchView["players"],
    bid: view.bid ? { ...view.bid } : null,
    score: [...view.score] as [number, number],
    deadlines: { ...view.deadlines },
  };
}

function clonePrivate(view: PrivatePlayerView): PrivatePlayerView {
  return { ownDice: [...view.ownDice], gadget: view.gadget, scannerResult: view.scannerResult };
}

function cloneResult(result: RoundResultView | null): RoundResultView | null {
  if (!result) return null;
  return {
    ...result,
    bid: { ...result.bid },
    rolls: [Array.from(result.rolls[0]), Array.from(result.rolls[1])],
    effects: result.effects.map((effect) => ({ ...effect })),
  };
}

function isDieFace(value: number): value is DieFace {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

export class LocalGameGateway implements GameGateway {
  private readonly records = new Map<bigint, LocalRecord>();
  private readonly rolls: DieFace[][];
  private readonly gadgets: [GadgetKind, GadgetKind][];
  private readonly robotActions: RobotAction[];
  private nextMatchId = BigInt(1);

  constructor(options: LocalGameOptions = {}) {
    this.rolls = (options.rolls ?? []).map((roll) => {
      if (!roll.every(isDieFace)) throw new RangeError("test rolls must contain die faces from 1 through 6");
      return [...roll];
    });
    this.gadgets = (options.gadgets ?? []).map((pair) => [...pair] as [GadgetKind, GadgetKind]);
    this.robotActions = [...(options.robotActions ?? [])];
  }

  async createRobotMatch(settings: MatchSettings): Promise<bigint> {
    if (settings.mode !== "robot") throw new Error("local gateway creates Robot matches only");
    const matchId = this.nextMatchId;
    this.nextMatchId += BigInt(1);
    const now = Date.now();
    const record: LocalRecord = {
      publicView: {
        matchId,
        mode: "robot",
        status: "active-turn",
        players: [HUMAN, ROBOT],
        settings: { ...settings },
        activeSeat: 0,
        startingSeat: 0,
        bid: null,
        score: [0, 0],
        round: 1,
        actionSequence: 0,
        deadlines: { actionDeadline: now + ROUND_DURATION_MS, abandonmentDeadline: now + ABANDONMENT_MS },
        rematchAccepted: [false, false],
      },
      secret: this.createSecret(settings),
      result: null,
      random: new SeededRandom(Number(matchId)),
    };
    this.records.set(matchId, record);
    return matchId;
  }

  async createFriendRoom(): Promise<bigint> { throw new Error("Friend mode is not available in the local Robot slice"); }
  async joinFriendRoom(): Promise<bigint> { throw new Error("Friend mode is not available in the local Robot slice"); }
  async setReady(): Promise<void> { throw new Error("Friend mode is not available in the local Robot slice"); }
  async claimTurnTimeout(): Promise<void> { throw new Error("timeouts are not available in the local Robot slice"); }
  async claimAbandonment(): Promise<void> { throw new Error("abandonment is not available in the local Robot slice"); }

  async getPublicMatch(matchId: bigint): Promise<PublicMatchView> {
    return clonePublic(this.record(matchId).publicView);
  }

  async getPrivatePlayer(matchId: bigint): Promise<PrivatePlayerView> {
    const secret = this.record(matchId).secret;
    return clonePrivate({ ownDice: secret.rolls[0], gadget: secret.gadgetUsed[0] ? null : secret.gadget[0], scannerResult: secret.scannerResult[0] });
  }

  async getRoundResult(matchId: bigint): Promise<RoundResultView | null> {
    return cloneResult(this.record(matchId).result);
  }

  async raise(matchId: bigint, bid: Omit<Bid, "bidder" | "sequence">, expectedSequence: number): Promise<void> {
    const record = this.readyRecord(matchId, expectedSequence);
    if (!legalRaises(record.publicView.bid, record.publicView.settings.diceCount)
      .some((candidate) => candidate.quantity === bid.quantity && candidate.face === bid.face)) {
      throw new RangeError("bid is not a legal raise");
    }
    record.publicView = {
      ...record.publicView,
      bid: { ...bid, bidder: record.publicView.activeSeat, sequence: expectedSequence + 1 },
      activeSeat: this.other(record.publicView.activeSeat),
      actionSequence: expectedSequence + 1,
      deadlines: this.deadlines(),
    };
  }

  async challenge(matchId: bigint, expectedSequence: number): Promise<void> {
    const record = this.readyRecord(matchId, expectedSequence);
    const bid = record.publicView.bid;
    if (!bid) throw new Error("cannot challenge before an opening bid");
    const resolution = resolveChallenge(record.secret.rolls, bid, this.appliedGadgets(record));
    record.result = { rolls: [Array.from(record.secret.rolls[0]), Array.from(record.secret.rolls[1])], bid, ...resolution };
    record.publicView = {
      ...record.publicView,
      status: "resolving-challenge",
      actionSequence: expectedSequence + 1,
      deadlines: this.deadlines(),
    };
  }

  async settleChallenge(matchId: bigint, expectedSequence: number): Promise<void> {
    const record = this.record(matchId);
    if (record.publicView.status !== "resolving-challenge") throw new Error("match is not resolving a challenge");
    this.expectSequence(record, expectedSequence);
    if (!record.result) throw new Error("challenge result is unavailable");
    const settled = applyRoundWin(record.publicView.score, record.result.winner);
    record.publicView = {
      ...record.publicView,
      score: settled.score,
      status: settled.matchWinner === null ? "round-complete" : "match-complete",
      actionSequence: expectedSequence + 1,
      deadlines: this.deadlines(),
    };
  }

  async continueMatch(matchId: bigint, expectedSequence: number): Promise<void> {
    const record = this.record(matchId);
    if (record.publicView.status !== "round-complete") throw new Error("round is not complete");
    this.expectSequence(record, expectedSequence);
    const startingSeat = this.other(record.publicView.startingSeat ?? 0);
    record.secret = this.createSecret(record.publicView.settings);
    record.result = null;
    record.publicView = {
      ...record.publicView,
      status: "active-turn",
      startingSeat,
      activeSeat: startingSeat,
      bid: null,
      round: record.publicView.round + 1,
      actionSequence: expectedSequence + 1,
      deadlines: this.deadlines(),
    };
  }

  async requestRobotAction(matchId: bigint, expectedSequence: number): Promise<void> {
    const record = this.readyRecord(matchId, expectedSequence);
    if (record.publicView.activeSeat !== 1) throw new Error("robot is not active");
    const action = this.robotActions.shift() ?? chooseRobotAction({
      matchId,
      difficulty: (record.publicView.settings.difficulty ?? "easy") as Difficulty,
      ownDice: record.secret.rolls[1],
      dicePerSide: record.publicView.settings.diceCount,
      currentBid: record.publicView.bid,
      publicHistory: [],
      scores: record.publicView.score,
      gadget: record.secret.gadget[1] ? { kind: record.secret.gadget[1], used: record.secret.gadgetUsed[1] } : null,
      random: record.random,
    });
    if (!isLegalRobotAction({
      matchId,
      difficulty: (record.publicView.settings.difficulty ?? "easy") as Difficulty,
      ownDice: record.secret.rolls[1], dicePerSide: record.publicView.settings.diceCount,
      currentBid: record.publicView.bid, publicHistory: [], scores: record.publicView.score,
      gadget: record.secret.gadget[1] ? { kind: record.secret.gadget[1], used: record.secret.gadgetUsed[1] } : null,
      random: record.random,
    }, action)) throw new Error("robot selected an illegal action");
    if (action.type === "raise") return this.raise(matchId, action.bid, expectedSequence);
    if (action.type === "challenge") return this.challenge(matchId, expectedSequence);
    return this.useGadgetAs(record, 1, action.target, expectedSequence);
  }

  async useGadget(matchId: bigint, target: number, expectedSequence: number): Promise<void> {
    const record = this.readyRecord(matchId, expectedSequence);
    return this.useGadgetAs(record, record.publicView.activeSeat, target, expectedSequence);
  }

  async acceptRematch(matchId: bigint): Promise<void> {
    const record = this.record(matchId);
    if (record.publicView.status !== "match-complete") throw new Error("match is not complete");
    record.secret = this.createSecret(record.publicView.settings);
    record.result = null;
    record.publicView = {
      ...record.publicView,
      status: "active-turn",
      activeSeat: 0,
      startingSeat: 0,
      bid: null,
      score: [0, 0],
      round: 1,
      actionSequence: record.publicView.actionSequence + 1,
      deadlines: this.deadlines(),
      rematchAccepted: [true, true],
    };
  }

  private record(matchId: bigint): LocalRecord {
    const record = this.records.get(matchId);
    if (!record) throw new Error("match was not found");
    return record;
  }

  private readyRecord(matchId: bigint, expectedSequence: number): LocalRecord {
    const record = this.record(matchId);
    if (record.publicView.status !== "active-turn") throw new Error("match is not accepting actions");
    this.expectSequence(record, expectedSequence);
    return record;
  }

  private expectSequence(record: LocalRecord, expectedSequence: number): void {
    if (record.publicView.actionSequence !== expectedSequence) throw new Error("action sequence is stale");
  }

  private createSecret(settings: MatchSettings): LocalSecret {
    const rolls: [DieFace[], DieFace[]] = [this.nextRoll(settings.diceCount), this.nextRoll(settings.diceCount)];
    const gadgets = settings.gadgetsEnabled
      ? this.gadgets.shift() ?? [this.randomGadget(), this.randomGadget()] as [GadgetKind, GadgetKind]
      : [null, null] as [null, null];
    return { rolls, gadget: gadgets, scannerResult: [null, null], gadgetUsed: [false, false], gadgetTarget: [null, null] };
  }

  private nextRoll(count: number): DieFace[] {
    const queued = this.rolls.shift();
    if (queued) {
      if (queued.length !== count) throw new RangeError(`queued roll must contain exactly ${count} dice`);
      return queued;
    }
    const values = new Uint32Array(count);
    crypto.getRandomValues(values);
    return Array.from(values, (value) => ((value % 6) + 1) as DieFace);
  }

  private randomGadget(): GadgetKind {
    const values: GadgetKind[] = ["echo", "jammer", "scanner"];
    const entropy = new Uint32Array(1);
    crypto.getRandomValues(entropy);
    return values[entropy[0] % values.length];
  }

  private appliedGadgets(record: LocalRecord): AppliedGadget[] {
    return ([0, 1] as const).flatMap((seat) => {
      const kind = record.secret.gadget[seat];
      const target = record.secret.gadgetTarget[seat];
      if (!record.secret.gadgetUsed[seat] || !kind || kind === "scanner" || target === null) return [];
      return [{ owner: seat, kind, target }];
    });
  }

  private async useGadgetAs(record: LocalRecord, seat: Seat, target: number, expectedSequence: number): Promise<void> {
    const gadget = record.secret.gadget[seat];
    if (!record.publicView.settings.gadgetsEnabled || !gadget) throw new Error("gadgets are disabled");
    if (record.secret.gadgetUsed[seat]) throw new Error("gadget was already used this round");
    if (!Number.isInteger(target) || target < 0 || target >= record.publicView.settings.diceCount) throw new RangeError("gadget target is out of range");
    if (gadget === "scanner" && !record.publicView.bid) throw new Error("scanner requires an opening bid");
    record.secret.gadgetUsed[seat] = true;
    record.secret.gadgetTarget[seat] = target;
    if (gadget === "scanner") {
      const bid = record.publicView.bid!;
      record.secret.scannerResult[seat] = record.secret.rolls.flat().filter((die) => die === bid.face).length >= bid.quantity;
    }
    record.publicView = {
      ...record.publicView,
      activeSeat: this.other(seat),
      actionSequence: expectedSequence + 1,
      deadlines: this.deadlines(),
    };
  }

  private deadlines() {
    const now = Date.now();
    return { actionDeadline: now + ROUND_DURATION_MS, abandonmentDeadline: now + ABANDONMENT_MS };
  }

  private other(seat: Seat): Seat { return seat === 0 ? 1 : 0; }
}
