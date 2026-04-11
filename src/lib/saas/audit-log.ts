/**
 * SaaS Audit Log Module
 *
 * Provides functionality to log actions performed by root/dev users
 * in the SaaS Management Engine.
 *
 * @module lib/saas/audit-log
 */

import { createServiceRoleClient } from "@/utils/supabase/server";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "suspend"
  | "activate"
  | "cancel"
  | "change_tier"
  | "extend"
  | "reactivate";

export type AuditTargetType =
  | "organization"
  | "subscription"
  | "tier"
  | "user"
  | "branch"
  | "config";

export interface AuditLogEntry {
  userId?: string;
  userEmail?: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  targetName?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit log entry
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("saas_audit_log").insert({
    user_id: entry.userId || null,
    user_email: entry.userEmail || null,
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId || null,
    target_name: entry.targetName || null,
    old_value: entry.oldValue ? JSON.stringify(entry.oldValue) : null,
    new_value: entry.newValue ? JSON.stringify(entry.newValue) : null,
    ip_address: entry.ipAddress || null,
    user_agent: entry.userAgent || null,
    metadata: entry.metadata || {},
  });

  if (error) {
    // Log but don't throw - audit logging should be non-blocking
    console.error("Failed to record audit log:", error);
  }
}

/**
 * Get audit logs for a specific target
 */
export async function getAuditLogsForTarget(
  targetType: AuditTargetType,
  targetId: string,
  options?: {
    limit?: number;
    offset?: number;
  },
): Promise<{
  logs: Array<{
    id: string;
    userEmail: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    targetName: string | null;
    oldValue: Record<string, unknown> | null;
    newValue: Record<string, unknown> | null;
    createdAt: string;
  }>;
  total: number;
}> {
  const supabase = createServiceRoleClient();
  const limit = options?.limit || 20;
  const offset = options?.offset || 0;

  const { data, count, error } = await supabase
    .from("saas_audit_log")
    .select("*", { count: "exact" })
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return {
    logs: (data || []).map((log) => ({
      id: log.id,
      userEmail: log.user_email,
      action: log.action,
      targetType: log.target_type,
      targetId: log.target_id,
      targetName: log.target_name,
      oldValue: log.old_value ? JSON.parse(log.old_value) : null,
      newValue: log.new_value ? JSON.parse(log.new_value) : null,
      createdAt: log.created_at,
    })),
    total: count || 0,
  };
}

/**
 * Get recent audit logs for the SaaS dashboard
 */
export async function getRecentAuditLogs(limit: number = 50): Promise<
  Array<{
    id: string;
    userEmail: string | null;
    action: string;
    targetType: string;
    targetName: string | null;
    createdAt: string;
  }>
> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("saas_audit_log")
    .select("id, user_email, action, target_type, target_name, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent audit logs: ${error.message}`);
  }

  return (data || []).map((log) => ({
    id: log.id,
    userEmail: log.user_email,
    action: log.action,
    targetType: log.target_type,
    targetName: log.target_name,
    createdAt: log.created_at,
  }));
}

/**
 * Extract client info from request headers
 */
export function getClientInfoFromRequest(request: Request): {
  ipAddress: string;
  userAgent: string;
} {
  const xForwardedFor = request.headers.get("x-forwarded-for");
  const xRealIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  const ipAddress =
    cfConnectingIp ||
    xForwardedFor?.split(",")[0]?.trim() ||
    xRealIp ||
    "unknown";

  const userAgent = request.headers.get("user-agent") || "unknown";

  return { ipAddress, userAgent };
}
