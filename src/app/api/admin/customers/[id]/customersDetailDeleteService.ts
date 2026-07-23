/**
 * Customer Detail DELETE service — DELETE handler for removing a customer.
 * Extracted from route.ts to reduce file size. No behavioral changes.
 */
import { NextRequest } from "next/server";

import {
  createApiErrorResponse,
  createApiSuccessResponse,
} from "@/lib/api/response";
import { appLogger as logger } from "@/lib/logger";

import {
  authenticateAndGetContext,
  buildBranchFilter,
} from "./customersDetailShared";

export async function handleDeleteCustomer(
  request: NextRequest,
  params: { id: string },
) {
  try {
    const { context, supabase } = await authenticateAndGetContext(
      request,
      "DELETE",
    );
    const applyBranchFilter = buildBranchFilter(context);

    // Verify customer exists and user has access
    const { data: existingCustomer } = await applyBranchFilter(
      supabase.from("customers").select("id, branch_id").eq("id", params.id),
    ).single();
    if (!existingCustomer) {
      return createApiErrorResponse(
        new Error("Customer not found or access denied"),
      );
    }

    const { error: deleteError } = await supabase
      .from("customers")
      .delete()
      .eq("id", params.id);

    if (deleteError) {
      logger.error("Error deleting customer", deleteError);
      return createApiErrorResponse(new Error("Failed to delete customer"));
    }

    return createApiSuccessResponse({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    logger.error("Error in customer delete API DELETE", error);
    return createApiErrorResponse(
      error instanceof Error ? error : new Error(String(error)),
    );
  }
}
