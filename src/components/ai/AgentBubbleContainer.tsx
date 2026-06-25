"use client";

import { AgentContextProvider, useAgentContext } from "./AgentContextProvider";
import { AgentBubble } from "./AgentBubble";

/**
 * Wraps AgentBubble inside AgentContextProvider for screen metadata.
 * Render this once in the admin layout — it is only visible on admin routes.
 */
function AgentBubbleInner() {
  const { route, branchName } = useAgentContext();
  return <AgentBubble route={route} branchName={branchName} />;
}

export function AgentBubbleContainer() {
  return (
    <AgentContextProvider>
      <AgentBubbleInner />
    </AgentContextProvider>
  );
}
