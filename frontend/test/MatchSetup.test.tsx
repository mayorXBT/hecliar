import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MatchSetup } from "@/components/setup/MatchSetup";

describe("MatchSetup", () => {
  it("starts a Robot match with the selected legal settings", () => {
    const onStart = vi.fn();
    render(<MatchSetup mode="robot" onStart={onStart} />);

    expect(screen.getByLabelText("Dice per side")).toHaveValue(4);
    fireEvent.click(screen.getByRole("button", { name: "5 dice" }));
    fireEvent.click(screen.getByRole("radio", { name: "Medium" }));
    fireEvent.click(screen.getByRole("button", { name: "Start match" }));

    expect(onStart).toHaveBeenCalledWith({
      mode: "robot", diceCount: 5, difficulty: "medium", gadgetsEnabled: false,
    });
  });
});
