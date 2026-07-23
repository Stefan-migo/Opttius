"use client";

import { AgentBubble } from "./AgentBubble";
import { AgentContextProvider, useAgentContext } from "./AgentContextProvider";

/**
 * Wraps AgentBubble inside AgentContextProvider for screen metadata.
 * Render this once in the admin layout — it is only visible on admin routes.
 */
function AgentBubbleInner() {
  const { route, branchName } = useAgentContext();
  return <AgentBubble branchName={branchName} route={route} />;
}

export function AgentBubbleContainer() {
  return (
    <AgentContextProvider>
      <AgentBubbleInner />
    </AgentContextProvider>
  );
}

