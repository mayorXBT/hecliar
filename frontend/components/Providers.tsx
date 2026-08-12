"use client";

import { ReactNode, useSyncExternalStore } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
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

const config = projectId
  ? getDefaultConfig({
      appName: "Hecliar",
      projectId,
      chains: [activeChain],
      ssr: true,
    })
  : createConfig({
      chains: [activeChain],
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
  if (!projectId) {
  }

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