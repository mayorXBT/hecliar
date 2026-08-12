"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { LocalGameGateway, type GameGateway } from "@/lib/game/gateway";
import { ChainGameGateway } from "@/lib/game/chain-gateway";
import { configuredAddress, createHecliarContract } from "@/lib/game/contract-adapter";

/**
 * Which gateway the app runs on.
 *
 * "local" is the in-memory table: no wallet, no chain, instant. "chain" drives
 * the deployed contract, which is the only mode where the dice are actually
 * confidential — the local gateway simply keeps them in another object.
 */
export type Transport = "local" | "chain";

export type GatewayState = {
  gateway: GameGateway | null;
  transport: Transport;
  /** Why there is no gateway, in words a player can act on. */
  unavailable: string | null;
};

const GatewayContext = createContext<GatewayState>({
  gateway: null,
  transport: "local",
  unavailable: "No game transport is configured.",
});

let localGateway: GameGateway | null = null;

function configuredTransport(): Transport {
  return process.env.NEXT_PUBLIC_GAME_TRANSPORT === "chain" ? "chain" : "local";
}

export function GameGatewayProvider({
  children,
  gateway,
}: {
  children: ReactNode;
  /** Injected by tests; when present it is used as-is. */
  gateway?: GameGateway;
}) {
  const transport = configuredTransport();
  const address = configuredAddress();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const value = useMemo<GatewayState>(() => {
    if (gateway) return { gateway, transport, unavailable: null };

    if (transport === "local") {
      localGateway ??= new LocalGameGateway();
      return { gateway: localGateway, transport, unavailable: null };
    }

    if (!address) {
      return {
        gateway: null,
        transport,
        unavailable:
          "This build has no contract address. Set NEXT_PUBLIC_HECLIAR_ADDRESS, or switch NEXT_PUBLIC_GAME_TRANSPORT to local to play the robot without a wallet.",
      };
    }
    if (!publicClient) {
      return { gateway: null, transport, unavailable: "Cannot reach the network." };
    }
    if (!walletClient) {
      return {
        gateway: null,
        transport,
        unavailable: "Connect a wallet to play on-chain.",
      };
    }

    const contract = createHecliarContract(address, publicClient, walletClient);
    return {
      gateway: new ChainGameGateway(contract, walletClient.account.address, {
        // The wallet signs the decryption of its own dice. Without it the
        // covalidator has no proof this caller may read them.
        walletClient,
      }),
      transport,
      unavailable: null,
    };
  }, [address, gateway, publicClient, transport, walletClient]);

  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGameGateway(): GameGateway | null {
  return useContext(GatewayContext).gateway;
}

/** Transport and the reason a gateway is missing, for screens that explain it. */
export function useGatewayState(): GatewayState {
  return useContext(GatewayContext);
}
