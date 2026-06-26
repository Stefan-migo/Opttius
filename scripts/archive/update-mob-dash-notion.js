/**
 * Script para actualizar la página MOB-DASH en Notion con el plan detallado
 */

const https = require("https");

const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const PAGE_ID = "33206293-43fc-815f-a78f-efb7c8db53a0";

function notionRequest(endpoint, method = "GET", body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.notion.com",
      path: "/v1/" + endpoint,
      method: method,
      headers: {
        Authorization: "Bearer " + NOTION_API_KEY,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
    };
    if (body) options.headers["Content-Length"] = Buffer.byteLength(body);

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
    if (body) req.write(body);
    req.end();
  });
}

async function updatePageContent() {
  console.log("📝 ACTUALIZANDO PÁGINA MOB-DASH EN NOTION...\n");

  const blocks = [
    // Título sección
    {
      object: "block",
      type: "heading_1",
      heading_1: {
        rich_text: [
          {
            type: "text",
            text: { content: "🎯 PLAN DE OPTIMIZACIÓN MÓVIL DASHBOARD" },
          },
        ],
      },
    },
    // Descripción
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Optimización real del dashboard para dispositivos móviles - no solo modelos responsivos, sino una experiencia mobile-first completa.",
            },
          },
        ],
      },
    },
    // Separador
    { object: "block", type: "divider", divider: {} },

    // Análisis
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: { content: "📊 ANÁLISIS - PROBLEMAS IDENTIFICADOS" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "🔴 Sidebar fijo en mobile - Oculta contenido, experiencia desktop-only",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "🔴 6 KPIs en grid 2-3-6 cols - Muy pequeño en móvil, ilegible",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "🔴 QuickActionsPanel lateral - Invisible en mobile",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "🔴 Sin navegación mobile - No hay forma de navegar",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "🟡 Charts responsivos pero complejos - Recharts con muchos elementos",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "🟡 AppointmentList cards largas - padding excesivo en móvil",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "🟡 Header con 4+ botones - Se salen del viewport",
            },
          },
        ],
      },
    },

    // Separador
    { object: "block", type: "divider", divider: {} },

    // FASE 1
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "🚀 FASE 1: Navegación Mobile (Critical) - 4-6 horas",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Bottom Navigation Bar: 5 items (Dashboard, Clientes, Agenda, POS, Más) - Icons + labels, activo highlight, safe area iPhone X+ - Solo visible < lg",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Floating Action Button (FAB): bottom-right mb-20 mr-4 - Acciones: Nueva Cita, Nuevo Cliente, Buscar - Expandible con radial menu",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Quick Actions Mobile Drawer: Swipe desde bottom o tap FAB - Búsqueda cliente/producto integrada",
            },
          },
        ],
      },
    },

    // FASE 2
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: { content: "🎨 FASE 2: Layout Rediseño (High) - 6-8 horas" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Header Responsive: Desktop [Título][Branch][POS][Agenda][Taller][Refresh] vs Mobile [≡][Título][FAB]",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "KPIs Mobile-First: Desktop grid-cols-6, Tablet grid-cols-3, Mobile grid-cols-2 vertical scroll - Cards p-4 en vez de p-8, ocultar labels secundarios",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Chart Section: Altura reducida h-[180px] en móvil, ocultar XAxis labels, touch-friendly tooltip",
            },
          },
        ],
      },
    },

    // FASE 3
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "⚡ FASE 3: Componentes Optimizados (Medium) - 4-6 horas",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "AppointmentsList Mobile: Cards compactas p-3 padding, horizontal swipe para acciones, pull-to-refresh",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Stock Alert Banner: Collapsible en móvil con chevron, inline badge count en header",
            },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "Branch Selector Mobile: Compact mode solo icono + nombre truncado, dropdown en vez de sidebar",
            },
          },
        ],
      },
    },

    // Estructura archivos
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "📁 ESTRUCTURA DE ARCHIVOS" } },
        ],
      },
    },
    {
      object: "block",
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "src/\n├── components/\n│   ├── admin/\n│   │   ├── MobileBottomNav.tsx       ← NUEVO\n│   │   ├── MobileFAB.tsx             ← NUEVO\n│   │   ├── MobileQuickActions.tsx   ← NUEVO\n│   │   └── dashboard/\n│   │       ├── KpiCard.tsx           ← MODIFICAR\n│   │       ├── QuickActionsPanel.tsx ← MODIFICAR\n│   │       ├── ChartCard.tsx         ← MODIFICAR\n│   │       └── AppointmentsList.tsx  ← MODIFICAR\n│   └── layout/\n│       └── AdminLayout.tsx          ← MODIFICAR\n├── hooks/\n│   └── useMobileView.ts             ← NUEVO\n└── styles/\n    └── mobile-dashboard.css         ← NUEVO",
            },
          },
        ],
        language: "plain text",
      },
    },

    // Timeline
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "⏱️ TIMELINE ESTIMADO" } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "FASE 1: Navegación Mobile - 4-6 horas" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "FASE 2: Layout Rediseño - 6-8 horas" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          {
            type: "text",
            text: { content: "FASE 3: Componentes - 4-6 horas" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "callout",
      callout: {
        rich_text: [{ type: "text", text: { content: "TOTAL: 14-20 horas" } }],
        icon: { emoji: "⏰" },
      },
    },

    // Design tokens
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "🎨 DESIGN TOKENS MOBILE" } },
        ],
      },
    },
    {
      object: "block",
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: {
              content:
                "--dashboard-card-padding-mobile: 12px;\n--dashboard-kpi-size-mobile: 44px;\n--dashboard-fab-size: 56px;\n--dashboard-bottom-nav-height: 64px;\n--dashboard-touch-target: 44px;",
            },
          },
        ],
        language: "css",
      },
    },

    // Estado
    { object: "block", type: "divider", divider: {} },
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [
          { type: "text", text: { content: "📈 ESTADO: Planning ✅" } },
        ],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Plan completado. Pendiente implementación." },
          },
        ],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "Investigado por: @opttius-agent" },
          },
        ],
      },
    },
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: "Fecha: 29-03-2026" } }],
      },
    },
  ];

  try {
    const response = await notionRequest(
      "blocks/" + PAGE_ID + "/children",
      "PATCH",
      JSON.stringify({ children: blocks }),
    );

    console.log("✅ CONTENIDO AGREGADO A NOTION");
    console.log(
      "Bloques agregados:",
      response.results?.length || blocks.length,
    );
    console.log("");
    console.log("🔗 Ver en Notion:");
    console.log("https://www.notion.so/3320629343fc815fa78fefb7c8db53a0");
  } catch (error) {
    console.error("❌ Error:", error.message);
    if (error.response) {
      console.error("Details:", JSON.stringify(error.response, null, 2));
    }
  }
}

updatePageContent().catch(console.error);
