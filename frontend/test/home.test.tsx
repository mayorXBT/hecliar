import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("explains confidential play and preserves both game entry paths", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { name: /every bluff has a private side/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /play the robot/i })).toHaveAttribute("href", "/play/robot");
  expect(screen.getByRole("link", { name: /create a private room/i })).toHaveAttribute("href", "/play/friend");
  for (const stage of ["Roll privately", "Raise publicly", "Challenge the claim", "Reveal only the result"]) {
    expect(screen.getByText(stage)).toBeInTheDocument();
  }
  expect(screen.getByText(/exactly one secret gadget each/i)).toBeInTheDocument();
  expect(screen.getByText(/your encrypted dice/i)).toBeInTheDocument();
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});
