import { toHex, type Hex } from "viem";
import { type GameGateway, type Bid, type DieFace, type DiceCount, type GadgetKind, type MatchSettings, type PrivatePlayerView, type PublicMatchView, type RoundResultView, type Seat } from "@hecliar/game-logic";
import { getIncoLightning } from "@/lib/network";
import {
  nonZero,
  packSettlement,
  withCovalidatorRetry,
  type Attestation,
  type ChallengeHandles,
} from "./attestation";

// enum GadgetKind { Echo, Jammer, Scanner } in HecliarTypes.sol.
const GADGET_KINDS: readonly GadgetKind[] = ["echo", "jammer", "scanner"];

type LightningLike = {
  attestedDecrypt(walletClient: unknown, handles: Hex[]): Promise<readonly Attestation[]>;
  attestedReveal(handles: Hex[]): Promise<readonly Attestation[]>;
};

const ROBOT_ADDRESS = (process.env.NEXT_PUBLIC_ROBOT_ADDRESS ?? "0x0000000000000000000000000000000000000003") as `0x${string}`;

type ContractWrite = {
  write: {
    createRoom(args: [Hex, number, boolean, bigint], opts: { account: `0x${string}` }): Promise<bigint>;
    joinRoom(args: [Hex], opts: { account: `0x${string}` }): Promise<bigint>;
    setReady(args: [bigint], opts: { account: `0x${string}`; value: bigint }): Promise<void>;
    createRobotMatch(args: [number, boolean, `0x${string}`], opts: { account: `0x${string}`; value: bigint }): Promise<bigint>;
    raise(args: [bigint, number, number, number], opts: { account: `0x${string}` }): Promise<void>;
    challenge(args: [bigint, number], opts: { account: `0x${string}` }): Promise<void>;
    settleChallenge(args: [bigint, object, number], opts: { account: `0x${string}` }): Promise<void>;
    fundAndStartNextRound(args: [bigint, number], opts: { account: `0x${string}`; value: bigint }): Promise<void>;
    useGadget(args: [bigint, Hex, number], opts: { account: `0x${string}` }): Promise<void>;
    claimTurnTimeout(args: [bigint, number], opts: { account: `0x${string}` }): Promise<void>;
    claimAbandonment(args: [bigint, number], opts: { account: `0x${string}` }): Promise<void>;
    acceptRematch(args: [bigint], opts: { account: `0x${string}` }): Promise<void>;
  };
  read: {
    getPublicMatch(args: [bigint]): Promise<unknown>;
    // Every field is a handle, including scannerResult, which is an ebool.
    getMyRoundHandles(args: [bigint], opts: { account: `0x${string}` }): Promise<{ dice: readonly Hex[]; gadget: Hex; gadgetTarget: Hex; scannerResult: Hex }>;
    getChallengeHandles(args: [bigint]): Promise<ChallengeHandles>;
    requiredSeatFee(args: [number, boolean]): Promise<bigint>;
    getRoundResult(args: [bigint, number]): Promise<unknown>;
    requiredRoundFee(args: [number, boolean]): Promise<bigint>;
  };
  address: Hex;
};

function decodeResult(raw: Record<string, unknown>, diceCount: number): RoundResultView {
  const rolls = raw.revealedRolls as [readonly number[], readonly number[]];
  const bidRaw = raw.challengedBid as Record<string, unknown>;
  return {
    rolls: [
      rolls[0].slice(0, diceCount).map(Number) as DieFace[],
      rolls[1].slice(0, diceCount).map(Number) as DieFace[],
    ],
    bid: {
      quantity: Number(bidRaw.quantity),
      face: Number(bidRaw.face) as DieFace,
      bidder: Number(bidRaw.bidderSeat) as Seat,
      sequence: Number(bidRaw.sequence),
    },
    baseCount: Number(raw.baseCount),
    effectiveCount: Number(raw.effectiveCount),
    // RoundResult does not carry a per-gadget breakdown, so this stays empty.
    // It is correct whenever gadgets are disabled, which is the default; with
    // gadgets on, the difference is still visible as effectiveCount - baseCount.
    effects: [],
    winner: Number(raw.winnerSeat) as Seat,
  };
}

