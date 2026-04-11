import { NextRequest, NextResponse } from "next/server";

import { getBranchContext } from "@/lib/api/branch-middleware";
import { rateLimitConfigs, withRateLimit } from "@/lib/api/middleware";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return await (withRateLimit(rateLimitConfigs.payment) as unknown)(
      request,
      async () => {
        const { id } = await params;
        const supabase = await createClient();
        const supabaseServiceRole = createServiceRoleClient();

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

        // Verify order exists and belongs to branch (if applicable)
        const orderQuery = supabaseServiceRole
          .from("orders")
          .select("id, branch_id")
          .eq("id", id)
          .single();

        const { data: order, error: orderError } = await orderQuery;

        if (orderError || !order) {
          return NextResponse.json(
            { error: "Orden no encontrada" },
            { status: 404 },
          );
        }

        // Check branch access
        if (
          branchContext.branchId &&
          order.branch_id !== branchContext.branchId &&
          !branchContext.isSuperAdmin
        ) {
          return NextResponse.json(
            { error: "No tiene acceso a esta orden" },
            { status: 403 },
          );
        }

        // Get payments for this order
        const { data: payments, error: paymentsError } =
          await supabaseServiceRole
            .from("order_payments")
            .select("*")
            .eq("order_id", id)
            .order("paid_at", { ascending: false });

        if (paymentsError) {
          logger.error("Error fetching payments", paymentsError);
          return NextResponse.json(
            { error: "Error al cargar pagos" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          payments: payments || [],
        });
      },
    );
  } catch (error) {
    logger.error("Error in orders [id] payments GET API", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
