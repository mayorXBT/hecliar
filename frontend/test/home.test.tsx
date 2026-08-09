import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "@/app/page";

test("renders the Hecliar baseline without generated example UI", () => {
  render(<Home />);

  expect(
    screen.getByRole("heading", { name: "Hecliar confidential game baseline" }),
  ).toBeInTheDocument();
  expect(screen.queryByText(/generated game/i)).not.toBeInTheDocument();
});
