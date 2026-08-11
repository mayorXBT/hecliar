import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("sends players to the Robot setup from the confidential table home", () => {
  render(<Home />);

  expect(screen.getByRole("heading", { name: "Roll. Bluff. Don’t get caught." })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Play Robot" })).toHaveAttribute("href", "/play/robot");
});
