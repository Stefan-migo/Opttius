import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";

import { handleExport } from "./_helpers/export";
import { handleDelete,handleHardDelete  } from "./_helpers/operations/delete";
import { handleDuplicate } from "./_helpers/operations/duplicate";
import { handleUpdateCategory } from "./_helpers/operations/updateCategory";
import { handleUpdateInventory } from "./_helpers/operations/updateInventory";
import { handleUpdatePricing } from "./_helpers/operations/updatePricing";
import { handleUpdateStatus } from "./_helpers/operations/updateStatus";
import { checkAdminAuth, validateBulkRequest } from "./_helpers/validation";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const auth = await checkAdminAuth(request);
    if (auth instanceof NextResponse) return auth;

    const parsed = validateBulkRequest(body);
    if (parsed instanceof NextResponse) return parsed;

    const { operation, product_ids, updates } = parsed;
    let results: unknown[] | NextResponse;

    switch (operation) {
      case "update_status":
        results = await handleUpdateStatus(auth.supabase, product_ids, updates);
        break;
      case "update_category":
        results = await handleUpdateCategory(auth.supabase, product_ids, updates);
        break;
      case "update_pricing":
        results = await handleUpdatePricing(auth.supabase, product_ids, updates);
        break;
      case "update_inventory":
        results = await handleUpdateInventory(
          auth.supabase,
          product_ids,
          updates,
          request,
          auth.user.id,
        );
        break;
      case "delete":
        results = await handleDelete(auth.supabase, product_ids);
        break;
      case "hard_delete":
        results = await handleHardDelete(auth.supabase, product_ids, updates);
        break;
      case "duplicate":
        results = await handleDuplicate(auth.supabase, product_ids);
        break;
      default:
        return NextResponse.json(
          { error: "Invalid bulk operation" },
          { status: 400 },
        );
    }

    if (results instanceof NextResponse) return results;

    await auth.supabase.rpc("log_admin_activity", {
      p_action: `bulk_${operation}`,
      p_resource_type: "product",
      p_resource_id: product_ids.join(","),
      p_details: JSON.stringify({
        operation,
        product_count: product_ids.length,
        updates,
      }),
    });

    const successIds = (results as { id?: string; product_id?: string }[])
      .map((r) => r.id ?? r.product_id)
      .filter(Boolean) as string[];

    return NextResponse.json({
      success: true,
      data: { success: successIds, failed: [] },
    });
  } catch (error) {
    logger.error("Error in bulk operations API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleExport(request);
  } catch (error) {
    logger.error("Error in export products API", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
