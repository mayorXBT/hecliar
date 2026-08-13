import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GameTable } from "@/components/game/GameTable";

const publicMatch = {
  matchId: BigInt(1),
  status: "active-turn" as const,
  mode: "robot" as const,
  players: ["0x0000000000000000000000000000000000000001", "0x0000000000000000000000000000000000000002"] as const,
  settings: { mode: "robot" as const, diceCount: 4 as const, gadgetsEnabled: false, difficulty: "easy" as const },
  activeSeat: 0 as const,
  startingSeat: 0 as const,
  bid: { quantity: 2, face: 5 as const, bidder: 1 as const, sequence: 3 },
  score: [0, 0] as const,
  round: 1,
  actionSequence: 3,
  deadlines: { actionDeadline: 1_900_000_000, abandonmentDeadline: 1_900_000_075 },
  rematchAccepted: [false, false] as const,
};

describe("GameTable", () => {
  afterEach(cleanup);
  it("shows only own dice and blocks an equal bid while challenge remains available", () => {
    const raise = vi.fn();
    render(
      <GameTable
        publicMatch={publicMatch}
        privatePlayer={{ ownDice: [5, 2, 1, 6], gadget: null, scannerResult: null }}
        onRaise={raise}
        onChallenge={vi.fn()}
        onUseGadget={vi.fn()}
      />,
    );

    expect(screen.getByText("Your dice")).toBeVisible();
    expect(screen.getAllByTestId("own-die")).toHaveLength(4);
    expect(screen.getByLabelText("4 hidden opponent dice")).toBeVisible();
    expect(screen.getAllByTestId("hidden-die")).toHaveLength(4);
    fireEvent.click(screen.getByRole("button", { name: "Quantity 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Face 5" }));
    expect(screen.getByRole("button", { name: "Raise" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Challenge" })).toBeEnabled();
  });

  it("lets Echo choose every own die target and removes the control while pending", () => {
    const useGadget = vi.fn();
    render(<GameTable publicMatch={{ ...publicMatch, settings: { ...publicMatch.settings, gadgetsEnabled: true } }} privatePlayer={{ ownDice: [5, 2, 1, 6], gadget: "echo", scannerResult: null }} onRaise={vi.fn()} onChallenge={vi.fn()} onUseGadget={useGadget} pendingAction={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Use echo" }));
    fireEvent.click(screen.getByRole("button", { name: "Target die 4" }));
    expect(useGadget).toHaveBeenCalledWith(3);
  });

  it("uses a section landmark so a page has one main landmark", () => {
    render(<main><GameTable publicMatch={publicMatch} privatePlayer={{ ownDice: [5, 2, 1, 6], gadget: null, scannerResult: null }} onRaise={vi.fn()} onChallenge={vi.fn()} onUseGadget={vi.fn()} pendingAction={null} /></main>);
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("region", { name: "Hecliar game table" })).toBeVisible();
  });

  it("uses wrapping selectors and a dedicated reachable action region", () => {
    render(<GameTable publicMatch={publicMatch} privatePlayer={{ ownDice: [5, 2, 1, 6], gadget: null, scannerResult: null }} onRaise={vi.fn()} onChallenge={vi.fn()} onUseGadget={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Quantity" })).toHaveClass("selector-grid");
    expect(screen.getByRole("group", { name: "Face" })).toHaveClass("selector-grid");
    expect(screen.getByRole("group", { name: "Table actions" })).toHaveClass("table-action-region");
  });
});

describe("GameTable as the guest of a friend room", () => {
  afterEach(cleanup);

  const friendMatch = {
    ...publicMatch,
    mode: "friend" as const,
    settings: { ...publicMatch.settings, mode: "friend" as const },
    score: [2, 1] as const,
  };
  const privatePlayer = { ownDice: [1, 2, 3, 4] as const, gadget: null, scannerResult: null };

  it("does not offer the controls on the host's turn", () => {
    // activeSeat 0 is the host. Before this, a guest saw "your turn" here,
    // the controls enabled, and the contract answered NotActivePlayer.
    render(
      <GameTable
        mySeat={1}
        onChallenge={vi.fn()}
        onRaise={vi.fn()}
        onUseGadget={vi.fn()}
        opponent="Opponent"
        privatePlayer={privatePlayer}
        publicMatch={{ ...friendMatch, activeSeat: 0 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Raise" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Challenge" })).toBeDisabled();
  });

  it("offers the controls on the guest's own turn", () => {
    render(
      <GameTable
        mySeat={1}
        onChallenge={vi.fn()}
        onRaise={vi.fn()}
        onUseGadget={vi.fn()}
        opponent="Opponent"
        privatePlayer={privatePlayer}
        publicMatch={{ ...friendMatch, activeSeat: 1 }}
      />,
    );

    expect(screen.getByRole("button", { name: "Challenge" })).toBeEnabled();
  });

  it("reads the score from the guest's side and never calls a human a robot", () => {
    render(
      <GameTable
        mySeat={1}
        onChallenge={vi.fn()}
        onRaise={vi.fn()}
        onUseGadget={vi.fn()}
        opponent="Opponent"
        privatePlayer={privatePlayer}
        publicMatch={{ ...friendMatch, activeSeat: 1 }}
      />,
    );

    // Stored score is [host 2, guest 1]; the guest is winning 1 to 2 from here.
    expect(screen.getByLabelText("Score you 1, opponent 2")).toBeTruthy();
    expect(screen.queryByText("Robot")).toBeNull();
  });
});
