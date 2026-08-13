"use client";

import { ReactNode, useSyncExternalStore } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
  lightTheme,
} from "@rainbow-me/rainbowkit";
import { ThemeProvider, useTheme } from "next-themes";
import { activeChain } from "@/lib/network";

const queryClient = new QueryClient();

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

/**
 * With a WalletConnect project id, RainbowKit's default config brings the full
 * wallet list including the QR flow — which is the only way to connect a phone
 * that is not browsing inside a wallet app.
 *
 * Without one, the fallback names `injected` explicitly rather than relying on
 * EIP-6963 discovery alone, so a browser extension is still offered even if a
 * wallet does not announce itself. That covers desktop and a wallet's in-app
 * browser, and nothing else.
 */
const config = projectId
  ? getDefaultConfig({
      appName: "Hecliar",
      projectId,
      chains: [activeChain],
      ssr: true,
    })
  : createConfig({
      chains: [activeChain],
      connectors: [injected()],
      transports: {
        [activeChain.id]: http(),
      },
      ssr: true,
    });

// Inner provider that uses theme context
const RainbowKitWithTheme = ({ children }: { children: ReactNode }) => {
  const { resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  // Bone on felt, matching styles/tokens.css. Coral is reserved for Challenge
  // and never appears in wallet chrome.
  const rainbowTheme =
    mounted && resolvedTheme === "light"
      ? lightTheme({ accentColor: "#171512", accentColorForeground: "#F4F1EA", borderRadius: "small" })
      : darkTheme({ accentColor: "#F2EDE3", accentColorForeground: "#0B0E13", borderRadius: "small" });

  return (
    <RainbowKitProvider theme={rainbowTheme}>{children}</RainbowKitProvider>
  );
};

const Providers = ({ children }: { children: ReactNode }) => {
  return (
    // disableTransitionOnChange is load-bearing, not cosmetic. Chrome does not
    // re-resolve a transitioned property when the custom property behind it
    // changes, so without this a theme swap leaves elements painted in the
    // previous theme — the primary CTA came out at 1.04:1.
    <ThemeProvider attribute="class" defaultTheme="dark" disableTransitionOnChange enableSystem>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitWithTheme>{children}</RainbowKitWithTheme>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
};

export { Providers };