import { appLogger as logger } from "@/lib/logger";
import { fromTable } from "@/types/supabase";
import type { Database } from "@/types/supabase.generated";
import { createServiceRoleClient } from "@/utils/supabase/server";

import type { CreateNotificationParams } from "../notification-service";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    minimumFractionDigits: 0,
  }).format(amount);
}

export async function createAdminNotification(
  params: CreateNotificationParams,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    let organizationId: string | null = params.organizationId ?? null;
    let branchId: string | null = params.branchId ?? null;

    if (!organizationId && branchId) {
      const { data: branch } = await supabase
        .from("branches")
        .select("organization_id")
        .eq("id", branchId)
        .single();
      organizationId = branch?.organization_id || null;
    }

    if (
      (!organizationId || !branchId) &&
      params.relatedEntityId &&
      params.relatedEntityType
    ) {
      const entityTableMap: Record<
        string,
        { table: string; hasBranch: boolean }
      > = {
        order: { table: "orders", hasBranch: true },
        quote: { table: "quotes", hasBranch: true },
        work_order: { table: "lab_work_orders", hasBranch: true },
        appointment: { table: "appointments", hasBranch: true },
        customer: { table: "customers", hasBranch: true },
        product: { table: "products", hasBranch: true },
      };

      const mapping = entityTableMap[params.relatedEntityType];
      if (mapping) {
        const cols = [
          "organization_id",
          ...(mapping.hasBranch ? ["branch_id"] : []),
        ].join(", ");
        const { data: entity } = await fromTable(
          supabase,
          mapping.table as keyof Database["public"]["Tables"],
        )
          .select(cols)
          .eq("id", params.relatedEntityId)
          .single();
        if (entity) {
          organizationId =
            organizationId ??
            (entity as unknown as Record<string, string>).organization_id ??
            null;
          if (mapping.hasBranch) {
            branchId =
              branchId ??
              (entity as unknown as Record<string, string>).branch_id ??
              null;
          }
        }
      }
    }

    if (params.targetAdminRole === "root") {
      organizationId = null;
      branchId = null;
    }

    const { data: settingsRows } = await supabase.rpc(
      "get_notification_setting_effective",
      {
        p_notification_type: params.type,
        p_organization_id: organizationId,
        p_branch_id: branchId,
      },
    );

    const settingsData = Array.isArray(settingsRows)
      ? settingsRows[0]
      : settingsRows;
    if (settingsData && settingsData.enabled === false) {
      logger.info(`Notification type ${params.type} is disabled, skipping...`);
      return { success: true };
    }

    const priority = settingsData?.priority || params.priority || "medium";

    const { error: insertError } = await supabase
      .from("admin_notifications")
      .insert({
        type: params.type as string,
        priority,
        title: params.title,
        message: params.message,
        related_entity_type: params.relatedEntityType,
        related_entity_id: params.relatedEntityId,
        action_url: params.actionUrl,
        action_label: params.actionLabel,
        metadata: params.metadata || {},
        target_admin_id: params.targetAdminId || null,
        target_admin_role: params.targetAdminRole || null,
        branch_id: branchId,
        organization_id: organizationId,
        created_by_system: true,
      });

    if (insertError) {
      logger.error("Error creating notification:", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true };
  } catch (error) {
    logger.error("Error in createAdminNotification:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
