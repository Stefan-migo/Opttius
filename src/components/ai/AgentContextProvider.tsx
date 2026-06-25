"use client";

import { usePathname } from "next/navigation";
import { createContext, ReactNode, useContext, useMemo } from "react";

import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import type { AgentContext } from "@/lib/ai/types";

const AgentContextCtx = createContext<AgentContext | null>(null);

/**
 * Collects screen metadata (route, branch, role, org) from existing React
 * contexts. Does NOT make HTTP requests — metadata is serialised into the
 * POST body when the user sends a message.
 *
 * Must be rendered inside AuthProvider and BranchProvider.
 */
export function AgentContextProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, adminRole } = useAuthContext();
  const { currentBranchId, currentBranchName } = useBranch();

  const ctx = useMemo<AgentContext>(() => {
    // ponytail: Org/tenant ID comes from branch context when available.
    // A dedicated orgId field will replace this when the org store lands.
    const orgId = user?.id ?? "";
    return {
      route: pathname,
      branchId: currentBranchId,
      branchName: currentBranchName,
      role: adminRole ?? "",
      orgId,
      userId: user?.id ?? "",
    };
  }, [pathname, currentBranchId, currentBranchName, adminRole, user?.id]);

  return (
    <AgentContextCtx.Provider value={ctx}>{children}</AgentContextCtx.Provider>
  );
}

/** Exposes the current AgentContext — route, branch, role, orgId, userId. */
export function useAgentContext(): AgentContext {
  const ctx = useContext(AgentContextCtx);
  if (!ctx) {
    throw new Error(
      "useAgentContext must be used within an AgentContextProvider",
    );
  }
  return ctx;
}
