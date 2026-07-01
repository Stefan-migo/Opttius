// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
import {
  getKnowledgeBase,
  type KnowledgeContext,
} from "../knowledge/base/knowledge-manager";
import type { LLMMessage } from "../types";

/**
 * Get relevant knowledge base context for the current conversation
 */
export async function getKnowledgeBaseContext(
  messages: LLMMessage[],
  userId: string,
  organizationId: string,
  userData?: { role?: string; name?: string },
): Promise<string | null> {
  try {
    const knowledgeBase = getKnowledgeBase();

    // Get the last user message to understand context
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((msg) => msg.role === "user");

    if (!lastUserMessage) return null;

    // Create knowledge context based on user role and recent conversation
    const knowledgeContext: KnowledgeContext = {
      userId,
      organizationId,
      userRole: userData?.role,
      recentActions: extractRecentActions(messages),
    };

    // Search for relevant knowledge
    const results = await knowledgeBase.searchKnowledge(
      lastUserMessage.content,
      knowledgeContext,
    );

    if (results.length === 0) return null;

    // Format the most relevant knowledge into context
    const topResult = results[0];
    const contextSections = [
      `=== SYSTEM KNOWLEDGE ===`,
      `Relevant Documentation: ${topResult.document.title}`,
      `Category: ${topResult.document.category}`,
      `Confidence: ${(topResult.similarity * 100).toFixed(1)}%`,
      ``,
      `Key Information:`,
      extractKeyInformation(topResult.document.content),
      `========================`,
    ];

    console.log(
      `Knowledge base context injected for query: "${lastUserMessage.content}"`,
    );
    console.log(
      `Top result: ${topResult.document.title} (${(topResult.similarity * 100).toFixed(1)}% confidence)`,
    );

    return contextSections.join("\n");
  } catch (error) {
    console.error("Failed to get knowledge base context:", error);
    return null;
  }
}

/**
 * Extract recent actions from conversation history
 */
export function extractRecentActions(messages: LLMMessage[]): string[] {
  const actions: string[] = [];
  const recentMessages = messages.slice(-10); // Last 10 messages

  for (const message of recentMessages) {
    if (message.role === "user") {
      // Extract action verbs and key terms
      const actionWords = [
        "create",
        "add",
        "delete",
        "update",
        "configure",
        "setup",
        "install",
        "activate",
        "deactivate",
        "enable",
        "disable",
        "schedule",
        "cancel",
        "modify",
        "change",
        "adjust",
      ];

      const messageLower = message.content.toLowerCase();
      for (const action of actionWords) {
        if (messageLower.includes(action)) {
          actions.push(action);
        }
      }
    }
  }

  return [...new Set(actions)]; // Remove duplicates
}

/**
 * Extract key information from document content
 */
export function extractKeyInformation(content: string): string {
  // Extract key sections (Overview, Steps, Configuration, etc.)
  const keySections = [
    "## Overview",
    "## Key Workflows",
    "## Configuration Options",
    "## Troubleshooting",
    "## Steps:",
    "**Steps:**",
  ];

  let extracted = "";

  for (const section of keySections) {
    const sectionIndex = content.indexOf(section);
    if (sectionIndex !== -1) {
      // Extract the section content (up to next ## header or end)
      const sectionContent = content.substring(sectionIndex);
      const nextHeader = sectionContent.indexOf("\n## ", 3);
      const relevantContent =
        nextHeader !== -1
          ? sectionContent.substring(0, nextHeader)
          : sectionContent.substring(0, 500); // Limit length

      extracted += `${relevantContent}\n\n`;
    }
  }

  // If no specific sections found, return first part of content
  if (!extracted) {
    extracted = content.substring(0, 300) + "...";
  }

  return extracted.trim();
}
