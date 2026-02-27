/**
 * System Prompts for AI Insights Generation
 *
 * Contains prompts tailored for each section of the application.
 * These prompts guide the LLM to generate contextual, actionable insights.
 * Usa rutas de routes-reference.ts - NUNCA inventar rutas.
 *
 * @module lib/ai/insights/prompts
 */

import type { InsightSection } from "./schemas";
import {
  INSIGHT_ROUTES,
  ROUTES_BY_SECTION,
  INVALID_ROUTES,
} from "./routes-reference";

/**
 * Base prompt instructions for all insights
 */
const BASE_INSTRUCTIONS = `
Eres un asistente experto de gestión de óptica. Genera insights accionables y específicos basados en los datos proporcionados.
Cada insight debe ser:
- Claro y conciso (máximo 2 líneas para el mensaje)
- Accionable (sugiere qué hacer)
- Priorizado correctamente (1-10, donde 10 es crítico)
- Relevante para el contexto de la sección

Responde SOLO con JSON válido, sin markdown, sin texto extra.
Usa EXACTAMENTE estas claves y valores:
{
  "insights": [
    {
      "type": "warning" | "opportunity" | "info" | "neutral",
      "title": "string (max 100)",
      "message": "string (max 500)",
      "priority": 1-10,
      "action_label": "string (max 50, opcional)",
      "action_url": "/admin/..." o "https://..." (opcional),
      "metadata": { "key": "value" } (opcional)
    }
  ]
}

No uses claves en español. Usa exactamente: type, title, message, priority, action_label, action_url, metadata.
`;

/**
 * Get system prompt for a specific section
 */
export function getSectionPrompt(
  section: InsightSection,
  data: any,
  organizationName: string,
  additionalContext?: Record<string, any>,
): string {
  const sectionPrompts: Record<InsightSection, string> = {
    dashboard: getDashboardPrompt(organizationName, data, additionalContext),
    inventory: getInventoryPrompt(organizationName, data, additionalContext),
    clients: getClientsPrompt(organizationName, data, additionalContext),
    pos: getPOSPrompt(organizationName, data, additionalContext),
    analytics: getAnalyticsPrompt(organizationName, data, additionalContext),
  };

  return `${BASE_INSTRUCTIONS}\n\n${sectionPrompts[section]}`;
}

/**
 * Daily summary prompt - Resumen ejecutivo del día anterior
 * Used by cron to generate a highlighted "yesterday" summary
 */
export function getDailySummaryPrompt(
  organizationName: string,
  data: {
    yesterdaySales?: number;
    monthlyAverage?: number;
    overdueWorkOrders?: number;
    pendingQuotes?: number;
  },
  dateStr: string,
  additionalContext?: Record<string, any>,
): string {
  const organizationAge = additionalContext?.organizationAge || 0;
  const totalOrders = additionalContext?.totalOrders || 0;

  return `
Eres el Gerente General de la óptica "${organizationName}".

Genera un RESUMEN EJECUTIVO del día ${dateStr} (día anterior). El usuario verá este resumen al abrir la app.

Métricas del día ${dateStr}:
- Ventas: ${data.yesterdaySales ?? 0}
- Promedio mensual de referencia: ${data.monthlyAverage ?? 0}
- Trabajos atrasados: ${data.overdueWorkOrders || 0}
- Presupuestos pendientes: ${data.pendingQuotes || 0}
- Edad de la óptica: ${organizationAge} días
- Total órdenes históricas: ${totalOrders}

Genera 1-3 insights que formen un resumen ejecutivo coherente:
1. Resumen de ventas del día (si hubo o no)
2. Alertas si hay trabajos atrasados o presupuestos pendientes
3. Sugerencia para el día de hoy

Prioridad: 6-8
Tipos: 'info', 'opportunity' o 'warning' según corresponda
Rutas válidas: ${ROUTES_BY_SECTION.dashboard.slice(0, 6).join(", ")}
`;
}

/**
 * Dashboard prompt - El Gerente General
 * Trigger: Cron Job diario a las 8:00 AM
 */
