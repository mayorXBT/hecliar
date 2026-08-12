import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { DieFace } from "@hecliar/game-logic";
import { Die, DiceRow, sealFragment } from "@/components/ui/Die";

// vitest is not configured with `globals: true`, so RTL does not auto-clean.
afterEach(cleanup);

describe("Die", () => {
  it("renders the right pip count for every face", () => {
    for (const face of [1, 2, 3, 4, 5, 6] as DieFace[]) {
      const { container, unmount } = render(<Die face={face} state="face" />);
      expect(container.querySelectorAll(".hx-pip")).toHaveLength(face);
      unmount();
    }
  });

  it("names a face die by its value", () => {
    render(<Die face={5} state="face" />);
    expect(screen.getByLabelText("Die showing 5")).toBeTruthy();
  });

  it("tells a screen reader the value is hidden rather than reading the handle", () => {
    render(<Die seed="a" state="sealed" />);
    const die = screen.getByLabelText("Sealed die, value hidden until the reveal");
    expect(die.textContent).not.toBe("");
    expect(die.getAttribute("aria-label")).not.toContain(die.textContent ?? "");
  });

  it("renders no pips when hidden or sealed", () => {
    const hidden = render(<Die state="hidden" />);
    expect(hidden.container.querySelectorAll(".hx-pip")).toHaveLength(0);
    hidden.unmount();

    const sealed = render(<Die seed="x" state="sealed" />);
    expect(sealed.container.querySelectorAll(".hx-pip")).toHaveLength(0);
  });
});

describe("sealFragment", () => {
  it("is stable for a seed, so a sealed die does not flicker between renders", () => {
    expect(sealFragment("d:0")).toBe(sealFragment("d:0"));
  });

  it("distinguishes dice in the same row", () => {
    const fragments = new Set(
      Array.from({ length: 6 }, (_, i) => sealFragment(`d:${i}`)),
    );
    expect(fragments.size).toBe(6);
  });

  it("is four hex characters", () => {
    expect(sealFragment("anything")).toMatch(/^[0-9a-f]{4}$/);
  });
});

describe("DiceRow", () => {
  it("renders one die per value and labels each by position", () => {
    render(<DiceRow dice={[2, 4, 6]} label="Your dice" state="face" />);
    expect(screen.getByLabelText("Die 1: 2")).toBeTruthy();
    expect(screen.getByLabelText("Die 3: 6")).toBeTruthy();
  });

  it("renders count dice when there are no readable values", () => {
    const { container } = render(
      <DiceRow count={4} label="Opponent dice" state="hidden" />,
    );
    expect(container.querySelectorAll(".hx-die--hidden")).toHaveLength(4);
  });

  it("stages the landing stagger by position", () => {
    const { container } = render(
      <DiceRow dice={[1, 1, 1]} label="Your dice" state="face" />,
    );
    const dice = Array.from(container.querySelectorAll<HTMLElement>(".hx-die"));
    expect(dice.map((d) => d.style.getPropertyValue("--die-index"))).toEqual([
      "0",
      "1",
      "2",
    ]);
  });
});
