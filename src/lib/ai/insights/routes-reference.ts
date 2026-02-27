/**
 * Rutas válidas del sistema Opttius para insights.
 * El agente de insights DEBE usar SOLO estas rutas en action_url.
 * NO usar rutas que no estén en esta lista.
 *
 * @module lib/ai/insights/routes-reference
 */

/**
 * Rutas principales por sección. Usar solo estas en action_url.
 */
export const INSIGHT_ROUTES = {
  /** Dashboard principal */
  dashboard: "/admin",

  /** Trabajos de laboratorio - API soporta ?status=ordered, ?status=sent_to_lab, etc. */
  workOrders: "/admin/work-orders",
  workOrdersOrdered: "/admin/work-orders?status=ordered",
  workOrdersSentToLab: "/admin/work-orders?status=sent_to_lab",

  /** Presupuestos */
  quotes: "/admin/quotes",
  quotesDraft: "/admin/quotes?status=draft",
  quotesSent: "/admin/quotes?status=sent",

  /** Analíticas y reportes */
  analytics: "/admin/analytics",

  /** Productos e inventario */
  products: "/admin/products",
  productsLowStock: "/admin/products?filter=low_stock",
  productsAdd: "/admin/products/add",
  productsBulk: "/admin/products/bulk",
  categories: "/admin/categories",

  /** Clientes */
  customers: "/admin/customers",
  customersNew: "/admin/customers/new",

  /** Citas y agenda */
  appointments: "/admin/appointments",
  appointmentsSettings: "/admin/appointments/settings",

  /** Punto de venta */
  pos: "/admin/pos",
  posSettings: "/admin/pos/settings",

  /** Caja registradora */
  cashRegister: "/admin/cash-register",

  /** Configuración del sistema - NO existe /admin/settings */
  system: "/admin/system",
  systemBilling: "/admin/system/billing-settings",
  systemPosBilling: "/admin/system/pos-billing-settings",

  /** Sucursales */
  branches: "/admin/branches",

  /** Soporte */
  support: "/admin/support",
  supportTicketsNew: "/admin/support/tickets/new",

  /** Usuarios admin */
  adminUsers: "/admin/admin-users",
  adminUsersRegister: "/admin/admin-users/register",

  /** Notificaciones */
  notifications: "/admin/notifications",

  /** Chat IA */
  chat: "/admin/chat",
} as const;

/**
 * Rutas por sección de insights para inyectar en prompts
 */
export const ROUTES_BY_SECTION = {
  dashboard: [
    INSIGHT_ROUTES.dashboard,
    INSIGHT_ROUTES.workOrders,
    INSIGHT_ROUTES.workOrdersOrdered,
    INSIGHT_ROUTES.quotes,
    INSIGHT_ROUTES.quotesDraft,
    INSIGHT_ROUTES.analytics,
    INSIGHT_ROUTES.products,
    INSIGHT_ROUTES.customers,
    INSIGHT_ROUTES.pos,
    INSIGHT_ROUTES.system,
  ],
  inventory: [
    INSIGHT_ROUTES.products,
    INSIGHT_ROUTES.productsLowStock,
    INSIGHT_ROUTES.productsAdd,
    INSIGHT_ROUTES.productsBulk,
    INSIGHT_ROUTES.categories,
  ],
  clients: [
    INSIGHT_ROUTES.customers,
    INSIGHT_ROUTES.customersNew,
    INSIGHT_ROUTES.appointments,
    INSIGHT_ROUTES.appointmentsSettings,
  ],
  pos: [
    INSIGHT_ROUTES.pos,
    INSIGHT_ROUTES.products,
    INSIGHT_ROUTES.customers,
    INSIGHT_ROUTES.quotes,
    INSIGHT_ROUTES.workOrders,
  ],
  analytics: [
    INSIGHT_ROUTES.analytics,
    INSIGHT_ROUTES.cashRegister,
    INSIGHT_ROUTES.products,
    INSIGHT_ROUTES.workOrders,
    INSIGHT_ROUTES.quotes,
  ],
} as const;

/**
 * Rutas que NO existen - el agente nunca debe usarlas
 */
export const INVALID_ROUTES = [
  "/admin/settings", // No existe: usar /admin/system
  "/admin/products?lowStock=true", // Incorrecto: usar /admin/products?filter=low_stock
] as const;