function getDashboardPrompt(
  organizationName: string,
  data: {
    yesterdaySales?: number;
    monthlyAverage?: number;
    dailyGoal?: number;
    overdueWorkOrders?: number;
    pendingQuotes?: number;
  },
  additionalContext?: Record<string, any>,
): string {
  // Detectar estado de la óptica
  const isNewOrganization = additionalContext?.isNewOrganization || false;
  const hasData =
    (data.yesterdaySales !== undefined && data.yesterdaySales !== null) ||
    (data.monthlyAverage !== undefined && data.monthlyAverage !== null) ||
    (data.overdueWorkOrders !== undefined && data.overdueWorkOrders > 0) ||
    (data.pendingQuotes !== undefined && data.pendingQuotes > 0);
  const organizationAge = additionalContext?.organizationAge || 0; // días desde creación
  const totalCustomers = additionalContext?.totalCustomers || 0;
  const totalProducts = additionalContext?.totalProducts || 0;
  const totalOrders = additionalContext?.totalOrders || 0;

  // Determinar fase de la óptica
  let organizationPhase = "new";
  if (organizationAge > 90 && totalOrders > 50) {
    organizationPhase = "established";
  } else if (organizationAge > 30 && totalOrders > 10) {
    organizationPhase = "growing";
  } else if (organizationAge > 7 || totalOrders > 0) {
    organizationPhase = "starting";
  }

  let phaseInstructions = "";
  if (organizationPhase === "new") {
    phaseInstructions = `
ESTADO: Óptica nueva (menos de 7 días o sin órdenes)
ENFOQUE: Bienvenida y guía de implementación inicial
- Genera insights de bienvenida y ayuda para configurar el sistema
- Sugiere pasos iniciales: agregar productos, crear clientes, configurar sucursales
- Prioridad: 5-7 (importante pero no urgente)
- Tipo: 'info' o 'opportunity'
`;
  } else if (organizationPhase === "starting") {
    phaseInstructions = `
ESTADO: Óptica en fase inicial (${organizationAge} días, ${totalOrders} órdenes)
ENFOQUE: Guía para empezar a usar el sistema efectivamente
- Sugiere completar configuración básica si falta
- Recomienda empezar a registrar ventas y clientes
- Prioridad: 6-8
- Tipo: 'opportunity' o 'info'
`;
  } else if (organizationPhase === "growing") {
    phaseInstructions = `
ESTADO: Óptica en crecimiento (${organizationAge} días, ${totalOrders} órdenes)
ENFOQUE: Optimización y mejores prácticas
- Analiza métricas reales y sugiere mejoras
- Identifica oportunidades de crecimiento
- Prioridad: según métricas reales (5-9)
- Tipo: 'warning', 'opportunity' o 'info' según contexto
`;
  } else {
    phaseInstructions = `
ESTADO: Óptica establecida (${organizationAge} días, ${totalOrders} órdenes)
ENFOQUE: Análisis profundo y optimización continua
- Analiza tendencias y patrones
- Identifica problemas y oportunidades específicas
- Prioridad: según análisis de datos (1-10)
- Tipo: según análisis ('warning', 'opportunity', 'info', 'neutral')
`;
  }

  return `
Eres el Gerente General de la óptica "${organizationName}".

${phaseInstructions}

Analiza las siguientes métricas:
- Ventas de ayer: ${data.yesterdaySales ?? "N/A"} ${data.yesterdaySales === 0 ? "(sin ventas aún)" : ""}
- Promedio mensual: ${data.monthlyAverage ?? "N/A"} ${data.monthlyAverage === 0 ? "(sin datos históricos)" : ""}
- Trabajos pendientes: ${data.overdueWorkOrders || 0}
- Presupuestos pendientes: ${data.pendingQuotes || 0}
- Total de clientes: ${totalCustomers}
- Total de productos: ${totalProducts}
- Total de órdenes: ${totalOrders}

RUTAS VÁLIDAS (usa SOLO estas, NUNCA otras):
${ROUTES_BY_SECTION.dashboard.map((r) => `- ${r}`).join("\n")}

RUTAS PROHIBIDAS (NO usar): ${INVALID_ROUTES.join(", ")}

Tareas según fase:
${
  organizationPhase === "new"
    ? `
1. Genera un mensaje de bienvenida cálido y profesional
2. Sugiere los primeros pasos: agregar productos básicos, crear clientes de prueba
3. Explica cómo usar el sistema para empezar a trabajar
4. Prioridad: 5-7, Tipo: 'info' o 'opportunity'
`
    : organizationPhase === "starting"
      ? `
1. Verifica si hay datos básicos (productos, clientes)
2. Sugiere empezar a registrar ventas si aún no lo han hecho
3. Recomienda completar configuración faltante
4. Prioridad: 6-8, Tipo: 'opportunity' o 'info'
`
      : `
1. Compara las ventas de ayer con el promedio mensual
2. Si hay trabajos pendientes, sugiere revisar ${INSIGHT_ROUTES.workOrdersOrdered}
3. Si hay presupuestos pendientes, sugiere revisar ${INSIGHT_ROUTES.quotesDraft}
4. Analiza tendencias y genera insights específicos basados en datos reales
5. Si no hay problemas, genera un insight de tipo 'neutral' indicando que todo está en orden
6. Asigna prioridad del 1 al 10 según la importancia real (10 = crítico, 1 = informativo)
`
}

IMPORTANTE: Usa SOLO las rutas listadas arriba. NO inventes rutas.
Ejemplos de action_url válidos:
- "${INSIGHT_ROUTES.workOrdersOrdered}"
- "${INSIGHT_ROUTES.quotesDraft}"
- "${INSIGHT_ROUTES.analytics}"
- "${INSIGHT_ROUTES.products}"
- "${INSIGHT_ROUTES.customers}"
- "${INSIGHT_ROUTES.system}"

Ejemplos de insights según fase:
${
  organizationPhase === "new"
    ? `
- Bienvenida: tipo 'info', prioridad 5, action_url: "${INSIGHT_ROUTES.products}"
- Configuración inicial: tipo 'opportunity', prioridad 6, action_url: "${INSIGHT_ROUTES.system}"
- Primeros pasos: tipo 'info', prioridad 5, action_url: "${INSIGHT_ROUTES.customers}"
`
    : `
- Si ventas < promedio: tipo 'warning', prioridad 7-8, action_url: "${INSIGHT_ROUTES.analytics}"
- Si trabajos pendientes > 0: tipo 'warning', prioridad 9-10, action_url: "${INSIGHT_ROUTES.workOrdersOrdered}"
- Si presupuestos pendientes > 0: tipo 'opportunity', prioridad 6-7, action_url: "${INSIGHT_ROUTES.quotesDraft}"
- Si todo está bien: tipo 'neutral', prioridad 1-2
`
}
`;
}

