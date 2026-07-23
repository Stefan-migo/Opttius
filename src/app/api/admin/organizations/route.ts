import { NextRequest } from "next/server";

import { handleGET, handlePOST } from "./handlers";

/**
 * GET /api/admin/organizations
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  return handleGET(request);
}

/**
 * POST /api/admin/organizations
 */
export async function POST(request: NextRequest) {
  return handlePOST(request);
}
