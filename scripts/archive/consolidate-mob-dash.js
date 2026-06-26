/**
 * Script para consolidar tareas MOB-DASH duplicadas en Notion
 */

const https = require("https");

// Configuración desde .env.local
const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const TASKS_DATABASE_ID = "33206293-43fc-8109-bee2-c6a36c73f4e6";

// IDs de las tareas MOB-DASH duplicadas (del diagnóstico)
const MOB_DASH_TASK_IDS = [
  "33206293-43fc-814d-a6d5-d72033cbe161", // Primera (probablemente creada manualmente)
  "33206293-43fc-815f-a78f-efb7c8db53a0", // Segunda (creada por nuestro script)
];

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

// Obtener bloques de una página para ver si tiene contenido
async function getPageBlocks(pageId) {
  console.log(`📄 Obteniendo bloques de página ${pageId.substring(0, 8)}...`);

  try {
    const response = await notionRequest(`blocks/${pageId}/children`);
    return response.results || [];
  } catch (error) {
    console.error(`Error obteniendo bloques:`, error.message);
    return [];
  }
}

// Obtener detalles de una tarea
async function getTaskDetails(pageId) {
  try {
    const response = await notionRequest(`pages/${pageId}`);
    return response;
  } catch (error) {
    console.error(`Error obteniendo detalles:`, error.message);
    return null;
  }
}

// Actualizar una tarea con plan detallado
async function updateTaskWithPlan(pageId) {
  console.log(
    `📝 Agregando plan detallado a tarea ${pageId.substring(0, 8)}...`,
  );

  const planContent = {
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            { type: "text", text: { content: "🎯 Objetivos Específicos" } },
          ],
          color: "blue",
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
                  "Optimizar experiencia móvil para vendedores en tienda (tablets)",
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
                  "Mejorar navegación touch para POS móvil (pantallas táctiles)",
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
                  "Adaptar visualización de datos para pantallas pequeñas",
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
                  "Reducir tiempo de interacción en flujos móviles críticos",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            { type: "text", text: { content: "📱 Componentes a Optimizar" } },
          ],
          color: "green",
        },
      },
      {
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Dashboard móvil - KPIs priorizados" },
            },
          ],
        },
      },
      {
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "POS móvil - Checkout simplificado" },
            },
          ],
        },
      },
      {
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Navegación bottom-bar para móvil" },
            },
          ],
        },
      },
      {
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "Forms adaptativos - Campos optimizados para touch",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [
            {
              type: "text",
              text: { content: "Modales y diálogos responsivos" },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            { type: "text", text: { content: "📊 Métricas de Éxito" } },
          ],
          color: "purple",
        },
      },
      {
        object: "block",
        type: "table",
        table: {
          table_width: 3,
          children: [
            {
              object: "block",
              type: "table_row",
              table_row: {
                cells: [
                  [{ type: "text", text: { content: "Métrica" } }],
                  [{ type: "text", text: { content: "Objetivo" } }],
                  [{ type: "text", text: { content: "Actual" } }],
                ],
              },
            },
            {
              object: "block",
              type: "table_row",
              table_row: {
                cells: [
                  [
                    {
                      type: "text",
                      text: { content: "Tiempo checkout móvil" },
                    },
                  ],
                  [{ type: "text", text: { content: "< 2 min" } }],
                  [{ type: "text", text: { content: "Por medir" } }],
                ],
              },
            },
            {
              object: "block",
              type: "table_row",
              table_row: {
                cells: [
                  [
                    {
                      type: "text",
                      text: { content: "Satisfacción móvil (NPS)" },
                    },
                  ],
                  [{ type: "text", text: { content: "> 50" } }],
                  [{ type: "text", text: { content: "Por medir" } }],
                ],
              },
            },
            {
              object: "block",
              type: "table_row",
              table_row: {
                cells: [
                  [{ type: "text", text: { content: "Error rate móvil" } }],
                  [{ type: "text", text: { content: "< 5%" } }],
                  [{ type: "text", text: { content: "Por medir" } }],
                ],
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            { type: "text", text: { content: "⏱️ Timeline Estimado" } },
          ],
          color: "orange",
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
                  "Semana 1-2: Investigación y diseño de componentes móviles",
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
                content: "Semana 3-4: Desarrollo de componentes prioritarios",
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
                content: "Semana 5-6: Testing con usuarios ópticos",
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
                content: "Semana 7-8: Iteración y deployment",
              },
            },
          ],
        },
      },
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: "🔗 Dependencias" } }],
          color: "red",
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
                  "[UX-5] Mejorar navegación móvil - Bottom nav optimizado",
              },
              annotations: { bold: true },
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
                content: "Componentes responsivos del design system Epoch",
              },
            },
          ],
        },
      },
    ],
  };

  try {
    // Primero, actualizar la tarea para agregar labels más específicos
    await notionRequest(
      `pages/${pageId}`,
      "PATCH",
      JSON.stringify({
        properties: {
          Labels: {
            multi_select: [
              { name: "mobile" },
              { name: "ui-ux" },
              { name: "dashboard" },
              { name: "responsive" },
              { name: "optimization" },
            ],
          },
        },
      }),
    );

    // Agregar los bloques de contenido
    await notionRequest(
      `blocks/${pageId}/children`,
      "POST",
      JSON.stringify(planContent),
    );

    console.log(`✅ Plan detallado agregado exitosamente`);
    return true;
  } catch (error) {
    console.error(`Error actualizando tarea:`, error.message);
    return false;
  }
}