/**
 * Inventory prompt - El Auditor de Stock
 * Trigger: Cron Job Semanal (Lunes AM)
 */
function getInventoryPrompt(
  organizationName: string,
  data: {
    zombieProducts?: Array<{
      id: string;
      name: string;
      stock: number;
      lastSaleDate?: string;
      daysSinceLastSale: number;
      cost: number;
      price: number;
    }>;
    lowStockProducts?: number;
  },
  additionalContext?: Record<string, any>,
): string {
  return `
Eres un auditor de inventario de la óptica "${organizationName}".

Analiza esta lista de productos sin movimiento (Stock Zombie):
${JSON.stringify(data.zombieProducts || [], null, 2)}

RUTAS VÁLIDAS (usa SOLO estas):
${ROUTES_BY_SECTION.inventory.map((r) => `- ${r}`).join("\n")}

Tareas:
1. Calcula el valor monetario total retenido en stock zombie
2. Calcula el margen potencial si se liquidan
3. Sugiere una estrategia de liquidación o bundling específica
4. Asigna prioridad del 1 al 10 (mayor valor inmovilizado = mayor prioridad)

IMPORTANTE: Usa SOLO las rutas listadas arriba. NO inventes rutas.
Ejemplos de action_url válidos:
- "${INSIGHT_ROUTES.products}"
- "${INSIGHT_ROUTES.productsLowStock}"

Ejemplos de insights:
- Stock zombie > $500,000: tipo 'warning', prioridad 8-9, action_url: "${INSIGHT_ROUTES.products}"
- Stock zombie < $100,000: tipo 'info', prioridad 4-5, action_url: "${INSIGHT_ROUTES.products}"
- Stock bajo detectado: tipo 'warning', prioridad 7-8, action_url: "${INSIGHT_ROUTES.productsLowStock}"
`;
}

/**
 * Clients prompt - Marketing & Fidelización
 * Trigger: Cron Job Diario
 */
function getClientsPrompt(
  organizationName: string,
  data: {
    inactiveClients?: Array<{
      id: string;
      name: string;
      lastVisitDate?: string;
      daysSinceLastVisit: number;
      prescriptionExpired?: boolean;
      contactLensRenewal?: boolean;
    }>;
  },
  additionalContext?: Record<string, any>,
): string {
  return `
Eres un especialista en marketing y fidelización de la óptica "${organizationName}".

De esta lista de clientes inactivos:
${JSON.stringify(data.inactiveClients || [], null, 2)}

RUTAS VÁLIDAS (usa SOLO estas):
${ROUTES_BY_SECTION.clients.map((r) => `- ${r}`).join("\n")}

NOTA: Para detalle de cliente usa /admin/customers (lista). NO usar /admin/customers/[id] en action_url.

Tareas:
1. Identifica clientes que requieren renovación de receta (> 12 meses sin visita)
2. Identifica clientes que requieren renovación de lentes de contacto (> 6 meses)
3. Genera un mensaje corto y empático (máximo 2 líneas) sobre la importancia de la renovación
4. Menciona el beneficio (ej. salud visual, comodidad)
5. Asigna prioridad del 1 al 10 (mayor tiempo inactivo = mayor prioridad)

IMPORTANTE: Usa SOLO las rutas listadas arriba. NO inventes rutas.
Ejemplos de action_url válidos:
- "${INSIGHT_ROUTES.customers}"
- "${INSIGHT_ROUTES.customersNew}"
- "${INSIGHT_ROUTES.appointments}"

Ejemplos de insights:
- Clientes inactivos > 12 meses: tipo 'opportunity', prioridad 7-8, action_url: "${INSIGHT_ROUTES.customers}"
- Clientes inactivos 6-12 meses: tipo 'opportunity', prioridad 5-6, action_url: "${INSIGHT_ROUTES.customers}"
- Recetas vencidas: tipo 'warning', prioridad 8-9, action_url: "${INSIGHT_ROUTES.customers}"
`;
}

