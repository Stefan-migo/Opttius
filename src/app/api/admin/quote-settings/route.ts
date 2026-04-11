import { NextRequest } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { APIError } from "@/lib/api/errors";
import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
      );
    }

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    if (!branchContext.organizationId) {
      return createApiErrorResponse(
        new Error("No se encontró la ID de la organización"),
      );
    }

    // Get quote settings for current branch (or default if no branch selected)
    // RLS will handle org security for the 'supabase' client
    let query = supabase
      .from("quote_settings")
      .select("*")
      .eq("organization_id", branchContext.organizationId);

    if (branchContext.branchId) {
      query = query.eq("branch_id", branchContext.branchId);
    } else {
      query = query.is("branch_id", null);
    }

    const { data: settings, error } = await query.limit(1).maybeSingle();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned
      logger.error("Error fetching quote settings", error);
      return createApiErrorResponse(
        new Error(`Failed to fetch quote settings: ${error.message}`),
      );
    }

    // Return default settings if none exist
    if (!settings) {
      return createApiSuccessResponse({
        treatment_prices: {
          anti_reflective: 15000,
          blue_light_filter: 20000,
          uv_protection: 10000,
          scratch_resistant: 12000,
          anti_fog: 8000,
          photochromic: 35000,
          polarized: 25000,
          tint: 15000,
        },
        lens_type_base_costs: {
          single_vision: 30000,
          bifocal: 45000,
          trifocal: 55000,
          progressive: 60000,
          reading: 25000,
          computer: 35000,
          sports: 40000,
        },
        lens_material_multipliers: {
          cr39: 1.0,
          polycarbonate: 1.2,
          high_index_1_67: 1.5,
          high_index_1_74: 2.0,
          trivex: 1.3,
          glass: 0.9,
        },
        default_labor_cost: 15000,
        default_tax_percentage: 19.0,
        default_expiration_days: 30,
        default_margin_percentage: 0,
        labor_cost_includes_tax: true,
        lens_cost_includes_tax: true,
        treatments_cost_includes_tax: true,
        volume_discounts: [],
        currency: "CLP",
        terms_and_conditions: null,
        notes_template: null,
      });
    }

    return createApiSuccessResponse(settings);
  } catch (error) {
    logger.error("Error in quote settings API GET", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return createApiErrorResponse(
        new APIError("Unauthorized", 401, "UNAUTHORIZED"),
      );
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return createApiErrorResponse(
        new APIError("Admin access required", 403, "FORBIDDEN"),
      );
    }

    const body = await request.json();

    // Get branch context
    const branchContext = await getBranchContext(request, user.id);

    if (!branchContext.organizationId) {
      return createApiErrorResponse(
        new Error("No se encontró la ID de la organización"),
      );
    }

    // Check if settings exist for this branch/org
    // Important: filter by organization_id because we use service role (bypasses RLS)
    let existingQuery = supabaseServiceRole
      .from("quote_settings")
      .select("id")
      .eq("organization_id", branchContext.organizationId);

    if (branchContext.branchId) {
      existingQuery = existingQuery.eq("branch_id", branchContext.branchId);
    } else {
      existingQuery = existingQuery.is("branch_id", null);
    }

    const { data: existingSettings } = await existingQuery
      .limit(1)
      .maybeSingle();

    const updateData: unknown = {
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    if (body.treatment_prices !== undefined)
      updateData.treatment_prices = body.treatment_prices;
    if (body.lens_type_base_costs !== undefined)
      updateData.lens_type_base_costs = body.lens_type_base_costs;
    if (body.lens_material_multipliers !== undefined)
      updateData.lens_material_multipliers = body.lens_material_multipliers;
    if (body.default_labor_cost !== undefined)
      updateData.default_labor_cost = body.default_labor_cost;
    if (body.default_tax_percentage !== undefined)
      updateData.default_tax_percentage = body.default_tax_percentage;
    if (body.default_expiration_days !== undefined)
      updateData.default_expiration_days = body.default_expiration_days;
    if (body.default_margin_percentage !== undefined)
      updateData.default_margin_percentage = body.default_margin_percentage;
    if (body.labor_cost_includes_tax !== undefined)
      updateData.labor_cost_includes_tax = body.labor_cost_includes_tax;
    if (body.lens_cost_includes_tax !== undefined)
      updateData.lens_cost_includes_tax = body.lens_cost_includes_tax;
    if (body.treatments_cost_includes_tax !== undefined)
      updateData.treatments_cost_includes_tax =
        body.treatments_cost_includes_tax;
    if (body.volume_discounts !== undefined)
      updateData.volume_discounts = body.volume_discounts;
    if (body.currency !== undefined) updateData.currency = body.currency;
    if (body.terms_and_conditions !== undefined)
      updateData.terms_and_conditions = body.terms_and_conditions;
    if (body.notes_template !== undefined)
      updateData.notes_template = body.notes_template;

    let result;

    // 1. Update/Insert the specific record found (Global or Branch)
    if (existingSettings) {
      // Update existing
      const { data, error } = await supabaseServiceRole
        .from("quote_settings")
        .update({
          ...updateData,
          organization_id: branchContext.organizationId,
        })
        .eq("id", existingSettings.id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating quote settings", error);
        return createApiErrorResponse(
          new Error(`Error al actualizar configuración: ${error.message}`),
        );
      }
      result = data;
    } else {
      // Insert new
      const { data, error } = await supabaseServiceRole
        .from("quote_settings")
        .insert({
          ...updateData,
          organization_id: branchContext.organizationId,
          branch_id: branchContext.branchId || null,
        })
        .select()
        .single();

      if (error) {
        logger.error("Error creating quote settings", error);
        return createApiErrorResponse(
          new Error(`Error al crear configuración: ${error.message}`),
        );
      }
      result = data;
    }

    // 2. If GLOBAL update by Super Admin, SYNC to all branches
    if (!branchContext.branchId && branchContext.isSuperAdmin) {
      logger.info("Syncing Global settings to all branches", {
        organizationId: branchContext.organizationId,
      });

      const { data: branches } = await supabase
        .from("branches")
        .select("id")
        .eq("organization_id", branchContext.organizationId);

      if (branches && branches.length > 0) {
        for (const branch of branches) {
          // Sync using upsert on branch_id which has idx_quote_settings_branch_unique
          // Although we could use manual check+insert/update here too for consistency
          await supabaseServiceRole.from("quote_settings").upsert(
            {
              organization_id: branchContext.organizationId,
              branch_id: branch.id,
              ...updateData,
            },
            { onConflict: "branch_id" },
          );
        }
      }
    }

    return createApiSuccessResponse(result);
  } catch (error) {
    logger.error("Error in quote settings PUT API", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error("Internal server error"),
    );
  }
}
