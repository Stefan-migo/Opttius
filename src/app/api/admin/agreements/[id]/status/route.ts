import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { withRateLimit, rateLimitConfigs } from "@/lib/api/middleware";
import {
  createApiSuccessResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import { z } from "zod";

const statusSchema = z.object({
  status: z.enum(["active", "suspended", "expired", "cancelled"]),
});

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await (withRateLimit(rateLimitConfigs.agreements) as any)(
      request,
      async () => {
        const { id } = await params;
        const supabase = await createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: isAdmin } = (await supabase.rpc("is_admin", {
          user_id: user.id,
        } as IsAdminParams)) as { data: IsAdminResult | null };
        if (!isAdmin) {
          return NextResponse.json(
            { error: "Admin access required" },
            { status: 403 },
          );
        }

        const body = await request.json();
        const parsed = statusSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "status inválido", details: parsed.error.flatten() },
            { status: 400 },
          );
        }

        const { data: agreement, error } = await supabase
          .from("agreements")
          .update({
            status: parsed.data.status,
            updated_by: user.id,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) {
          logger.error("Error updating agreement status", { error });
          return createApiErrorResponse(new Error(error.message));
        }

        if (!agreement) {
          return NextResponse.json(
            { error: "Convenio no encontrado" },
            { status: 404 },
          );
        }

        return createApiSuccessResponse(agreement);
      },
    );
  } catch (error) {
    logger.error("Agreement status PATCH error", { error });
    return createApiErrorResponse(error as Error);
  }
}
