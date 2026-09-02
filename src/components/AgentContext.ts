"use client";

import { createContext, useContext } from "react";
import type { Agent } from "@/types";

export interface AgentContextValue {
  user: Agent | null;
  setUser: React.Dispatch<React.SetStateAction<Agent | null>>;
  availableCommission: number;
  setAvailableCommission: React.Dispatch<React.SetStateAction<number>>;
  refreshProfile: () => Promise<void>;
}

export const AgentContext = createContext<AgentContextValue | null>(null);

export const useAgent = (): AgentContextValue => {
  const context = useContext(AgentContext);
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider");
  }
  return context;
};
