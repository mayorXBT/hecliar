"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { LocalGameGateway, type GameGateway } from "@/lib/game/gateway";

const GatewayContext = createContext<GameGateway | null>(null);
let localGateway: GameGateway | null = null;

function configuredLocalGateway(): GameGateway | null {
  if (process.env.NEXT_PUBLIC_GAME_TRANSPORT !== "local") return null;
  localGateway ??= new LocalGameGateway();
  return localGateway;
}

export function GameGatewayProvider({ children, gateway }: { children: ReactNode; gateway?: GameGateway }) {
  const value = useMemo(() => gateway ?? configuredLocalGateway(), [gateway]);
  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGameGateway(): GameGateway | null {
  return useContext(GatewayContext);
}
