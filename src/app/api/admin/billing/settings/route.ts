import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { rateLimitConfigs, withRateLimit } from "@/lib/rate-limiting";
import { createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

const billingSettingsSchema = z.object({
  business_name: z.string().optional().nullable(),
  business_rut: z.string().optional().nullable(),
  business_address: z.string().optional().nullable(),
  business_phone: z.string().optional().nullable(),
  business_email: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  header_text: z.string().optional().nullable(),
  footer_text: z.string().optional().nullable(),
  terms_and_conditions: z.string().optional().nullable(),
  default_document_type: z.enum(["boleta", "factura"]).optional(),
  printer_type: z.enum(["thermal", "a4", "letter", "custom"]).optional(),
  printer_width_mm: z.number().optional(),
  printer_height_mm: z.number().optional(),
  auto_print_receipt: z.boolean().optional().default(true),
});

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.general) as unknown)(
      request,
      async () => {
        const supabase = await createClient();

        // Check admin authorization
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: isAdmin } = (await supabase.rpc("is_admin", {
          user_id: user.id,
        } as IsAdminParams)) as {
          data: IsAdminResult | null;
          error: Error | null;
        };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        // Get branch context
        const branchContext = await getBranchContext(request, user.id);

        // Get settings for the branch
        let branchSettings = null;
        if (branchContext.branchId) {
          const { data, error: settingsError } = await supabase
            .from("pos_settings")
            .select("*")
            .eq("branch_id", branchContext.branchId)
            .maybeSingle();

          if (settingsError && settingsError.code !== "PGRST116") {
            logger.error(
              "Error fetching branch billing settings",
              settingsError,
            );
          } else {
            branchSettings = data;
          }
        }

        // Get organization-level settings
        const { data: orgSettings } = await supabase
          .from("organization_settings")
          .select("*")
          .eq("organization_id", branchContext.organizationId!)
          .maybeSingle();

        // Merge logic: Branch settings > Organization settings > Defaults
        const getMergedValue = (
          field: string,
          defaultValue: unknown = null,
        ) => {
          if (
            branchSettings &&
            branchSettings[field] !== null &&
            branchSettings[field] !== undefined &&
            branchSettings[field] !== ""
          ) {
            return branchSettings[field];
          }
          if (
            orgSettings &&
            orgSettings[field] !== null &&
            orgSettings[field] !== undefined &&
            orgSettings[field] !== ""
          ) {
            return orgSettings[field];
          }
          return defaultValue;
        };

        const mergedSettings = {
          business_name: getMergedValue("business_name"),
          business_rut: getMergedValue("business_rut"),
          business_address: getMergedValue("business_address"),
          business_phone: getMergedValue("business_phone"),
          business_email: getMergedValue("business_email"),
          logo_url: getMergedValue("logo_url"),
          header_text: getMergedValue("header_text"),
          footer_text: getMergedValue("footer_text"),
          terms_and_conditions: getMergedValue("terms_and_conditions"),
          default_document_type: getMergedValue(
            "default_document_type",
            "boleta",
          ),
          printer_type: getMergedValue("printer_type", "thermal"),
          printer_width_mm: getMergedValue("printer_width_mm", 80),
          printer_height_mm: getMergedValue("printer_height_mm", 297),
          auto_print_receipt: getMergedValue("auto_print_receipt", true),
        };

        return createApiSuccessResponse(mergedSettings);
      },
    );
  } catch (error) {
    logger.error("Error in Billing settings GET API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await (withRateLimit(rateLimitConfigs.modification) as unknown)(
      request,
      async () => {
        const supabase = await createClient();

        // Check admin authorization
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: isAdmin } = (await supabase.rpc("is_admin", {
          user_id: user.id,
        } as IsAdminParams)) as {
          data: IsAdminResult | null;
          error: Error | null;
        };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        // Get branch context
        const branchContext = await getBranchContext(request, user.id);

        // Parse and validate request body
        const body = await request.json();
        const validatedData = billingSettingsSchema.parse(body);

        let result;

        // GLOBAL UPDATE LOGIC for Super Admins
        if (!branchContext.branchId && branchContext.isSuperAdmin) {
          logger.info("Global Billing settings update initiated", {
            organizationId: branchContext.organizationId,
          });

          // 1. Update organization-level settings
          const { data: orgSettings, error: orgError } = await supabase
            .from("organization_settings")
            .upsert(
              {
                organization_id: branchContext.organizationId,
                ...validatedData,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "organization_id" },
            )
            .select()
            .single();

          if (orgError) {
            logger.error(
              "Error updating global organization billing settings",
              orgError,
            );
            return NextResponse.json(
              { error: "Error al actualizar configuración global de boletas" },
              { status: 500 },
            );
          }

          // 2. Sync ALL branches of the organization
          const { data: branches } = await supabase
            .from("branches")
            .select("id")
            .eq("organization_id", branchContext.organizationId!);

          if (branches && branches.length > 0) {
            const branchIds = branches.map((b) => b.id);

            for (const bId of branchIds) {
              await supabase.from("pos_settings").upsert(
                {
                  branch_id: bId,
                  ...validatedData,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: "branch_id" },
              );
            }
          }

          result = orgSettings;
        } else if (branchContext.branchId) {
          // BRANCH-SPECIFIC UPDATE
          const { data: updatedSettings, error: updateError } = await supabase
            .from("pos_settings")
            .upsert(
              {
                branch_id: branchContext.branchId,
                ...validatedData,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "branch_id" },
            )
            .select()
            .single();

          if (updateError) {
            logger.error("Error updating branch billing settings", updateError);
            return NextResponse.json(
              { error: "Error al actualizar configuración de sucursal" },
              { status: 500 },
            );
          }

          result = updatedSettings;
        } else {
          return NextResponse.json(
            {
              error: "Debe seleccionar una sucursal o ser super administrador",
            },
            { status: 400 },
          );
        }

        return createApiSuccessResponse(result);
      },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 },
      );
    }

    logger.error("Error in Billing settings PUT API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
