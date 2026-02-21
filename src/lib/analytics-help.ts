// Help text configuration for all analytics metrics (español)

export const ANALYTICS_HELP = {
  totalRevenue: {
    title: "Ingresos Totales",
    description:
      "Suma de todos los ingresos generados por órdenes pagadas en el período seleccionado.",
    details: [
      "Solo cuenta órdenes con estado de pago 'paid'",
      "No incluye órdenes pendientes, canceladas o fallidas",
    ],
    formula: "Suma de total_amount donde payment_status = 'paid'",
  },
  revenueGrowth: {
    title: "Crecimiento de Ingresos",
    description:
      "Porcentaje de crecimiento o disminución de ingresos respecto al período anterior.",
    details: [
      "Compara ingresos del período actual vs período anterior del mismo tamaño",
      "Valor positivo (+) indica crecimiento",
      "Valor negativo (-) indica disminución",
    ],
    formula:
      "((Ingresos Actuales - Ingresos Anteriores) / Ingresos Anteriores) × 100",
  },
  totalOrders: {
    title: "Total de Órdenes",
    description:
      "Número total de órdenes realizadas en el período seleccionado, sin importar el estado de pago.",
    details: ["Incluye todas las órdenes (pagadas, pendientes, canceladas)"],
    formula: "COUNT(orders) en el período",
  },
  totalCustomers: {
    title: "Total de Clientes",
    description: "Número total de clientes registrados en el sistema.",
    details: ["Cuenta todos los perfiles en la base de datos"],
    formula: "COUNT(profiles)",
  },
  conversionRate: {
    title: "Tasa de Conversión",
    description:
      "Relación entre órdenes realizadas y nuevos clientes registrados en el período.",
    details: [
      "Mide la efectividad del sistema para convertir registros en ventas",
    ],
    formula: "(Total Órdenes / Nuevos Clientes) × 100",
  },
  salesTrend: {
    title: "Tendencia de Ventas",
    description:
      "Muestra la evolución de los ingresos durante el período seleccionado.",
    details: ["Solo cuenta órdenes pagadas (payment_status = 'paid')"],
  },
  customerAcquisition: {
    title: "Adquisición de Clientes",
    description:
      "Muestra cuántos nuevos clientes se registraron durante el período seleccionado.",
    details: ["Basado en la fecha de creación del perfil (created_at)"],
  },
  orderStatus: {
    title: "Estado de Órdenes",
    description: "Distribución de órdenes según su estado actual.",
    details: [
      "Pendiente: Órdenes creadas pero no procesadas",
      "Procesando: Órdenes en preparación",
      "Enviada: Órdenes despachadas pero no entregadas",
      "Entregada: Órdenes completadas",
      "Cancelada: Órdenes canceladas",
    ],
  },
  customerSegmentation: {
    title: "Segmentación de Clientes",
    description:
      "Clasificación de clientes según su tipo de membresía o estado.",
    details: [
      "Miembros: Clientes con membresía activa",
      "Premium: Clientes con membresía premium",
      "Básico: Clientes con membresía básica",
      "Sin membresía: Clientes registrados sin membresía",
    ],
  },
  categoryRevenue: {
    title: "Ingresos por Categoría",
    description: "Muestra qué categorías de productos generan más ingresos.",
    details: [
      "Calculado sumando el precio total de todos los ítems vendidos por categoría",
    ],
    formula: "Suma de (cantidad × precio) por categoría de producto",
  },
  topProducts: {
    title: "Productos Más Vendidos",
    description:
      "Ranking de productos que han generado más ingresos en el período.",
    details: [
      "Ordenado por ingresos totales (cantidad × precio)",
      "Solo muestra los productos principales",
    ],
    formula: "Suma de total_price agrupado por product_id",
  },
  supportTicketsTotal: {
    title: "Total de Incidentes",
    description:
      "Número total de tickets de incidentes registrados en el período.",
    details: [
      "Incluye todos los tickets creados (abiertos, en progreso, resueltos, cerrados)",
      "Usado para análisis de patrones y mejora del servicio",
    ],
    formula: "COUNT(optical_internal_support_tickets) en el período",
  },
  supportTicketsResolved: {
    title: "Incidentes Resueltos",
    description: "Tickets que fueron resueltos o cerrados en el período.",
    details: [
      "Estado 'resolved' o 'closed'",
      "Indica efectividad en la resolución de problemas",
    ],
    formula: "COUNT donde status IN ('resolved', 'closed')",
  },
  avgResolutionTime: {
    title: "Tiempo Promedio de Resolución",
    description:
      "Promedio de minutos desde la creación del ticket hasta su resolución.",
    details: [
      "Solo considera tickets con resolution_time_minutes calculado",
      "Métrica clave para mejorar tiempos de respuesta",
    ],
    formula: "AVG(resolution_time_minutes) de tickets resueltos",
  },
  workOrdersTotal: {
    title: "Trabajos de Laboratorio",
    description:
      "Total de trabajos de laboratorio (órdenes de lentes) en el período.",
    details: [
      "Incluye presupuestos, ordenados, enviados al lab, montados, entregados",
      "Pendientes: estados antes de 'delivered'",
      "Completados: status = 'delivered'",
    ],
    formula: "COUNT(lab_work_orders) en el período",
  },
  quoteConversionRate: {
    title: "Tasa de Conversión de Presupuestos",
    description:
      "Porcentaje de presupuestos aceptados o convertidos a trabajo respecto al total.",
    details: [
      "Aceptados: status = 'accepted' o 'converted_to_work'",
      "Indica efectividad comercial en cierre de presupuestos",
    ],
    formula: "(Aceptados + Convertidos) / Total × 100",
  },
  appointmentsTotal: {
    title: "Citas",
    description: "Total de citas agendadas en el período seleccionado.",
    details: [
      "Incluye citas programadas, completadas, no-show y canceladas",
      "Usado para análisis de ocupación de agenda",
    ],
    formula: "COUNT(appointments) en el período",
  },
  appointmentCompletionRate: {
    title: "Tasa de Completación de Citas",
    description:
      "Porcentaje de citas completadas respecto al total de citas en el período.",
    details: [
      "Completadas: status = 'completed'",
      "No-show: status = 'no_show' (no cuenta como completada)",
    ],
    formula: "Completadas / Total × 100",
  },
};

export const EMPTY_STATE_MESSAGES = {
  noOrders: {
    title: "Sin órdenes registradas",
    message: "Aún no se han registrado órdenes en el sistema.",
    suggestion: "Puedes crear órdenes manualmente desde la sección de Órdenes.",
  },
  noProducts: {
    title: "Sin productos vendidos",
    message: "No se han vendido productos en el período seleccionado.",
    suggestion:
      "Intenta seleccionar un período más amplio (90 o 365 días) o verifica que tengas productos activos en el catálogo.",
  },
  noCustomers: {
    title: "Sin nuevos clientes",
    message: "No hay nuevos clientes registrados en este período.",
    suggestion:
      "Los clientes pueden registrarse desde el sitio web o puedes crearlos manualmente desde la sección de Clientes.",
  },
  noCategories: {
    title: "Sin categorías con ventas",
    message:
      "Las categorías aparecerán cuando tengas productos vendidos asignados a categorías.",
    suggestion:
      "Asegúrate de que tus productos tengan categorías asignadas en el catálogo.",
  },
};
