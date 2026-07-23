import { NextRequest } from "next/server";

import { handleGET, handlePOST } from "./handlers";

/**
 * GET /api/admin/saas-management/users
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handleGET(request);
}

/**
 * POST /api/admin/saas-management/users
 */
export async function POST(request: NextRequest) {
  return handlePOST(request);
}
