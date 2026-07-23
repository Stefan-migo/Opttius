import { NextRequest } from "next/server";

import { handleDELETE,handleGET, handlePATCH } from "./handlers";

/**
 * GET /api/admin/saas-management/organizations/[id]
 * Obtener detalles completos de una organización
 */
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  return handleGET(request, { params });
}

/**
 * PATCH /api/admin/saas-management/organizations/[id]
 * Actualizar organización
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  return handlePATCH(request, { params });
}

/**
 * DELETE /api/admin/saas-management/organizations/[id]
 * Eliminar organización completamente
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return handleDELETE(request, { params });
}
