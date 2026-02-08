import { createServiceRoleClient } from "@/lib/supabase";
import { appLogger as logger } from "@/lib/logger";

export interface BackupTableData {
  data: any[];
  record_count: number;
  error?: string;
  skipped?: boolean;
}

export interface BackupData {
  backup_id: string;
  created_at: string;
  created_by?: string;
  organization_id: string;
  tables: Record<string, BackupTableData>;
  version: string;
}

export interface RestoreResult {
  success: boolean;
  message: string;
  tables_restored: number;
  total_records_restored: number;
  errors: number;
  restore_results: Record<string, any>;
  duration_seconds: number;
}

interface TableConfig {
  name: string;
  filter: string;
  anchor?: string;
}

const TABLES_CONFIG: TableConfig[] = [
  // --- Nivel 1: Nucleo Organizacional ---
  { name: "organizations", filter: "id" },
  { name: "organization_settings", filter: "organization_id" },
  { name: "branches", filter: "organization_id" },
  { name: "admin_users", filter: "organization_id" },
  { name: "admin_branch_access", filter: "branch_id", anchor: "branches" },
  { name: "pos_settings", filter: "organization_id" },
  { name: "schedule_settings", filter: "organization_id" },
  { name: "quote_settings", filter: "organization_id" },
  { name: "system_email_templates", filter: "organization_id" },

  // --- Nivel 2: Catalogos Maestros ---
  { name: "lens_families", filter: "organization_id" },
  {
    name: "lens_price_matrices",
    filter: "lens_family_id",
    anchor: "lens_families",
  },
  { name: "contact_lens_families", filter: "organization_id" },
  {
    name: "contact_lens_price_matrices",
    filter: "contact_lens_family_id",
    anchor: "contact_lens_families",
  },
  { name: "products", filter: "organization_id" },
  { name: "product_variants", filter: "product_id", anchor: "products" },
  { name: "product_option_fields", filter: "product_id", anchor: "products" },
  {
    name: "product_option_values",
    filter: "variant_id",
    anchor: "product_variants",
  },
  { name: "customers", filter: "organization_id" },

  // --- Nivel 3: Operaciones ---
  { name: "orders", filter: "organization_id" },
  { name: "order_items", filter: "order_id", anchor: "orders" },
  { name: "order_payments", filter: "order_id", anchor: "orders" },
  { name: "payment_installments", filter: "order_id", anchor: "orders" },
  { name: "pos_sessions", filter: "branch_id", anchor: "branches" },
  { name: "pos_transactions", filter: "order_id", anchor: "orders" },
  {
    name: "cash_register_closures",
    filter: "pos_session_id",
    anchor: "pos_sessions",
  },
  { name: "appointments", filter: "organization_id" },
  { name: "prescriptions", filter: "organization_id" },
  { name: "quotes", filter: "organization_id" },
  { name: "lab_work_orders", filter: "organization_id" },
  {
    name: "lab_work_order_status_history",
    filter: "work_order_id",
    anchor: "lab_work_orders",
  },
  {
    name: "customer_lens_purchases",
    filter: "customer_id",
    anchor: "customers",
  },
  { name: "payments", filter: "organization_id" },
  { name: "product_branch_stock", filter: "branch_id", anchor: "branches" },

  // --- Nivel 4: Inteligencia y Soporte ---
  { name: "ai_insights", filter: "organization_id" },
  { name: "saas_support_tickets", filter: "organization_id" },
  { name: "optical_internal_support_tickets", filter: "organization_id" },
  { name: "user_tour_progress", filter: "organization_id" },
  { name: "subscriptions", filter: "organization_id" },
];

