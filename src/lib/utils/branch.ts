/**
 * Utilidades para operaciones con sucursales (branches)
 *
 * Este módulo proporciona funciones helper para trabajar con el sistema
 * multi-sucursal de la aplicación.
 *
 * @module lib/utils/branch
 */

/**
 * Filtro de sucursal para peticiones API
 *
 * @property {string | null} branchId - ID de la sucursal (null para vista global)
 * @property {boolean} isGlobalView - Si está en vista global
 * @property {boolean} isSuperAdmin - Si el usuario es super administrador
 */
export interface BranchFilter {
  branchId: string | null;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
}

/**
 * Obtiene el filtro de sucursal para peticiones API
 *
 * Determina si se debe filtrar por sucursal específica o usar vista global
 * basado en los permisos del usuario.
 *
 * @param branchId - ID de la sucursal actual (null si no hay seleccionada)
 * @param isGlobalView - Si el usuario está en vista global
 * @param isSuperAdmin - Si el usuario es super administrador
 * @returns Objeto BranchFilter con la configuración de filtrado
 *
 * @example
 * ```typescript
 * const filter = getBranchFilter(currentBranchId, isGlobalView, isSuperAdmin)
 * // Usar en queries o API calls
 * ```
 */
export function getBranchFilter(
  branchId: string | null,
  isGlobalView: boolean,
  isSuperAdmin: boolean,
): BranchFilter {
  return {
    branchId: isGlobalView && isSuperAdmin ? null : branchId,
    isGlobalView,
    isSuperAdmin,
  };
}

/**
 * Formatea el nombre de una sucursal para mostrar en la UI
 *
 * @param branch - Objeto de sucursal con name y code, o null
 * @returns Nombre formateado como "Nombre (Código)" o "Vista Global" si es null
 *
 * @example
 * ```typescript
 * formatBranchName({ name: "Sucursal Centro", code: "CENTRO" })
 * // Returns: "Sucursal Centro (CENTRO)"
 *
 * formatBranchName(null)
 * // Returns: "Vista Global"
 * ```
 */
export function formatBranchName(
  branch: { name: string; code: string } | null,
): string {
  if (!branch) {
    return "Vista Global";
  }
  return `${branch.name} (${branch.code})`;
}

/**
 * Obtiene el header HTTP para incluir en peticiones API que requieren filtrado por sucursal
 *
 * Este header es usado por el middleware de la API para filtrar datos por sucursal.
 *
 * @param branchId - ID de la sucursal (null para vista global)
 * @returns Objeto con el header 'x-branch-id' configurado
 *
 * @example
 * ```typescript
 * const headers = getBranchHeader(currentBranchId)
 * const response = await fetch('/api/products', { headers })
 * ```
 *
 * @see {@link getBranchQueryParam} Para usar como query parameter en lugar de header
 */
export function getBranchHeader(
  branchId: string | null | undefined,
): Record<string, string> {
  if (branchId == null || branchId === "") {
    return { "x-branch-id": "global" };
  }
  return { "x-branch-id": branchId };
}

/**
 * Obtiene el query parameter de sucursal para incluir en URLs de API
 *
 * Útil cuando se necesita incluir el filtro de sucursal en la URL en lugar de headers.
 *
 * @param branchId - ID de la sucursal (null para vista global)
 * @returns String con el query parameter "branch_id=xxx" o "branch_id=global"
 *
 * @example
 * ```typescript
 * const query = getBranchQueryParam(currentBranchId)
 * const url = `/api/products?${query}`
 * ```
 *
 * @see {@link getBranchHeader} Para usar como header HTTP en lugar de query parameter
 */
export function getBranchQueryParam(branchId: string | null): string {
  if (branchId === null) {
    return "branch_id=global";
  }
  return `branch_id=${branchId}`;
}

/**
 * Obtiene el header HTTP para incluir field_operation_id en peticiones API
 *
 * @param fieldOperationId - ID del operativo en terreno
 * @returns Objeto con el header 'x-field-operation-id' configurado
 */
export function getOperativoHeader(
  fieldOperationId: string | null | undefined,
): Record<string, string> {
  if (fieldOperationId == null || fieldOperationId === "") {
    return {};
  }
  return { "x-field-operation-id": fieldOperationId };
}

/**
 * Combina headers de branch y opcionalmente field_operation_id
 *
 * @param branchId - ID de la sucursal
 * @param fieldOperationId - ID del operativo (opcional)
 * @returns Objeto con x-branch-id y opcionalmente x-field-operation-id
 */
export function getBranchAndOperativoHeaders(
  branchId: string | null | undefined,
  fieldOperationId?: string | null,
): Record<string, string> {
  const headers = { ...getBranchHeader(branchId) };
  if (fieldOperationId) {
    Object.assign(headers, getOperativoHeader(fieldOperationId));
  }
  return headers;
}