function decodePublic(raw: Record<string, unknown>): PublicMatchView {
  const players = raw.players as [`0x${string}`, `0x${string}`];
  const bidRaw = raw.currentBid as Record<string, unknown> | null;
  const bid = bidRaw && Number(bidRaw.quantity) > 0 ? {
    quantity: Number(bidRaw.quantity),
    face: Number(bidRaw.face) as DieFace,
    bidder: Number(bidRaw.bidderSeat) as Seat,
    sequence: Number(bidRaw.sequence),
  } : null;
  const settings: MatchSettings = {
    mode: Number(raw.mode) === 0 ? "robot" : "friend",
    diceCount: Number(raw.diceCount) as DiceCount,
    gadgetsEnabled: Boolean(raw.gadgetsEnabled),
  };
  return {
    matchId: BigInt(raw.matchId as string | number ?? BigInt(0)),
    mode: settings.mode,
    status: ["waiting-for-player", "waiting-for-ready", "rolling", "active-turn", "resolving-challenge", "round-complete", "match-complete", "cancelled"][Number(raw.status)] as PublicMatchView["status"],
    players,
    settings,
    activeSeat: Number(raw.activeSeat) as Seat,
    startingSeat: Number(raw.startingSeat) as Seat,
    bid,
    score: [Number((raw.score as [number, number])[0]), Number((raw.score as [number, number])[1])],
    round: Number(raw.roundNumber),
    actionSequence: Number(raw.actionSequence),
    deadlines: { actionDeadline: Number(raw.actionDeadline), abandonmentDeadline: Number(raw.abandonmentDeadline) },
    rematchAccepted: [false, false] as readonly [boolean, boolean],
  };
}

export class ChainGameGateway implements GameGateway {
  private readonly onFee?: (amount: bigint) => Promise<void>;
  private readonly walletClient?: unknown;
  private readonly lightning: () => Promise<LightningLike>;
  /**
   * The last decryption, keyed by the handles it was for.
   *
   * attestedDecrypt is signed by the wallet, so every call is a prompt the
   * player has to answer. Handles change when new dice are dealt and not
   * otherwise, which makes them an exact cache key: the same handles can only
   * ever decrypt to the same faces. Without this, anything that reads the
   * player's hand twice asks them to sign twice.
   */
  private decrypted: { key: string; view: PrivatePlayerView } | null = null;

  /**
   * `walletClient` is required for anything confidential. attestedDecrypt has
   * to be signed by the owner of the handles — that signature is what proves
   * to the covalidator that this caller may read these dice, and it is why an
   * opponent cannot read them. Without it the gateway still runs the public
   * game, but getPrivatePlayer returns no dice.
   */
  constructor(
    private readonly contract: ContractWrite,
    private readonly account: `0x${string}`,
    options: {
      onFee?: (amount: bigint) => Promise<void>;
      walletClient?: unknown;
      lightning?: () => Promise<LightningLike>;
    } = {},
  ) {
    this.onFee = options.onFee;
    this.walletClient = options.walletClient;
    this.lightning = options.lightning
      ?? (() => getIncoLightning() as unknown as Promise<LightningLike>);
  }

  async createRobotMatch(settings: MatchSettings): Promise<bigint> {
    const fee = await this.contract.read.requiredRoundFee([settings.diceCount, settings.gadgetsEnabled]);
    if (this.onFee) await this.onFee(fee);
    return this.contract.write.createRobotMatch(
      [settings.diceCount, settings.gadgetsEnabled, ROBOT_ADDRESS],
      { account: this.account, value: fee },
    );
  }

  async createFriendRoom(settings: MatchSettings, roomHash: Hex): Promise<bigint> {
    return this.contract.write.createRoom(
      [roomHash, settings.diceCount, settings.gadgetsEnabled, BigInt(3600)],
      { account: this.account },
    );
  }

  async joinFriendRoom(roomHash: Hex): Promise<bigint> {
    return this.contract.write.joinRoom([roomHash], { account: this.account });
  }

  /**
   * Readying up is what pays for a friend round: each seat funds its own dice,
   * so the two seats together cover the roll that the second ready triggers.
   * The fee is quoted from the contract rather than computed here, so a change
   * in the Inco fee cannot leave the client sending a stale amount.
   */
  async setReady(matchId: bigint): Promise<void> {
    const state = await this.getPublicMatch(matchId);
    const fee = await this.contract.read.requiredSeatFee([
      state.settings.diceCount,
      state.settings.gadgetsEnabled,
    ]);
    if (this.onFee) await this.onFee(fee);
    return this.contract.write.setReady([matchId], {
      account: this.account,
      value: fee,
    });
  }

  async getPublicMatch(matchId: bigint): Promise<PublicMatchView> {
    const raw = await this.contract.read.getPublicMatch([matchId]);
    return decodePublic({ ...raw as Record<string, unknown>, matchId });
  }

