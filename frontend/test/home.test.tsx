import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import Home from "@/app/page";
import { Header } from "@/components/Header";

vi.mock("@rainbow-me/rainbowkit", () => ({
  ConnectButton: {
    Custom: ({ children }: { children: (props: Record<string, unknown>) => ReactNode }) => children({
      account: null,
      chain: null,
      mounted: true,
      openAccountModal: vi.fn(),
      openChainModal: vi.fn(),
      openConnectModal: vi.fn(),
    }),
  },
}));

vi.mock("@/components/ThemeToggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

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

test("provides product navigation and preserves the wallet connection control", () => {
  render(<Header />);

  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "How it works" })).toHaveAttribute("href", "/#how-it-works");
  expect(screen.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/#privacy");
  expect(screen.getByRole("link", { name: "Rules" })).toHaveAttribute("href", "/#rules");
  expect(screen.getByRole("link", { name: "Play Robot" })).toHaveAttribute("href", "/play/robot");
  expect(screen.getByRole("button", { name: /connect wallet/i })).toBeVisible();
});
