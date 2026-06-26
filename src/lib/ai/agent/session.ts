// @deprecated Migrate to agent_conversations/agent_messages after database-reformation.
/**
 * AgentSession builder — pure function that constructs an AgentSession
 * from the incoming request body.
 *
 * @module lib/ai/agent/session
 */

import { v4 as uuidv4 } from "uuid";

import type { AgentScreenContext, AgentRole } from "../types";

export interface AgentSession {
  /** The user's message text */
  message: string;
  /** Session UUID (new or reused from chat_sessions) */
  sessionId: string;
  /** Screen context metadata */
  context: AgentScreenContext;
  /** Resolved user role */
  role: AgentRole;
}

export interface SessionValidationError {
  status: 400;
  error: string;
  missingFields: string[];
}

/**
 * Build an AgentSession from an unvalidated request body.
 * Returns a SessionValidationError instead of throwing, so the
 * route handler can short-circuit to a 400 response.
 */
export function buildSession(
  body: Record<string, unknown>,
): AgentSession | SessionValidationError {
  const missingFields: string[] = [];

  const message = body.message;
  if (!message || typeof message !== "string") {
    missingFields.push("message");
  }

  const ctx = body.context as Record<string, unknown> | undefined;
  if (!ctx || typeof ctx !== "object") {
    missingFields.push("context");
  }

  const role = ctx?.role as string | undefined;
  if (!role || typeof role !== "string") {
    missingFields.push("context.role");
  }

  const orgId = ctx?.org_id as string | undefined;
  if (!orgId || typeof orgId !== "string") {
    missingFields.push("context.org_id");
  }

  if (missingFields.length > 0) {
    return {
      status: 400,
      error: `Missing required fields: ${missingFields.join(", ")}`,
      missingFields,
    };
  }

  // ponytail: uuid v4 — deterministic IDs if session_id reuse is needed later
  const sessionId = (body.session_id as string) || uuidv4();

  return {
    message: message as string,
    sessionId,
    role: role as AgentRole,
    context: {
      route: (ctx!.route as string) || "/admin",
      section: ctx!.section as string | undefined,
      branchId: (ctx!.branch_id as string) || null,
      branchName: ctx!.branch_name as string | undefined,
      role: role as AgentRole,
      orgId: orgId as string,
    },
  };
}
