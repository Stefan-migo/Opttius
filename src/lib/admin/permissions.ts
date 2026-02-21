/**
 * Default permissions by admin role.
 * Used when creating/registering admin users.
 */

export type AdminRole =
  | "root"
  | "dev"
  | "super_admin"
  | "admin"
  | "employee"
  | "vendedor";

export function getDefaultPermissions(role: string): Record<string, string[]> {
  const rolePermissions: Record<string, Record<string, string[]>> = {
    root: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "create", "update", "delete"],
      admin_users: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      bulk_operations: ["read", "create", "update", "delete"],
      saas_management: ["read", "create", "update", "delete"],
    },
    dev: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "create", "update", "delete"],
      admin_users: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      bulk_operations: ["read", "create", "update", "delete"],
      saas_management: ["read", "create", "update", "delete"],
    },
    super_admin: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "create", "update", "delete"],
      admin_users: ["read", "create", "update", "delete"],
      support: ["read", "create", "update", "delete"],
      bulk_operations: ["read", "create", "update", "delete"],
      branches: ["read", "create", "update", "delete"],
    },
    admin: {
      orders: ["read", "create", "update", "delete"],
      products: ["read", "create", "update", "delete"],
      customers: ["read", "create", "update", "delete"],
      analytics: ["read"],
      settings: ["read", "update"],
      admin_users: ["read"],
      support: ["read", "create", "update"],
      bulk_operations: ["read", "create"],
      appointments: ["read", "create", "update", "delete"],
      quotes: ["read", "create", "update", "delete"],
      work_orders: ["read", "create", "update", "delete"],
    },
    employee: {
      orders: ["read", "create", "update"],
      products: ["read"],
      customers: ["read", "create", "update"],
      analytics: [],
      settings: [],
      admin_users: [],
      support: ["read", "create"],
      bulk_operations: [],
      appointments: ["read", "create", "update"],
      quotes: ["read", "create", "update"],
      work_orders: ["read", "update"],
      pos: ["read", "create"],
    },
    vendedor: {
      orders: ["read", "create", "update"],
      products: ["read"],
      customers: ["read", "create", "update"],
      analytics: [],
      settings: [],
      admin_users: [],
      support: ["read", "create"],
      bulk_operations: [],
      appointments: ["read", "create", "update"],
      quotes: ["read", "create", "update"],
      work_orders: ["read", "update"],
      pos: ["read", "create"],
    },
  };

  return rolePermissions[role] || rolePermissions.admin;
}

/**
 * Resources and actions used by the permission system.
 * Used by PermissionsEditor for UI alignment with backend.
 */
export const PERMISSION_RESOURCES = [
  {
    key: "products",
    label: "Productos",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "orders",
    label: "Pedidos",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "customers",
    label: "Clientes",
    actions: ["read", "create", "update", "delete"],
  },
  { key: "analytics", label: "Analíticas", actions: ["read"] },
  {
    key: "settings",
    label: "Configuración",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "admin_users",
    label: "Usuarios Admin",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "support",
    label: "Soporte",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "bulk_operations",
    label: "Operaciones masivas",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "appointments",
    label: "Citas",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "quotes",
    label: "Presupuestos",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "work_orders",
    label: "Órdenes de trabajo",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "pos",
    label: "Punto de venta",
    actions: ["read", "create", "update", "delete"],
  },
  {
    key: "branches",
    label: "Sucursales",
    actions: ["read", "create", "update", "delete"],
  },
] as const;

export const ACTION_LABELS: Record<string, string> = {
  read: "Leer",
  create: "Crear",
  update: "Actualizar",
  delete: "Eliminar",
};
