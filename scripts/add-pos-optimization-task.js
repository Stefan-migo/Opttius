/**
 * Script para agregar tarea de optimización del POS a Notion Tasks
 */

const https = require("https");
require("dotenv").config({ path: ".env.local" });

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const TASKS_DATABASE_ID = process.env.NOTION_DATABASE_TASKS;

if (!NOTION_API_KEY || !TASKS_DATABASE_ID) {
  console.error(
    "❌ Faltan variables de entorno NOTION_API_KEY o NOTION_DATABASE_TASKS",
  );
  console.error(
    "   Verifica que .env.local tenga estas variables configuradas",
  );
  process.exit(1);
}

function notionRequest(endpoint, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.notion.com",
      path: `/v1/${endpoint}`,
      method: method,
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.headers["Content-Length"] = Buffer.byteLength(body);
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", reject);

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

// Contenido enriquecido de la tarea
const taskContent = [
  {
    heading_2: {
      rich_text: [
        { text: { content: "🎯 Optimización del POS - Plan Completo" } },
      ],
    },
  },
  {
    paragraph: {
      rich_text: [
        {
          text: {
            content:
              "Análisis completo del frontend del POS (Punto de Venta) con recomendaciones de mejora en UI/UX y arquitectura. Componente principal actual: 6,928 líneas (monolítico).",
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    heading_3: {
      rich_text: [{ text: { content: "📊 Resumen Ejecutivo" } }],
    },
  },
  {
    table: {
      table_width: 3,
      children: [
        {
          table_row: {
            cells: [
              [{ text: { content: "Métrica" } }],
              [{ text: { content: "Estado Actual" } }],
              [{ text: { content: "Objetivo" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Tamaño componente principal" } }],
              [{ text: { content: "6,928 líneas (monolítico)" } }],
              [{ text: { content: "< 500 líneas" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Puntuación UX estimada" } }],
              [{ text: { content: "65/100" } }],
              [{ text: { content: "85+" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Código duplicado" } }],
              [{ text: { content: "Alto (tipos, lógica)" } }],
              [{ text: { content: "Mínimo" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Responsividad móvil" } }],
              [{ text: { content: "Básica (tabs)" } }],
              [{ text: { content: "Optimizada (stepper)" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Atajos de teclado" } }],
              [{ text: { content: "Limitados" } }],
              [{ text: { content: "Completo (F1-F4, Enter, Escape)" } }],
            ],
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    heading_3: {
      rich_text: [{ text: { content: "🔍 Hallazgos Principales" } }],
    },
  },
  {
    heading_4: {
      rich_text: [
        { text: { content: "1. Problemas Arquitectónicos (CRÍTICOS)" } },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Componente monolítico: src/app/admin/pos/page.tsx (6,928 líneas) viola principio de responsabilidad única",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "55+ estados mezclados: Lógica de cliente, productos, pagos y convenios entrelazada",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Endpoint monolítico: process-sale/route.ts (2,364 líneas) con alta complejidad",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Contexto no utilizado: POSContext.tsx existe pero no se implementa",
          },
        },
      ],
    },
  },
  {
    heading_4: {
      rich_text: [{ text: { content: "2. Problemas de UI/UX (ALTOS)" } }],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Sobrecarga cognitiva: 6+ secciones visibles simultáneamente",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Dos flujos sin diferenciación clara: Venta simple vs Venta completa (óptica)",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Responsividad móvil básica: Tabs que ocultan información crítica",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Feedback visual limitado: Estados de caja y confirmaciones poco prominentes",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Sin atajos de teclado: Ineficiencia para usuarios avanzados",
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    heading_3: {
      rich_text: [{ text: { content: "🎯 Plan de Mejora Propuesto" } }],
    },
  },
  {
    heading_4: {
      rich_text: [{ text: { content: "Fase 1: Cimientos (2-3 días)" } }],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Consolidar tipos - Eliminar interfaces duplicadas, unificar en types.ts",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Extraer hooks personalizados - usePOSCustomer, usePOSProducts, usePOSPayment",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Implementar contexto POS - Usar POSContext.tsx existente para estado global",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Definir estructura modular - Diagrama de componentes nuevos",
          },
        },
      ],
    },
  },
  {
    heading_4: {
      rich_text: [{ text: { content: "Fase 2: Modularización (3-4 días)" } }],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Dividir el monolito en componentes especializados: POSHeader, POSQuickSale, POSAdvancedSale, etc.",
          },
        },
      ],
    },
  },
  {
    heading_4: {
      rich_text: [{ text: { content: "Fase 3: UX Intuitiva (2-3 días)" } }],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content: "Toggle rápido/avanzado - Clarificar modos de operación",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Stepper móvil - Reemplazar tabs por flujo guiado en mobile",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Atajos de teclado - F1-F4 para métodos de pago, Enter/Escape",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Feedback visual mejorado - Estados prominentes, confirmaciones",
          },
        },
      ],
    },
  },
  {
    heading_4: {
      rich_text: [{ text: { content: "Fase 4: Optimización (1-2 días)" } }],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Memoización estratégica - React.memo para componentes críticos",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content: "Lazy loading - Carga bajo demanda de componentes pesados",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Design system Epoch - Aplicar paleta (#1A2B23, #C5A059, #F9F7F2)",
          },
        },
      ],
    },
  },
  {
    bulleted_list_item: {
      rich_text: [
        {
          text: {
            content: "Accesibilidad - ARIA labels, navegación por teclado",
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    heading_3: {
      rich_text: [{ text: { content: "📋 Priorización Recomendada" } }],
    },
  },
  {
    table: {
      table_width: 5,
      children: [
        {
          table_row: {
            cells: [
              [{ text: { content: "Prioridad" } }],
              [{ text: { content: "Mejora" } }],
              [{ text: { content: "Impacto" } }],
              [{ text: { content: "Esfuerzo" } }],
              [{ text: { content: "ROI" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "CRÍTICA" } }],
              [{ text: { content: "Dividir componente monolítico" } }],
              [{ text: { content: "Alto" } }],
              [{ text: { content: "3-4 días" } }],
              [{ text: { content: "10x" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "ALTA" } }],
              [{ text: { content: "Simplificar flujo principal" } }],
              [{ text: { content: "Alto" } }],
              [{ text: { content: "2-3 días" } }],
              [{ text: { content: "8x" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "ALTA" } }],
              [{ text: { content: "Extraer hooks personalizados" } }],
              [{ text: { content: "Medio" } }],
              [{ text: { content: "1-2 días" } }],
              [{ text: { content: "5x" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "MEDIA" } }],
              [{ text: { content: "Mejorar responsividad móvil" } }],
              [{ text: { content: "Medio" } }],
              [{ text: { content: "1-2 días" } }],
              [{ text: { content: "4x" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "MEDIA" } }],
              [{ text: { content: "Agregar atajos de teclado" } }],
              [{ text: { content: "Bajo" } }],
              [{ text: { content: "0.5-1 día" } }],
              [{ text: { content: "6x" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "BAJA" } }],
              [{ text: { content: "Lazy loading componentes" } }],
              [{ text: { content: "Bajo" } }],
              [{ text: { content: "0.5 día" } }],
              [{ text: { content: "2x" } }],
            ],
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    heading_3: {
      rich_text: [
        { text: { content: "🚀 Recomendaciones Inmediatas (Comenzar HOY)" } },
      ],
    },
  },
  {
    numbered_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Consolidación de tipos (2 horas) - Extraer interfaces locales de page.tsx a types.ts",
          },
        },
      ],
    },
  },
  {
    numbered_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Crear usePOSCustomer hook (3 horas) - Extraer líneas 789-841: búsqueda, selección, datos cliente",
          },
        },
      ],
    },
  },
  {
    numbered_list_item: {
      rich_text: [
        {
          text: {
            content:
              "Implementar POSProvider (2 horas) - Usar contexto existente en página principal",
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    heading_3: {
      rich_text: [{ text: { content: "💡 Beneficios Esperados" } }],
    },
  },
  {
    table: {
      table_width: 3,
      children: [
        {
          table_row: {
            cells: [
              [{ text: { content: "Área" } }],
              [{ text: { content: "Antes" } }],
              [{ text: { content: "Después" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Mantenibilidad" } }],
              [{ text: { content: "Difícil (7K líneas)" } }],
              [{ text: { content: "Fácil (<500 líneas por componente)" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Tiempo venta simple" } }],
              [{ text: { content: "~2-3 minutos" } }],
              [{ text: { content: "~1-1.5 minutos (30-50% reducción)" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Errores operativos" } }],
              [{ text: { content: "Probables por complejidad" } }],
              [{ text: { content: "Reducidos 15-20%" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Adopción móvil" } }],
              [{ text: { content: "Limitada (tabs)" } }],
              [{ text: { content: "Optimizada (stepper + carrito fijo)" } }],
            ],
          },
        },
        {
          table_row: {
            cells: [
              [{ text: { content: "Satisfacción usuario" } }],
              [{ text: { content: "Funcional pero confuso" } }],
              [{ text: { content: "Intuitivo y eficiente" } }],
            ],
          },
        },
      ],
    },
  },
  { divider: {} },
  {
    paragraph: {
      rich_text: [
        {
          text: {
            content:
              "**Análisis generado por Opttius Agent el 29 de marzo de 2026.** La funcionalidad actual está al 100% sin bugs reportados, se buscan mejoras en UX y optimizaciones arquitectónicas.",
          },
        },
      ],
    },
  },
];

async function createTask() {
  console.log("🚀 Creando tarea de optimización del POS en Notion...");

  const properties = {
    Task: {
      title: [
        {
          text: {
            content: "🎯 Optimización del POS - Mejoras UI/UX y Arquitectura",
          },
        },
      ],
    },
    Status: {
      select: {
        name: "Backlog",
      },
    },
    Priority: {
      select: {
        name: "P0 - Critical",
      },
    },
    Type: {
      select: {
        name: "Improvement",
      },
    },
    Module: {
      select: {
        name: "pos",
      },
    },
    Labels: {
      multi_select: [
        { name: "frontend" },
        { name: "ui-ux" },
        { name: "performance" },
        { name: "architecture" },
      ],
    },
  };

  try {
    const response = await notionRequest(
      "pages",
      "POST",
      JSON.stringify({
        parent: { database_id: TASKS_DATABASE_ID },
        properties,
        children: taskContent,
      }),
    );

    console.log("✅ Tarea creada exitosamente!");
    console.log(
      `🔗 URL: https://www.notion.so/${response.id.replace(/-/g, "")}`,
    );
    console.log(`📝 Título: ${response.properties.Task.title[0].plain_text}`);
    console.log(`🏷️  Status: ${response.properties.Status.select.name}`);
    console.log(`🎯 Prioridad: ${response.properties.Priority.select.name}`);

    return response;
  } catch (error) {
    console.error("❌ Error creando tarea:", error.message);
    if (error.body) {
      try {
        const errorBody = JSON.parse(error.body);
        console.error("   Detalles:", errorBody.message);
      } catch (e) {
        console.error("   Detalles:", error.body?.slice(0, 200));
      }
    }
    throw error;
  }
}

createTask().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