export class BackupService {
  static async generateBackup(
    organizationId: string,
    userIdOrEmail?: string,
  ): Promise<BackupData> {
    const backupStartTime = new Date();
    const backupId = `backup_${organizationId}_${backupStartTime.toISOString().replace(/[:.]/g, "-")}`;
    const supabaseService = createServiceRoleClient();

    const backupData: BackupData = {
      backup_id: backupId,
      created_at: backupStartTime.toISOString(),
      created_by: userIdOrEmail || "system",
      organization_id: organizationId,
      tables: {},
      version: "1.3",
    };

    const idsCache: Record<string, string[]> = {};
    logger.info("Iniciando backup profundo y relacional", {
      organizationId,
      backupId,
    });

    for (const config of TABLES_CONFIG) {
      try {
        const query = supabaseService.from(config.name).select("*");

        if (config.anchor) {
          const anchorIds = idsCache[config.anchor] || [];
          if (anchorIds.length === 0) {
            backupData.tables[config.name] = {
              data: [],
              record_count: 0,
              skipped: true,
            };
            continue;
          }
          // Dividir anchorIds si son demasiados (PostgREST limit)
          const chunks = [];
          for (let i = 0; i < anchorIds.length; i += 500) {
            chunks.push(anchorIds.slice(i, i + 500));
          }

          let allData: any[] = [];
          for (const chunk of chunks) {
            const { data, error } = await supabaseService
              .from(config.name)
              .select("*")
              .in(config.filter, chunk);
            if (error) throw error;
            if (data) allData = [...allData, ...data];
          }

          backupData.tables[config.name] = {
            data: allData,
            record_count: allData.length,
          };
          if (allData.length > 0)
            idsCache[config.name] = allData
              .map((row: any) => row.id)
              .filter(Boolean);
        } else {
          const { data, error } = await query.eq(config.filter, organizationId);
          if (error) throw error;
          backupData.tables[config.name] = {
            data: data || [],
            record_count: data?.length || 0,
          };
          if (data && data.length > 0)
            idsCache[config.name] = data
              .map((row: any) => row.id)
              .filter(Boolean);
        }
      } catch (err: any) {
        logger.error(`Error en backup de tabla ${config.name}`, {
          error: err.message,
          organizationId,
        });
        backupData.tables[config.name] = {
          data: [],
          record_count: 0,
          error: err.message,
        };
      }
    }

    return backupData;
  }

  static async restoreBackup(
    organizationId: string,
    backupData: BackupData,
  ): Promise<RestoreResult> {
    const restoreStartTime = new Date();
    const supabaseService = createServiceRoleClient();
    const restoreResults: Record<string, any> = {};
    let totalRestored = 0;
    let totalErrors = 0;

    if (backupData.organization_id !== organizationId) {
      throw new Error(
        `Seguridad: El backup no pertenece a esta organización (${organizationId})`,
      );
    }

    // --- PASO 1: LIMPIEZA ESTRATEGICA ---
    // Limpiamos las tablas base. El CASCADE se encarga de la mayoria de las dependencias.
    for (const config of [...TABLES_CONFIG].reverse()) {
      if (config.anchor) continue;

      const { error: deleteError } = await supabaseService
        .from(config.name)
        .delete()
        .eq(config.filter, organizationId);

      if (deleteError) {
        logger.warn(`Limpieza fallida o restringida en ${config.name}`, {
          deleteError,
        });
      }
    }

    // --- PASO 2: RESTAURACION EN ORDEN ---
    for (const config of TABLES_CONFIG) {
      const tableEntry = backupData.tables[config.name];
      const tableData = tableEntry?.data;

      if (!tableData || tableData.length === 0) {
        restoreResults[config.name] = { status: "skipped" };
        continue;
      }

      try {
        const batchSize = 100;
        let inserted = 0;
        let insertErrors = 0;

        for (let i = 0; i < tableData.length; i += batchSize) {
          const batch = tableData.slice(i, i + batchSize).map((row) => {
            if (!config.anchor)
              return { ...row, [config.filter]: organizationId };
            return row;
          });

          const { error: upsertError } = await supabaseService
            .from(config.name)
            .upsert(batch, { onConflict: "id" });

          if (upsertError) {
            logger.error(`Error en upsert de ${config.name}`, { upsertError });
            insertErrors += batch.length;
          } else {
            inserted += batch.length;
          }
        }

        restoreResults[config.name] = {
          status: insertErrors > 0 ? "partial" : "success",
          restored: inserted,
          errors: insertErrors,
        };
        totalRestored += inserted;
        totalErrors += insertErrors;
      } catch (e: any) {
        logger.error(`Excepcion en restauracion de ${config.name}`, {
          error: e.message,
        });
        restoreResults[config.name] = { status: "error", message: e.message };
        totalErrors++;
      }
    }

    const duration = (Date.now() - restoreStartTime.getTime()) / 1000;
    return {
      success: totalErrors === 0,
      message: `Restauración completa: ${totalRestored} registros.`,
      tables_restored: Object.keys(restoreResults).length,
      total_records_restored: totalRestored,
      errors: totalErrors,
      restore_results: restoreResults,
      duration_seconds: duration,
    };
  }
}
