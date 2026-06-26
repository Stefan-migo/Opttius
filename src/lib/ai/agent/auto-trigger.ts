/**
 * Auto-mode trigger engine — monitors stock, appointments, and work orders.
 *
 * Each trigger produces a structured event with type, severity, entity, and
 * proposed action. Does NOT execute anything irreversible — the UI decides.
 * Rate-limited per type per org to avoid notification spam.
 *
 * @module lib/ai/agent/auto-trigger
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type TriggerType =
  | "low_stock"
  | "upcoming_appointment"
  | "overdue_work_order";
export type Severity = "info" | "warning" | "critical";

export interface TriggerEvent {
  type: TriggerType;
  severity: Severity;
  entity: { id: string; name: string; type: string };
  action: {
    label: string;
    type: "navigation" | "action" | "confirm";
    payload?: Record<string, unknown>;
  };
  message: string;
}

export interface AutoTriggerOptions {
  supabase: SupabaseClient;
  orgId: string;
  branchId: string | null;
  lowStockThreshold?: number;
}

// ponytail: in-memory cooldown map — per-org Redis TTL if multi-instance needed
const COOLDOWNS: Record<TriggerType, number> = {
  low_stock: 2 * 60 * 1000,
  upcoming_appointment: 5 * 60 * 1000,
  overdue_work_order: 10 * 60 * 1000,
};

const lastTriggered = new Map<string, number>();

function isOnCooldown(type: TriggerType, orgId: string): boolean {
  const key = `${type}:${orgId}`;
  const last = lastTriggered.get(key);
  if (!last) return false;
  return Date.now() - last < COOLDOWNS[type];
}

function setCooldown(type: TriggerType, orgId: string) {
  lastTriggered.set(`${type}:${orgId}`, Date.now());
}

/**
 * Check for trigger events across all monitored categories.
 * Returns an array of TriggerEvent — empty if nothing found or all on cooldown.
 * Safe to call on every bubble open; cooldown prevents spam.
 */
export async function checkTriggers(
  options: AutoTriggerOptions,
): Promise<TriggerEvent[]> {
  const { supabase, orgId, branchId, lowStockThreshold = 5 } = options;
  const events: TriggerEvent[] = [];

  // — 1. Low stock —
  if (!isOnCooldown("low_stock", orgId)) {
    let query = supabase
      .from("product_branch_stock")
      .select(
        `
        product_id,
        quantity,
        low_stock_threshold,
        products!inner(name)
      `,
      )
      .lt("quantity", lowStockThreshold);

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data: lowStockItems } = await query.limit(10);

    if (lowStockItems && lowStockItems.length > 0) {
      setCooldown("low_stock", orgId);
      for (const item of lowStockItems.slice(0, 3)) {
        const name = (item as any).products?.name || "Producto";
        const qty = (item as any).quantity ?? 0;
        events.push({
          type: "low_stock",
          severity: qty === 0 ? "critical" : "warning",
          entity: { id: (item as any).product_id, name, type: "product" },
          action: {
            label: "Ver producto",
            type: "navigation",
            payload: { path: `/admin/products/${(item as any).product_id}` },
          },
          message: `Stock bajo: "${name}" tiene ${qty} unidades.`,
        });
      }
    }
  }

  // — 2. Upcoming appointments within 24h —
  if (!isOnCooldown("upcoming_appointment", orgId)) {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    let query = supabase
      .from("appointments")
      .select("id, customer_name, scheduled_at")
      .eq("organization_id", orgId)
      .gte("scheduled_at", now.toISOString())
      .lte("scheduled_at", in24h.toISOString())
      .in("status", ["pending", "confirmed"]);

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data: upcoming } = await query.limit(10);

    if (upcoming && upcoming.length > 0) {
      setCooldown("upcoming_appointment", orgId);
      for (const apt of upcoming.slice(0, 3)) {
        const time = new Date(apt.scheduled_at).toLocaleTimeString("es-CL", {
          hour: "2-digit",
          minute: "2-digit",
        });
        events.push({
          type: "upcoming_appointment",
          severity: "info",
          entity: {
            id: apt.id,
            name: apt.customer_name || "Cliente",
            type: "appointment",
          },
          action: {
            label: "Ver cita",
            type: "navigation",
            payload: { path: `/admin/appointments/${apt.id}` },
          },
          message: `Cita próxima: "${apt.customer_name || "Cliente"}" a las ${time}.`,
        });
      }
    }
  }

  // — 3. Overdue work orders —
  if (!isOnCooldown("overdue_work_order", orgId)) {
    const now = new Date();

    let query = supabase
      .from("lab_work_orders")
      .select("id, title, deadline")
      .eq("organization_id", orgId)
      .lt("deadline", now.toISOString())
      .in("status", ["pending", "in_progress"]);

    if (branchId) {
      query = query.eq("branch_id", branchId);
    }

    const { data: overdue } = await query.limit(10);

    if (overdue && overdue.length > 0) {
      setCooldown("overdue_work_order", orgId);
      for (const wo of overdue.slice(0, 3)) {
        events.push({
          type: "overdue_work_order",
          severity: "warning",
          entity: { id: wo.id, name: wo.title || "OT", type: "work_order" },
          action: {
            label: "Ver OT",
            type: "navigation",
            payload: { path: `/admin/work-orders/${wo.id}` },
          },
          message: `OT vencida: "${wo.title || "Trabajo"}" pasó su fecha límite.`,
        });
      }
    }
  }

  return events;
}
