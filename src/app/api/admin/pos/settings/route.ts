import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createApiSuccessResponse } from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";

import {
  getMergedValue,
  withPOSAuth,
  withRateLimitWrapper,
} from "./posSettingsHandler";

const posSettingsSchema = z.object({
  min_deposit_percent: z.number().min(0).max(100).optional(),
  min_deposit_amount: z.number().min(0).optional().nullable(),
  // Billing/Boleta fields
  business_name: z.string().optional().nullable(),
  business_rut: z.string().optional().nullable(),
  business_address: z.string().optional().nullable(),
  business_phone: z.string().optional().nullable(),
  business_email: z.string().optional().nullable(),
  logo_url: z.string().optional().nullable(),
  header_text: z.string().optional().nullable(),
  footer_text: z.string().optional().nullable(),
  terms_and_conditions: z.string().optional().nullable(),
  default_document_type: z.string().optional().nullable(),
  printer_type: z.string().optional().nullable(),
  printer_width_mm: z.number().optional().nullable(),
  printer_height_mm: z.number().optional().nullable(),
  auto_print_receipt: z.boolean().optional().default(true),
});

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    return await withRateLimitWrapper(request, "general", async () => {
      const auth = await withPOSAuth(request, "ver la configuración del POS");
      if (auth instanceof NextResponse) return auth;
      const { supabase, branchId, organizationId } = auth;

      let settings = null;
      if (branchId) {
        const { data, error: settingsError } = await supabase
          .from("pos_settings")
          .select("*")
          .eq("branch_id", branchId)
          .maybeSingle();
        if (settingsError && settingsError.code !== "PGRST116") {
          logger.error("Error fetching POS settings", settingsError);
        } else {
          settings = data;
        }
      }

      const { data: orgSettings } = await supabase
        .from("organization_settings")
        .select("*")
        .eq("organization_id", organizationId!)
        .maybeSingle();

      return createApiSuccessResponse({
        min_deposit_percent: getMergedValue(settings, orgSettings, "min_deposit_percent", 50.0),
        min_deposit_amount: getMergedValue(settings, orgSettings, "min_deposit_amount", null),
        business_name: getMergedValue(settings, orgSettings, "business_name"),
        business_rut: getMergedValue(settings, orgSettings, "business_rut"),
        business_address: getMergedValue(settings, orgSettings, "business_address"),
        business_phone: getMergedValue(settings, orgSettings, "business_phone"),
        business_email: getMergedValue(settings, orgSettings, "business_email"),
        logo_url: getMergedValue(settings, orgSettings, "logo_url"),
        header_text: getMergedValue(settings, orgSettings, "header_text"),
        footer_text: getMergedValue(settings, orgSettings, "footer_text"),
        terms_and_conditions: getMergedValue(settings, orgSettings, "terms_and_conditions"),
        default_document_type: getMergedValue(settings, orgSettings, "default_document_type", "boleta"),
        printer_type: getMergedValue(settings, orgSettings, "printer_type", "thermal"),
        printer_width_mm: getMergedValue(settings, orgSettings, "printer_width_mm", 80),
        printer_height_mm: getMergedValue(settings, orgSettings, "printer_height_mm", 297),
        auto_print_receipt: getMergedValue(settings, orgSettings, "auto_print_receipt", true),
      });
    });
  } catch (error) {
    logger.error("Error in POS settings GET API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    return await withRateLimitWrapper(request, "modification", async () => {
      const auth = await withPOSAuth(request, "actualizar la configuración del POS");
      if (auth instanceof NextResponse) return auth;
      const { supabase, branchId, organizationId, isSuperAdmin } = auth;

      const body = await request.json();
      const validatedData = posSettingsSchema.parse(body);

      let result;

      // GLOBAL UPDATE for Super Admins
      if (!branchId && isSuperAdmin) {
        logger.info("Global POS settings update initiated", { organizationId });

        const { data: orgSettings, error: orgError } = await supabase
          .from("organization_settings")
          .upsert(
            { organization_id: organizationId, ...validatedData, updated_at: new Date().toISOString() },
            { onConflict: "organization_id" },
          )
          .select()
          .single();

        if (orgError) {
          logger.error("Error updating global organization settings", orgError);
          return NextResponse.json(
            { error: "Error al actualizar configuración global de organización" },
            { status: 500 },
          );
        }

        // Sync all branches
        const { data: branches } = await supabase
          .from("branches")
          .select("id")
          .eq("organization_id", organizationId!);
        if (branches && branches.length > 0) {
          for (const b of branches) {
            await supabase.from("pos_settings").upsert(
              { branch_id: b.id, organization_id: organizationId, ...validatedData, updated_at: new Date().toISOString() },
              { onConflict: "branch_id" },
            );
          }
        }

        result = orgSettings;
      } else {
        // BRANCH-SPECIFIC UPDATE
        const { data: existingSettings } = await supabase
          .from("pos_settings")
          .select("id")
          .eq("branch_id", branchId!)
          .maybeSingle();

        if (existingSettings) {
          const { data: updatedSettings, error: updateError } = await supabase
            .from("pos_settings")
            .update({ ...validatedData, updated_at: new Date().toISOString() })
            .eq("branch_id", branchId!)
            .select()
            .single();
          if (updateError) {
            logger.error("Error updating POS settings", updateError);
            return NextResponse.json({ error: "Error al actualizar configuración" }, { status: 500 });
          }
          result = updatedSettings;
        } else {
          const { data: newSettings, error: insertError } = await supabase
            .from("pos_settings")
            .insert({ branch_id: branchId!, organization_id: organizationId, ...validatedData })
            .select()
            .single();
          if (insertError) {
            logger.error("Error creating POS settings", insertError);
            return NextResponse.json({ error: "Error al crear configuración" }, { status: 500 });
          }
          result = newSettings;
        }
      }

      logger.info("POS settings updated successfully", {
        branchId: branchId || "GLOBAL",
        organizationId,
      });

      return createApiSuccessResponse(result);
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    logger.error("Error in POS settings PUT API", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
