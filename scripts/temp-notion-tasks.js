/**
 * Script para gestionar tareas en Notion - Crear MOB-DASH y actualizar UX-2/UX-7
 */

const https = require("https");

// Configuración desde .env.local
const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const TASKS_DATABASE_ID = "33206293-43fc-8109-bee2-c6a36c73f4e6";

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

// Buscar tarea por título (coincidencia parcial)
async function findTaskByTitle(partialTitle) {
  console.log(`🔍 Buscando tarea con: "${partialTitle}"...`);

  try {
    // Primero listamos todas y filtramos localmente para mayor control
    const response = await notionRequest(
      `databases/${TASKS_DATABASE_ID}/query`,
      "POST",
      JSON.stringify({
        page_size: 50,
        sorts: [{ property: "Task", direction: "ascending" }],
      }),
    );

    // Filtrar por coincidencia parcial en el título
    const matchingTasks = response.results.filter((task) => {
      const taskTitle = task.properties.Task?.title?.[0]?.plain_text || "";
      return taskTitle.includes(partialTitle);
    });

    console.log(`   Encontradas ${matchingTasks.length} coincidencias`);
    return matchingTasks[0]; // Retorna la primera coincidencia
  } catch (error) {
    console.error(`Error buscando tarea "${partialTitle}":`, error.message);
    return null;
  }
}

// Crear nueva tarea MOB-DASH
async function createMobDashTask() {
  console.log("📱 Creando tarea MOB-DASH...");

  const taskData = {
    parent: { database_id: TASKS_DATABASE_ID },
    properties: {
      Task: {
        title: [
          {
            text: {
              content: "[MOB-DASH] Optimización Móvil Dashboard",
            },
          },
        ],
      },
      Status: {
        select: { name: "Backlog" },
      },
      Priority: {
        select: { name: "P1 - High" },
      },
      Type: {
        select: { name: "Improvement" },
      },
      Module: {
        select: { name: "design" },
      },
      Labels: {
        multi_select: [
          { name: "mobile" },
          { name: "ui-ux" },
          { name: "dashboard" },
        ],
      },
    },
  };

  try {
    const response = await notionRequest(
      "pages",
      "POST",
      JSON.stringify(taskData),
    );
    console.log("✅ Tarea MOB-DASH creada exitosamente");
    console.log(
      `🔗 URL: https://www.notion.so/${response.id.replace(/-/g, "")}`,
    );
    return response;
  } catch (error) {
    console.error("Error creando tarea MOB-DASH:", error.message);
    if (error.response) {
      console.error("Respuesta error:", error.response);
    }
    return null;
  }
}

// Actualizar tarea existente
async function updateTask(taskId, updates) {
  console.log(`✏️ Actualizando tarea ${taskId.substring(0, 8)}...`);

  try {
    const response = await notionRequest(
      `pages/${taskId}`,
      "PATCH",
      JSON.stringify({
        properties: updates,
      }),
    );

    console.log("✅ Tarea actualizada exitosamente");
    return response;
  } catch (error) {
    console.error("Error actualizando tarea:", error.message);
    return null;
  }
}

// Actualizar tareas UX-2 y UX-7 a "Done"
async function updateUxTasks() {
  console.log("\n🎨 Actualizando tareas UX-2 y UX-7...");

  // Buscar UX-2 por código
  const ux2Task = await findTaskByTitle("[UX-2]");
  if (ux2Task) {
    console.log(`📊 Encontrada UX-2: ${ux2Task.id.substring(0, 8)}`);

    await updateTask(ux2Task.id, {
      Status: {
        select: { name: "Done" },
      },
      Labels: {
        multi_select: [
          { name: "ui-ux" },
          { name: "dashboard" },
          { name: "completed" },
        ],
      },
    });
  } else {
    console.log("⚠️ No se encontró la tarea UX-2");
  }

  // Buscar UX-7 por código
  const ux7Task = await findTaskByTitle("[UX-7]");
  if (ux7Task) {
    console.log(`📊 Encontrada UX-7: ${ux7Task.id.substring(0, 8)}`);

    await updateTask(ux7Task.id, {
      Status: {
        select: { name: "Done" },
      },
      Labels: {
        multi_select: [
          { name: "ui-ux" },
          { name: "design" },
          { name: "completed" },
        ],
      },
    });
  } else {
    console.log("⚠️ No se encontró la tarea UX-7");
  }
}

// Listar todas las tareas para debug
async function listAllTasks() {
  console.log("\n📋 Listando todas las tareas...");

  try {
    const response = await notionRequest(
      `databases/${TASKS_DATABASE_ID}/query`,
      "POST",
      JSON.stringify({
        page_size: 20,
        sorts: [{ property: "Task", direction: "ascending" }],
      }),
    );

    console.log(`Total tareas: ${response.results.length}`);

    response.results.forEach((task) => {
      const title =
        task.properties.Task?.title?.[0]?.plain_text || "Sin título";
      const status = task.properties.Status?.select?.name || "Sin status";
      console.log(`- ${title} (${status})`);
    });

    return response.results;
  } catch (error) {
    console.error("Error listando tareas:", error.message);
    return [];
  }
}

// Función principal
async function main() {
  console.log("🚀 Iniciando gestión de tareas en Notion...\n");

  // Paso 1: Listar tareas para verificar conexión
  await listAllTasks();

  // Paso 2: Crear MOB-DASH
  await createMobDashTask();

  // Paso 3: Actualizar UX-2 y UX-7
  await updateUxTasks();

  console.log("\n✅ Proceso completado!");
}

// Ejecutar
main().catch((error) => {
  console.error("❌ Error en proceso principal:", error);
  process.exit(1);
});