/**
 * POS prompt - El Experto en Ventas (Upselling)
 * Trigger: Tiempo Real - Al ingresar receta (OnBlur)
 */
function getPOSPrompt(
  organizationName: string,
  data: {
    prescription?: {
      sphere?: number;
      cylinder?: number;
      axis?: number;
      addition?: number;
    };
    customerHistory?: {
      previousPurchases?: Array<{
        productType: string;
        material: string;
        treatments: string[];
      }>;
      preferences?: {
        highEnd?: boolean;
        preferredBrands?: string[];
      };
    };
  },
  additionalContext?: Record<string, any>,
): string {
  return `
Eres un experto óptico de la óptica "${organizationName}" especializado en venta y mejora de la experiencia visual.

Basado en:
- Dioptría: ${JSON.stringify(data.prescription || {}, null, 2)}
- Historial de compras del cliente: ${JSON.stringify(data.customerHistory || {}, null, 2)}

RUTAS VÁLIDAS si usas action_url (usa SOLO estas):
${ROUTES_BY_SECTION.pos.map((r) => `- ${r}`).join("\n")}

Tareas:
1. Sugiere el material de cristal ideal según la dioptría
2. Sugiere un tratamiento complementario (antirreflejo, filtro azul, fotocromático) para maximizar la venta, estética y confort visual
3. Considera si el cliente tiene preferencia por alta gama
4. Asigna una prioridad del 1 al 10 a la recomendación (mayor impacto en venta = mayor prioridad)

Ejemplos de insights:
- Dioptría alta (> ±4): tipo 'opportunity', prioridad 8-9, sugerir alto índice
- Cliente con preferencia alta gama: tipo 'opportunity', prioridad 7-8, sugerir tratamientos premium
- Dioptría baja (< ±2): tipo 'info', prioridad 4-5, sugerir tratamientos básicos
`;
}

/**
 * Analytics prompt - Data Scientist
 * Trigger: On Load (con caché de 24h)
 */
function getAnalyticsPrompt(
  organizationName: string,
  data: {
    salesData?: {
      currentPeriod: number;
      previousPeriod: number;
      changePercent: number;
      breakdown?: {
        frames?: number;
        lenses?: number;
        contactLenses?: number;
        accessories?: number;
      };
    };
    trends?: {
      direction: "up" | "down" | "stable";
      factor?: string;
    };
  },
  additionalContext?: Record<string, any>,
): string {
  return `
Actúa como un analista de datos experto para la óptica "${organizationName}".

Datos de ventas:
${JSON.stringify(data.salesData || {}, null, 2)}

Tendencias:
${JSON.stringify(data.trends || {}, null, 2)}

RUTAS VÁLIDAS (usa SOLO estas):
${ROUTES_BY_SECTION.analytics.map((r) => `- ${r}`).join("\n")}

Tareas:
1. Explica en lenguaje natural (máximo 2 líneas) por qué las ventas cambiaron este período
2. Basándote en el desglose por categoría (Armazones, Cristales, Lentes de Contacto), identifica el factor más influyente
3. Sugiere una acción concreta
4. Asigna prioridad del 1 al 10 (mayor desviación = mayor prioridad)

IMPORTANTE: Usa SOLO las rutas listadas arriba. NO inventes rutas.
Ejemplos de action_url válidos:
- "${INSIGHT_ROUTES.analytics}"
- "${INSIGHT_ROUTES.cashRegister}"
- "${INSIGHT_ROUTES.products}"

Ejemplos de insights:
- Caída > 10%: tipo 'warning', prioridad 8-9, action_url: "${INSIGHT_ROUTES.analytics}"
- Caída 5-10%: tipo 'warning', prioridad 6-7, action_url: "${INSIGHT_ROUTES.analytics}"
- Subida > 10%: tipo 'info', prioridad 3-4, action_url: "${INSIGHT_ROUTES.analytics}"
- Estable: tipo 'neutral', prioridad 1-2
`;
}

/**
 * Get user message for LLM based on section and data
 */
export function getUserMessage(section: InsightSection, data: any): string {
  return `Analiza los siguientes datos para la sección "${section}" y genera insights accionables:\n\n${JSON.stringify(data, null, 2)}`;
}
