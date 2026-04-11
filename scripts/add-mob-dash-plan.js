/**
 * Script para agregar plan detallado a la tarea MOB-DASH en Notion
 */

const https = require("https");

// Configuración desde .env.local
const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";

// ID de la tarea MOB-DASH que se mantiene
const MOB_DASH_TASK_ID = "33206293-43fc-815f-a78f-efb7c8db53a0";

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
          const parsed = JSON.parse(data);
          resolve(parsed);
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

// Agregar contenido a la página
async function addContentToPage(pageId, children) {
  console.log(`📝 Agregando contenido a página...`);
  
  try {
    const response = await notionRequest(
      `blocks/${pageId}/children`,
      "POST",
      JSON.stringify({ children }),
    );
    
    if (response.error) {
      console.error(`❌ Error: ${response.error.message}`);
      return false;
    }
    
    console.log(`✅ Contenido agregado exitosamente`);
    return true;
  } catch (error) {
    console.error(`❌ Error agregando contenido:`, error.message);
    return false;
  }
}

// Obtener información de la tarea
async function getPageInfo(pageId) {
  console.log(`📄 Obteniendo información de la tarea...`);
  
  try {
    const response = await notionRequest(`pages/${pageId}`);
    
    const title = response.properties?.Task?.title?.[0]?.plain_text || "Sin título";
    console.log(`   Título: ${title}`);
    console.log(`   Status: ${response.properties?.Status?.select?.name || "Sin status"}`);
    
    return response;
  } catch (error) {
    console.error(`❌ Error obteniendo info:`, error.message);
    return null;
  }
}

