"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const Header = () => {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link className="site-header__brand" href="/" aria-label="Hecliar home">
          <span aria-hidden="true" className="site-header__mark" />
          <span>HECLIAR</span>
        </Link>

        <nav className="site-header__nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#privacy">Privacy</Link>
          <Link href="/#rules">Rules</Link>
        </nav>

        <div className="site-header__actions">
          <Link className="site-header__play" href="/play/robot">Play Robot</Link>
          <span className="site-header__theme"><ThemeToggle /></span>
          <div className="site-header__wallet">
            <ConnectButton.Custom>
              {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
              }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      "aria-hidden": true,
                      style: {
                        opacity: 0,
                        pointerEvents: "none",
                        userSelect: "none",
                      },
                    })}
                  >
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        className="site-header__wallet-button"
                      >
                        connect wallet
                      </button>
                    ) : chain.unsupported ? (
                      <button
                        onClick={openChainModal}
                        className="site-header__wallet-button site-header__wallet-button--danger"
                      >
                        wrong network
                      </button>
                    ) : (
                      <div className="site-header__wallet-connected">
                        <button
                          onClick={openChainModal}
                          className="site-header__wallet-button site-header__wallet-button--quiet"
                        >
                          {chain.name?.toLowerCase()}
                        </button>
                        <button
                          onClick={openAccountModal}
                          className="site-header__wallet-button"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </div>
    </header>
  );
};

export { Header };
