"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Logo } from "./ui/Logo";
import { ThemeToggle } from "./ThemeToggle";

const LINKS = [
  { href: "#problem", label: "The problem" },
  { href: "#round", label: "A round" },
  { href: "#proof", label: "Proof" },
  { href: "#start", label: "What it costs" },
];

const Header = () => {
  return (
    <header className="site-head">
      <div className="site-head-bar">
        <Link className="brand" href="/">
          <Logo size={22} />
          Hecliar
        </Link>

        <nav aria-label="Sections" className="site-nav">
          {LINKS.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>

        <div className="site-head-actions">
          <ThemeToggle />
          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const connected = mounted && account && chain;

              return (
                <div
                  className="head-wallet"
                  {...(!mounted && {
                    "aria-hidden": true,
                    style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
                  })}
                >
                  {!connected ? (
                    <button className="hx-btn hx-btn--ghost hx-btn--sm" onClick={openConnectModal} type="button">
                      Connect wallet
                    </button>
                  ) : chain.unsupported ? (
                    <button className="hx-btn hx-btn--secondary hx-btn--sm" onClick={openChainModal} type="button">
                      Wrong network
                    </button>
                  ) : (
                    <button className="hx-btn hx-btn--ghost hx-btn--sm" onClick={openAccountModal} type="button">
                      {account.displayName}
                    </button>
                  )}
                </div>
              );
            }}
          </ConnectButton.Custom>

          <Link className="hx-btn hx-btn--primary hx-btn--sm" href="/play/robot">
            Play the robot
          </Link>
        </div>
      </div>
    </header>
  );
};

export { Header };
