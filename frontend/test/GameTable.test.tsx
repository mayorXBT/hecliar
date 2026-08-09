import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    expect(screen.getByText("4 hidden dice")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Quantity 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Face 5" }));
    expect(screen.getByRole("button", { name: "Raise" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Challenge" })).toBeEnabled();
  });
});
