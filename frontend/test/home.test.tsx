import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "@/app/page";

// vitest is not configured with `globals: true`, so RTL does not auto-clean.
afterEach(cleanup);

describe("landing page", () => {
  it("sends players to the robot setup, which needs no wallet", () => {
    render(<Home />);

    const ctas = screen.getAllByRole("link", { name: "Play the robot" });
    expect(ctas.length).toBeGreaterThan(0);
    for (const cta of ctas) {
      expect(cta).toHaveAttribute("href", "/play/robot");
    }

    expect(screen.getByRole("link", { name: "Create a room" })).toHaveAttribute(
      "href",
      "/play/friend",
    );
  });

  it("leads with one value proposition as the only h1", () => {
    render(<Home />);

    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0].textContent).toContain("The bluff is real");
  });

  it("never skips a heading level", () => {
    const { container } = render(<Home />);

    const levels = Array.from(container.querySelectorAll("h1, h2, h3, h4")).map((node) =>
      Number(node.tagName[1]),
    );

    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i] - levels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("carries the full narrative, problem through close", () => {
    render(<Home />);

    for (const id of ["problem-title", "round-title", "proof-title", "compare-title", "start-title", "close-title"]) {
      expect(document.getElementById(id)).not.toBeNull();
    }
  });

  it("names Hecliar's column in the comparison so the table is scannable", () => {
    render(<Home />);

    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Hecliar" })).toBeTruthy();
    expect(within(table).getByRole("rowheader", { name: "Who can read your dice" })).toBeTruthy();
  });

  it("holds the demonstration still under reduced motion, showing the settled round", () => {
    // jsdom provides no matchMedia, which HeroDemo treats as reduced motion.
    render(<Home />);

    expect(screen.getByText(/Four 5s across both hands/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Step through it" })).toBeTruthy();
  });
});
