import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { DiceTray } from "@/components/game/DiceTray";

describe("DiceTray", () => {
  afterEach(cleanup);

  it("renders standard pip counts for every visible die face", () => {
    render(<DiceTray visibility="owner" dice={[1, 2, 3, 4, 5, 6]} count={6} />);

    for (let face = 1; face <= 6; face += 1) {
      const die = screen.getByLabelText(`Die ${face}: ${face}`);
      expect(within(die).getAllByTestId("pip")).toHaveLength(face);
      expect(die).not.toHaveTextContent(String(face));
    }
  });

  it("renders one value-free question tile for each hidden opponent die", () => {
    render(<DiceTray visibility="hidden" count={4} />);

    const tray = screen.getByLabelText("4 hidden opponent dice");
    expect(within(tray).getAllByTestId("hidden-die")).toHaveLength(4);
    expect(within(tray).getAllByText("?")).toHaveLength(4);
    expect(within(tray).queryByTestId("pip")).not.toBeInTheDocument();
  });
});