  /**
   * Read this player's own dice.
   *
   * getMyRoundHandles is scoped to msg.sender, so the handles here are only
   * ever this player's. Turning them into faces requires attestedDecrypt,
   * signed by this wallet; the covalidator checks the contract granted that
   * address access. An opponent asking for the same handles is refused, which
   * is the mechanism behind the privacy claim rather than a UI decision.
   */
  async getPrivatePlayer(matchId: bigint): Promise<PrivatePlayerView> {
    const empty: PrivatePlayerView = { ownDice: [], gadget: null, scannerResult: null };
    if (!this.walletClient) return empty;

    const handles = await this.contract.read.getMyRoundHandles([matchId], {
      account: this.account,
    });
    const diceHandles = nonZero(handles.dice);
    // Between rounds the slots are zeroed until the next roll lands.
    if (diceHandles.length === 0) return empty;

    const gadgetHandle = nonZero([handles.gadget])[0];
    const scannerHandle = nonZero([handles.scannerResult])[0];
    const requested = [...diceHandles, ...(gadgetHandle ? [gadgetHandle] : []), ...(scannerHandle ? [scannerHandle] : [])];

    const key = requested.join(",");
    if (this.decrypted?.key === key) return this.decrypted.view;

    const zap = await this.lightning();
    const revealed = await withCovalidatorRetry(
      () => zap.attestedDecrypt(this.walletClient, requested),
      `decrypting ${requested.length} own handle(s) for match ${matchId}`,
    );

    const byHandle = new Map(revealed.map((item) => [item.handle.toLowerCase(), item]));
    const valueOf = (handle: Hex | undefined) =>
      handle ? byHandle.get(handle.toLowerCase())?.plaintext.value : undefined;

    const ownDice = diceHandles.map((handle) => Number(valueOf(handle)) as DieFace);
    const gadgetValue = valueOf(gadgetHandle);
    const scannerValue = valueOf(scannerHandle);

    const view: PrivatePlayerView = {
      ownDice,
      gadget: gadgetValue === undefined ? null : GADGET_KINDS[Number(gadgetValue)] ?? null,
      scannerResult: scannerValue === undefined ? null : Boolean(scannerValue),
    };
    this.decrypted = { key, view };
    return view;
  }

  async getRoundResult(matchId: bigint): Promise<RoundResultView | null> {
    const state = await this.getPublicMatch(matchId);
    try {
      const raw = await this.contract.read.getRoundResult([matchId, state.round]);
      const result = raw as Record<string, unknown>;
      // The contract reverts with RoundNotSettled before settlement, but guard
      // the flag too so a zeroed struct is never decoded as a real result.
      if (!result.settled) return null;
      return decodeResult(result, state.settings.diceCount);
    } catch {
      return null;
    }
  }

  async raise(matchId: bigint, bid: Omit<Bid, "bidder" | "sequence">, expectedSequence: number): Promise<void> {
    return this.contract.write.raise([matchId, bid.quantity, bid.face, expectedSequence], { account: this.account });
  }

  async challenge(matchId: bigint, expectedSequence: number): Promise<void> {
    return this.contract.write.challenge([matchId, expectedSequence], { account: this.account });
  }

  /**
   * Settle a challenge with real attestations.
   *
   * attestedReveal, unlike attestedDecrypt, needs no wallet: once a challenge
   * is called the contract has authorised these handles to be opened to
   * everyone, which is exactly the moment the dice stop being secret. The
   * covalidator's signatures travel with the values so settleChallenge can
   * verify each one on chain — the contract never takes the client's word for
   * a die.
   */
  async settleChallenge(matchId: bigint, expectedSequence: number): Promise<void> {
    const handles = await this.contract.read.getChallengeHandles([matchId]);
    const requested = nonZero([
      ...handles.dice,
      handles.effectiveCount,
      ...handles.effectCodes,
    ]);

    const zap = await this.lightning();
    // Packing sits inside the retry: a handle the observer has not caught up
    // to shows up as a missing attestation, which is what packSettlement
    // detects.
    const settlement = await withCovalidatorRetry(
      async () => packSettlement(handles, await zap.attestedReveal(requested)),
      `revealing ${requested.length} handle(s) for match ${matchId}`,
    );

    return this.contract.write.settleChallenge(
      [matchId, settlement, expectedSequence],
      { account: this.account },
    );
  }

  async continueMatch(matchId: bigint, expectedSequence: number): Promise<void> {
    const state = await this.getPublicMatch(matchId);
    const fee = await this.contract.read.requiredRoundFee([state.settings.diceCount, state.settings.gadgetsEnabled]);
    if (this.onFee) await this.onFee(fee);
    return this.contract.write.fundAndStartNextRound([matchId, expectedSequence], { account: this.account, value: fee });
  }

  async requestRobotAction(matchId: bigint, expectedSequence: number): Promise<void> {
    const response = await fetch("/api/robot/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: matchId.toString(), expectedSequence }),
    });
    if (!response.ok) throw new Error("Robot action failed");
  }

  async useGadget(matchId: bigint, target: number, expectedSequence: number): Promise<void> {
    const targetBytes = toHex(target, { size: 32 });
    return this.contract.write.useGadget([matchId, targetBytes, expectedSequence], { account: this.account });
  }

  async claimTurnTimeout(matchId: bigint, expectedSequence: number): Promise<void> {
    return this.contract.write.claimTurnTimeout([matchId, expectedSequence], { account: this.account });
  }

  async claimAbandonment(matchId: bigint, expectedSequence: number): Promise<void> {
    return this.contract.write.claimAbandonment([matchId, expectedSequence], { account: this.account });
  }

  async acceptRematch(matchId: bigint): Promise<void> {
    return this.contract.write.acceptRematch([matchId], { account: this.account });
  }
}
