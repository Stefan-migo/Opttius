import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import {
  createPaginatedResponse,
  createApiErrorResponse,
} from "@/lib/api/response";
import { extractPaginationParams } from "@/lib/api/response";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: agreementId } = await params;
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

    const { data: agreement } = await supabase
      .from("agreements")
      .select("id")
      .eq("id", agreementId)
      .single();

    if (!agreement) {
      return NextResponse.json(
        { error: "Convenio no encontrado" },
        { status: 404 },
      );
    }

    const { page, limit } = extractPaginationParams(request.url);
    const offset = (page - 1) * limit;

    const serviceSupabase = createServiceRoleClient();

    let items: Array<{
      customer_id: string;
      first_name: string | null;
      last_name: string | null;
      email: string | null;
      phone: string | null;
      rut: string | null;
      order_count: number;
      last_order_at: string;
      total_copago: number;
      total_institutional: number;
    }> = [];
    let total = 0;

    try {
      // Get total count (table may not exist if migration not run)
      const { count, error: countError } = await serviceSupabase
        .from("agreement_customers")
        .select("*", { count: "exact", head: true })
        .eq("agreement_id", agreementId);

      if (countError) {
        logger.warn("agreement_customers query failed (table may not exist)", {
          error: countError,
          code: (countError as any)?.code,
        });
        return createPaginatedResponse([], { page, limit, total: 0 });
      }

      total = count ?? 0;

      // Get agreement_customers
      const { data: acRows, error: acError } = await serviceSupabase
        .from("agreement_customers")
        .select(
          "customer_id, order_count, last_order_at, total_copago, total_institutional",
        )
        .eq("agreement_id", agreementId)
        .order("last_order_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (acError) {
        logger.warn("agreement_customers fetch failed", { error: acError });
        return createPaginatedResponse([], { page, limit, total: 0 });
      }

      const paginatedRows = acRows ?? [];

      // Fetch customer details in a separate query
      const customerIds = paginatedRows
        .map((r: any) => r.customer_id)
        .filter(Boolean);
      const customersMap: Record<
        string,
        {
          first_name?: string;
          last_name?: string;
          email?: string;
          phone?: string;
          rut?: string;
        }
      > = {};
      if (customerIds.length > 0) {
        const { data: customers } = await serviceSupabase
          .from("customers")
          .select("id, first_name, last_name, email, phone, rut")
          .in("id", customerIds);
        (customers || []).forEach((c: any) => {
          customersMap[c.id] = c;
        });
      }

      items = paginatedRows.map((r: any) => {
        const cust = customersMap[r.customer_id];
        return {
          customer_id: r.customer_id,
          first_name: cust?.first_name ?? null,
          last_name: cust?.last_name ?? null,
          email: cust?.email ?? null,
          phone: cust?.phone ?? null,
          rut: cust?.rut ?? null,
          order_count: r.order_count,
          last_order_at: r.last_order_at,
          total_copago: Number(r.total_copago ?? 0),
          total_institutional: Number(r.total_institutional ?? 0),
        };
      });
    } catch (innerError) {
      logger.warn("agreement_customers error (returning empty)", {
        error: innerError,
      });
      return createPaginatedResponse([], { page, limit, total: 0 });
    }

    return createPaginatedResponse(items, { page, limit, total });
  } catch (error) {
    logger.error("Agreement customers GET error", { error });
    return createApiErrorResponse(error as Error);
  }
}