// Plan detallado para la tarea MOB-DASH
async function addMobDashPlan() {
  console.log("🎯 AGREGANDO PLAN DETALLADO A MOB-DASH\n");
  
  // 1. Obtener info de la tarea
  await getPageInfo(MOB_DASH_TASK_ID);
  
  // 2. Sección 1: Objetivos Específicos
  console.log("\n📌 Agregando sección: Objetivos Específicos");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🎯 Objetivos Específicos" } }],
        color: "blue_background",
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Optimizar experiencia móvil para vendedores en tienda (tablets)" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Mejorar navegación touch para POS móvil (pantallas táctiles)" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Adaptar visualización de datos para pantallas pequeñas" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Reducir tiempo de interacción en flujos móviles críticos" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Implementar gestos naturales (swipe, pull-to-refresh)" } }],
      },
    },
  ]);
  
  await delay(500);
  
  // 3. Sección 2: Componentes a Optimizar
  console.log("\n📌 Agregando sección: Componentes a Optimizar");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "📱 Componentes a Optimizar" } }],
        color: "green_background",
      },
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "Dashboard móvil - KPIs priorizados y adaptados a viewport pequeño" } }],
      },
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "POS móvil - Checkout simplificado con botones grandes" } }],
      },
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "Navegación bottom-bar para acceso rápido a funciones" } }],
      },
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "Forms adaptativos - Campos optimizados para touch" } }],
      },
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "Modales y diálogos responsivos" } }],
      },
    },
    {
      object: "block",
      type: "numbered_list_item",
      numbered_list_item: {
        rich_text: [{ type: "text", text: { content: "Tablas y listas con scroll virtual" } }],
      },
    },
  ]);
  
  await delay(500);
  
  // 4. Sección 3: Diseño Responsive
  console.log("\n📌 Agregando sección: Diseño Responsive");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🎨 Diseño Responsive" } }],
        color: "purple_background",
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Breakpoints:" } },
          { type: "text", text: { content: " sm (640px), md (768px), lg (1024px)", annotations: { code: true } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Touch targets:" } },
          { type: "text", text: { content: " mínimo 44x44px para botones" } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Espaciado:" } },
          { type: "text", text: { content: " ajuste de padding y margins para pantallas táctiles" } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Tipografía:" } },
          { type: "text", text: { content: " tamaño mínimo 16px para inputs (evitar zoom iOS)" } },
        ],
      },
    },
  ]);
  
  await delay(500);
  
  // 5. Sección 4: Métricas de Éxito
  console.log("\n📌 Agregando sección: Métricas de Éxito");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "📊 Métricas de Éxito" } }],
        color: "orange_background",
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Tiempo checkout móvil:" } },
          { type: "text", text: { content: " < 2 minutos", annotations: { bold: true } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Satisfacción móvil (NPS):" } },
          { type: "text", text: { content: " > 50", annotations: { bold: true } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Error rate móvil:" } },
          { type: "text", text: { content: " < 5%", annotations: { bold: true } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Tasa de completitud de tareas móvil:" } },
          { type: "text", text: { content: " > 90%", annotations: { bold: true } },
        ],
      },
    },
  ]);
  
  await delay(500);
  
  // 6. Sección 5: Timeline
  console.log("\n📌 Agregando sección: Timeline Estimado");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "⏱️ Timeline Estimado (8 semanas)" } }],
        color: "red_background",
      },
    },
    {
      object: "block",
      type: "divider",
      divider: {},
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "Semana 1-2: Investigación y Diseño" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Analizar flujos móviles actuales" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Definir breakpoints y estrategia responsive" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Diseñar componentes móviles (mockups)" } }],
      },
    },
    {
      object: "block",
      type: "divider",
      divider: {},
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "Semana 3-4: Desarrollo Componentes" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Implementar sistema de grid responsive" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Crear componentes táctiles (MobileButton, MobileInput, etc.)" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Desarrollar bottom navigation" } }],
      },
    },
    {
      object: "block",
      type: "divider",
      divider: {},
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "Semana 5-6: Testing y Ajustes" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "User testing con vendedores en ópticas reales" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Ajustes basado en feedback" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Optimización de rendimiento móvil" } }],
      },
    },
    {
      object: "block",
      type: "divider",
      divider: {},
    },
    {
      object: "block",
      type: "heading_3",
      heading_3: {
        rich_text: [{ type: "text", text: { content: "Semana 7-8: Deployment y Documentación" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Deploy gradual a producción" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Documentación de componentes móviles" } }],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [{ type: "text", text: { content: "Monitorización de métricas" } }],
      },
    },
  ]);
  
  await delay(500);
  
  // 7. Sección 6: Dependencias
  console.log("\n📌 Agregando sección: Dependencias");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "🔗 Dependencias y Precedentes" } }],
        color: "gray_background",
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "[UX-5]" } },
          { type: "text", text: { content: " Mejorar navegación móvil - Bottom nav optimizado", annotations: { bold: true } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Design System Epoch" } },
          { type: "text", text: { content: " - Componentes responsivos base" } },
        ],
      },
    },
    {
      object: "block",
      type: "bulleted_list_item",
      bulleted_list_item: {
        rich_text: [
          { type: "text", text: { content: "Responsive Frontend Skill" } },
          { type: "text", text: { content: " - Patrones de diseño móvil" } },
        ],
      },
    },
  ]);
  
  await delay(500);
  
  // 8. Sección 7: Checklist de Implementación
  console.log("\n📌 Agregando sección: Checklist de Implementación");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: "✅ Checklist de Implementación" } }],
        color: "default",
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Auditoría de componentes actuales para mobile-first" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Definir tokens de diseño responsive" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Crear componentes MobileButton, MobileInput, MobileSelect" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Implementar BottomNav responsivo" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Optimizar Dashboard para móvil" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Optimizar POS para tablets" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Agregar gestos (swipe, pull-to-refresh)" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Testing con usuarios reales" } }],
        checked: false,
      },
    },
    {
      object: "block",
      type: "to_do",
      to_do: {
        rich_text: [{ type: "text", text: { content: "Documentar guías de implementación móvil" } }],
        checked: false,
      },
    },
  ]);
  
  await delay(500);
  
  // 9. Sección final: Nota
  console.log("\n📌 Agregando nota final");
  await addContentToPage(MOB_DASH_TASK_ID, [
    {
      object: "block",
      type: "callout",
      callout: {
        rich_text: [
          { type: "text", text: { content: "💡 Nota:" } },
          { type: "text", text: { content: " Este plan es un punto de partida. Se ajustará durante la ejecución según feedback del equipo y usuarios." } },
        ],
        icon: { emoji: "📝" },
        color: "blue",
      },
    },
  ]);
  
  console.log("\n🎉 ¡PLAN DETALLADO AGREGADO COMPLETAMENTE!");
}

// Función de delay para evitar rate limits
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Ejecutar
addMobDashPlan()
  .then(() => {
    console.log("\n🔗 Ver tarea en:");
    console.log(`https://www.notion.so/3320629343fc815fa78fefb7c8db53a0`);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });