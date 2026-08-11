import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import Home from "@/app/page";

afterEach(cleanup);

test("explains confidential play and preserves both game entry paths", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { name: /every bluff has a private side/i })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /play the robot/i })).toHaveAttribute("href", "/play/robot");
  expect(screen.getByRole("link", { name: /create a private room/i })).toHaveAttribute("href", "/play/friend");
  for (const stage of ["Roll privately", "Raise publicly", "Challenge the claim", "Reveal only the result"]) {
    expect(screen.getByText(stage)).toBeInTheDocument();
  }
  expect(screen.getByText(/exactly one secret gadget each/i)).toBeInTheDocument();
  expect(screen.getByText("Echo", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Jammer", { exact: true })).toBeInTheDocument();
  expect(screen.getByText("Scanner", { exact: true })).toBeInTheDocument();
  expect(screen.getByText(/your encrypted dice/i)).toBeInTheDocument();
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});

test("moves and activates confidentiality tabs with standard keyboard controls", () => {
  render(<Home />);

  const privateRoll = screen.getByRole("tab", { name: "Private roll" });
  privateRoll.focus();
  fireEvent.keyDown(privateRoll, { key: "ArrowRight" });
  expect(screen.getByRole("tab", { name: "Public bid" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tabpanel")).toHaveTextContent("placeBid");

  fireEvent.keyDown(screen.getByRole("tab", { name: "Public bid" }), { key: "End" });
  expect(screen.getByRole("tab", { name: "Challenge" })).toHaveAttribute("aria-selected", "true");

  fireEvent.keyDown(screen.getByRole("tab", { name: "Challenge" }), { key: "Home" });
  expect(screen.getByRole("tab", { name: "Private roll" })).toHaveAttribute("aria-selected", "true");
});