// Eliminar una tarea (archivar)
async function deleteTask(pageId) {
  console.log(`🗑️  Archivando tarea ${pageId.substring(0, 8)}...`);

  try {
    await notionRequest(
      `pages/${pageId}`,
      "PATCH",
      JSON.stringify({
        archived: true,
      }),
    );

    console.log(`✅ Tarea archivada exitosamente`);
    return true;
  } catch (error) {
    console.error(`Error archivando tarea:`, error.message);
    return false;
  }
}

// Función principal de consolidación
async function consolidateMobDashTasks() {
  console.log("🔄 INICIANDO CONSOLIDACIÓN DE TAREAS MOB-DASH\n");

  // 1. Analizar cada tarea
  const taskAnalysis = [];

  for (const taskId of MOB_DASH_TASK_IDS) {
    console.log(`\n--- Analizando tarea ${taskId.substring(0, 8)} ---`);

    // Obtener detalles
    const details = await getTaskDetails(taskId);
    if (!details) continue;

    // Obtener bloques
    const blocks = await getPageBlocks(taskId);

    const title =
      details.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const createdTime = new Date(details.created_time);
    const lastEdited = new Date(details.last_edited_time);
    const hasContent = blocks.length > 0;

    taskAnalysis.push({
      id: taskId,
      title,
      createdTime,
      lastEdited,
      hasContent,
      blockCount: blocks.length,
      details,
    });

    console.log(`   Título: ${title}`);
    console.log(`   Creada: ${createdTime.toLocaleString()}`);
    console.log(`   Editada: ${lastEdited.toLocaleString()}`);
    console.log(
      `   Bloques: ${blocks.length} (${hasContent ? "Con contenido" : "Vacía"})`,
    );
  }

  // 2. Decidir cuál mantener
  console.log("\n🤔 DECISIÓN DE CONSOLIDACIÓN:");

  // Prioridad: 1) Tiene contenido, 2) Más reciente, 3) Primera en la lista
  let taskToKeep = null;
  let taskToDelete = null;

  // Primero buscar si alguna tiene contenido
  const tasksWithContent = taskAnalysis.filter((t) => t.hasContent);
  if (tasksWithContent.length > 0) {
    // Si solo una tiene contenido, mantener esa
    if (tasksWithContent.length === 1) {
      taskToKeep = tasksWithContent[0];
      taskToDelete = taskAnalysis.find((t) => t.id !== taskToKeep.id);
      console.log(
        `✅ Manteniendo tarea con contenido: ${taskToKeep.id.substring(0, 8)}`,
      );
    } else {
      // Si ambas tienen contenido, mantener la más reciente
      tasksWithContent.sort((a, b) => b.lastEdited - a.lastEdited);
      taskToKeep = tasksWithContent[0];
      taskToDelete = tasksWithContent[1];
      console.log(
        `✅ Ambas tienen contenido - Manteniendo la más reciente: ${taskToKeep.id.substring(0, 8)}`,
      );
    }
  } else {
    // Ninguna tiene contenido, mantener la primera (más antigua probablemente)
    taskAnalysis.sort((a, b) => a.createdTime - b.createdTime);
    taskToKeep = taskAnalysis[0];
    taskToDelete = taskAnalysis[1];
    console.log(
      `✅ Ninguna tiene contenido - Manteniendo la primera: ${taskToKeep.id.substring(0, 8)}`,
    );
  }

  // 3. Agregar plan detallado a la tarea que se mantiene
  console.log("\n📋 AGREGANDO PLAN DETALLADO:");
  const planAdded = await updateTaskWithPlan(taskToKeep.id);

  if (!planAdded) {
    console.log("⚠️ No se pudo agregar el plan detallado, pero continuando...");
  }

  // 4. Eliminar la tarea duplicada
  console.log("\n🗑️  ELIMINANDO DUPLICADO:");
  const deleted = await deleteTask(taskToDelete.id);

  if (!deleted) {
    console.log("⚠️ No se pudo archivar la tarea duplicada");
  }

  // 5. Resumen final
  console.log("\n🎯 CONSOLIDACIÓN COMPLETADA:");
  console.log(`   ✅ Tarea mantenida: ${taskToKeep.title}`);
  console.log(
    `   🔗 URL: https://www.notion.so/${taskToKeep.id.replace(/-/g, "")}`,
  );
  console.log(`   📝 Plan detallado agregado: ${planAdded ? "Sí" : "No"}`);
  console.log(`   🗑️  Tarea archivada: ${taskToDelete.id.substring(0, 8)}`);

  // 6. Verificar que solo quede una tarea MOB-DASH
  console.log("\n🔍 VERIFICACIÓN FINAL:");

  // Buscar tareas MOB-DASH restantes
  const response = await notionRequest(
    `databases/${TASKS_DATABASE_ID}/query`,
    "POST",
    JSON.stringify({
      page_size: 50,
      filter: {
        property: "Task",
        title: {
          contains: "[MOB-DASH]",
        },
      },
    }),
  );

  const remainingTasks = response.results || [];
  console.log(`   Tareas MOB-DASH restantes: ${remainingTasks.length}`);

  if (remainingTasks.length === 1) {
    console.log("✅ ¡Consolidación exitosa! Solo queda una tarea MOB-DASH");
  } else {
    console.log("⚠️  Aún hay múltiples tareas MOB-DASH. Revisar manualmente.");
  }
}

// Ejecutar consolidación
consolidateMobDashTasks().catch((error) => {
  console.error("❌ Error en consolidación:", error);
  process.exit(1);
});
