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

  it("suppresses a reentrant second start while the first start is pending", () => {
    const controls: { form?: HTMLFormElement } = {};
    let calls = 0;
    const onStart = vi.fn(() => {
      calls += 1;
      if (calls === 1) fireEvent.submit(controls.form!);
      return new Promise<void>(() => undefined);
    });
    const { container } = render(<MatchSetup mode="robot" onStart={onStart} />);
    controls.form = container.querySelector("form")!;

    fireEvent.submit(controls.form!);

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Starting match" })).toBeDisabled();
  });
});
