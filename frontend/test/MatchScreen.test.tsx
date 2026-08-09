import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  GameGateway,
  MatchSettings,
  PrivatePlayerView,
  PublicMatchView,
  RoundResultView,
} from "@hecliar/game-logic";
import { MatchScreen } from "@/components/game/MatchScreen";

const settings: MatchSettings = {
  mode: "robot",
  diceCount: 4,
  gadgetsEnabled: true,
  difficulty: "easy",
};

function publicView(overrides: Partial<PublicMatchView> = {}): PublicMatchView {
  return {
    matchId: BigInt(1),
    mode: "robot",
    status: "active-turn",
    players: [
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000002",
    ],
    settings,
    activeSeat: 0,
    startingSeat: 0,
    bid: { quantity: 2, face: 5, bidder: 1, sequence: 3 },
    score: [0, 0],
    round: 1,
    actionSequence: 3,
    deadlines: { actionDeadline: 1_900_000_000, abandonmentDeadline: 1_900_000_075 },
    rematchAccepted: [false, false],
    ...overrides,
  };
}

const oldPrivate: PrivatePlayerView = {
  ownDice: [1, 2, 3, 4],
  gadget: "echo",
  scannerResult: null,
};

const result: RoundResultView = {
  rolls: [[1, 2, 3, 4], [5, 5, 6, 6]],
  bid: { quantity: 2, face: 5, bidder: 1, sequence: 3 },
  baseCount: 2,
  effectiveCount: 2,
  effects: [],
  winner: 1,
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function gateway(overrides: Partial<GameGateway> = {}): GameGateway {
  return {
    createRobotMatch: vi.fn(async () => BigInt(1)),
    createFriendRoom: vi.fn(async () => BigInt(1)),
    joinFriendRoom: vi.fn(async () => BigInt(1)),
    setReady: vi.fn(async () => undefined),
    getPublicMatch: vi.fn(async () => publicView()),
    getPrivatePlayer: vi.fn(async () => oldPrivate),
    getRoundResult: vi.fn(async () => null),
    raise: vi.fn(async () => undefined),
    challenge: vi.fn(async () => undefined),
    useGadget: vi.fn(async () => undefined),
    settleChallenge: vi.fn(async () => undefined),
    continueMatch: vi.fn(async () => undefined),
    requestRobotAction: vi.fn(async () => undefined),
    claimTurnTimeout: vi.fn(async () => undefined),
    claimAbandonment: vi.fn(async () => undefined),
    acceptRematch: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("MatchScreen lifecycle", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not synchronously parse a malformed match ID as BigInt", () => {
    render(<MatchScreen gateway={gateway()} rawMatchId="not-a-number" />);

    expect(screen.getByRole("alert")).toHaveTextContent("invalid match link");
    expect(screen.getByRole("link", { name: "Start a new match" })).toBeVisible();
  });

  it("suppresses a reentrant Challenge and clears old private dice before it resolves", async () => {
    const pending = deferred<void>();
    const controls: { challenge?: HTMLElement } = {};
    let calls = 0;
    const challenge = vi.fn(() => {
      calls += 1;
      if (calls === 1) fireEvent.click(controls.challenge!);
      return pending.promise;
    });
    render(<MatchScreen gateway={gateway({ challenge })} rawMatchId="1" />);
    controls.challenge = await screen.findByRole("button", { name: "Challenge" });

    fireEvent.click(controls.challenge!);

    expect(challenge).toHaveBeenCalledTimes(1);
    expect(screen.queryAllByTestId("own-die")).toHaveLength(0);
    expect(screen.getByText("Challenge pending")).toBeVisible();
  });

  it("suppresses a reentrant Raise while the first raise is pending", async () => {
    const pending = deferred<void>();
    const controls: { raise?: HTMLElement } = {};
    let calls = 0;
    const raise = vi.fn(() => {
      calls += 1;
      if (calls === 1) fireEvent.click(controls.raise!);
      return pending.promise;
    });
    render(<MatchScreen gateway={gateway({ raise })} rawMatchId="1" />);
    await screen.findByRole("region", { name: "Hecliar game table" });
    fireEvent.click(screen.getByRole("button", { name: "Quantity 3" }));
    controls.raise = screen.getByRole("button", { name: "Raise" });

    fireEvent.click(controls.raise!);

    expect(raise).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Raise pending")).toBeVisible();
  });

  it("suppresses a reentrant gadget use while the first gadget action is pending", async () => {
    const pending = deferred<void>();
    const controls: { target?: HTMLElement } = {};
    let calls = 0;
    const useGadget = vi.fn(() => {
      calls += 1;
      if (calls === 1) fireEvent.click(controls.target!);
      return pending.promise;
    });
    render(<MatchScreen gateway={gateway({ useGadget })} rawMatchId="1" />);
    await screen.findByRole("region", { name: "Hecliar game table" });
    fireEvent.click(screen.getByRole("button", { name: "Use echo" }));
    controls.target = screen.getByRole("button", { name: "Target die 1" });

    fireEvent.click(controls.target!);

    expect(useGadget).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Gadget pending")).toBeVisible();
  });

  it("keeps the table recoverable after an action failure and clears the error on retry", async () => {
    const retry = deferred<void>();
    const raise = vi.fn()
      .mockRejectedValueOnce(new Error("wallet rejected"))
      .mockImplementationOnce(() => retry.promise);
    render(<MatchScreen gateway={gateway({ raise })} rawMatchId="1" />);
    await screen.findByRole("region", { name: "Hecliar game table" });
    fireEvent.click(screen.getByRole("button", { name: "Quantity 3" }));

    fireEvent.click(screen.getByRole("button", { name: "Raise" }));
    await screen.findByRole("alert");

    expect(screen.getByRole("region", { name: "Hecliar game table" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Raise" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Raise pending")).toBeVisible();
    await act(async () => retry.resolve());
    await waitFor(() => expect(screen.queryByText("Raise pending")).not.toBeInTheDocument());
  });

  it("locks Rematch against reentry and waits for fresh private dice", async () => {
    let currentPublic = publicView({ status: "match-complete", score: [2, 1] });
    const rematch = deferred<void>();
    const freshPrivate = deferred<PrivatePlayerView>();
    const controls: { rematch?: HTMLElement } = {};
    let calls = 0;
    const acceptRematch = vi.fn(() => {
      calls += 1;
      if (calls === 1) fireEvent.click(controls.rematch!);
      currentPublic = publicView({ actionSequence: 8 });
      return rematch.promise;
    });
    const testGateway = gateway({
      getPublicMatch: vi.fn(async () => currentPublic),
      getRoundResult: vi.fn(async () => result),
      getPrivatePlayer: vi.fn()
        .mockResolvedValueOnce(oldPrivate)
        .mockImplementation(() => freshPrivate.promise),
      acceptRematch,
    });
    render(<MatchScreen gateway={testGateway} rawMatchId="1" />);
    controls.rematch = await screen.findByRole("button", { name: "Play again" });

    fireEvent.click(controls.rematch!);

    expect(acceptRematch).toHaveBeenCalledTimes(1);
    expect(controls.rematch).toBeDisabled();
    await act(async () => rematch.resolve());
    expect(screen.queryAllByTestId("own-die")).toHaveLength(0);
    freshPrivate.resolve({ ownDice: [6, 6, 5, 5], gadget: null, scannerResult: null });
    await screen.findAllByTestId("own-die");
    expect(screen.getByLabelText("Die 1: 6")).toBeVisible();
  });

  it("clears private dice before a next-round replacement resolves", async () => {
    let currentPublic = publicView({ status: "round-complete", score: [1, 0] });
    const nextRound = deferred<void>();
    const freshPrivate = deferred<PrivatePlayerView>();
    const continueMatch = vi.fn(() => {
      currentPublic = publicView({ round: 2, actionSequence: 6 });
      return nextRound.promise;
    });
    const testGateway = gateway({
      getPublicMatch: vi.fn(async () => currentPublic),
      getRoundResult: vi.fn(async () => currentPublic.status === "round-complete" ? result : null),
      getPrivatePlayer: vi.fn()
        .mockResolvedValueOnce(oldPrivate)
        .mockImplementation(() => freshPrivate.promise),
      continueMatch,
    });
    render(<MatchScreen gateway={testGateway} rawMatchId="1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Next round" }));

    await act(async () => nextRound.resolve());

    expect(screen.queryAllByTestId("own-die")).toHaveLength(0);
    expect(screen.queryByText("Round result")).not.toBeInTheDocument();
    expect(screen.getByText("Next round pending")).toBeVisible();
    freshPrivate.resolve({ ownDice: [6, 6, 5, 5], gadget: null, scannerResult: null });
    await screen.findAllByTestId("own-die");
    expect(screen.getByLabelText("Die 1: 6")).toBeVisible();
  });

  it("clears private dice before challenge settlement resolves", async () => {
    vi.useFakeTimers();
    const settlement = deferred<void>();
    const testGateway = gateway({
      getPublicMatch: vi.fn(async () => publicView({ status: "resolving-challenge" })),
      getRoundResult: vi.fn(async () => result),
      settleChallenge: vi.fn(() => settlement.promise),
    });
    render(<MatchScreen gateway={testGateway} rawMatchId="1" />);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(screen.getAllByTestId("own-die")).toHaveLength(4);

    act(() => vi.advanceTimersByTime(700));

    expect(screen.queryAllByTestId("own-die")).toHaveLength(0);
    expect(screen.getByText("Challenge verification pending")).toBeVisible();
  });

  it("does not show prior-match dice while a changed match ID is loading", async () => {
    const secondPublic = deferred<PublicMatchView>();
    const secondPrivate = deferred<PrivatePlayerView>();
    const testGateway = gateway({
      getPublicMatch: vi.fn((id) => id === BigInt(1) ? Promise.resolve(publicView()) : secondPublic.promise),
      getPrivatePlayer: vi.fn((id) => id === BigInt(1) ? Promise.resolve(oldPrivate) : secondPrivate.promise),
    });
    const view = render(<MatchScreen gateway={testGateway} rawMatchId="1" />);
    await screen.findAllByTestId("own-die");

    view.rerender(<MatchScreen gateway={testGateway} rawMatchId="2" />);

    expect(screen.queryAllByTestId("own-die")).toHaveLength(0);
    secondPublic.resolve(publicView({ matchId: BigInt(2) }));
    secondPrivate.resolve({ ownDice: [6, 6, 5, 5], gadget: null, scannerResult: null });
    await waitFor(() => expect(screen.getByLabelText("Die 1: 6")).toBeVisible());
  });
});
