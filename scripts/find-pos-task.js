/**
 * Script para buscar y actualizar tareas relacionadas con POS en Notion
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

// Buscar tareas relacionadas con POS
async function findPOSTasks() {
  console.log("🔍 Buscando tareas relacionadas con POS...\n");

  try {
    const response = await notionRequest(
      `databases/${TASKS_DATABASE_ID}/query`,
      "POST",
      JSON.stringify({
        page_size: 100,
        sorts: [{ property: "Task", direction: "ascending" }],
      }),
    );

    const tasks = response.results;

    // Filtrar tareas con POS en el título
    const posTasks = tasks.filter((task) => {
      const title = task.properties.Task?.title?.[0]?.plain_text || "";
      return title.toLowerCase().includes("pos");
    });

    console.log(`📊 Se encontraron ${posTasks.length} tareas con "POS":\n`);

    posTasks.forEach((task, index) => {
      const title =
        task.properties.Task?.title?.[0]?.plain_text || "Sin título";
      const status = task.properties.Status?.select?.name || "Sin status";
      const priority =
        task.properties.Priority?.select?.name || "Sin prioridad";
      const labels =
        task.properties.Labels?.multi_select?.map((l) => l.name).join(", ") ||
        "Sin labels";

      console.log(`--- Tarea ${index + 1} ---`);
      console.log(`ID: ${task.id}`);
      console.log(`Título: ${title}`);
      console.log(`Status: ${status}`);
      console.log(`Priority: ${priority}`);
      console.log(`Labels: ${labels}`);
      console.log("");
    });

    return posTasks;
  } catch (error) {
    console.error(`Error buscando tareas:`, error.message);
    return [];
  }
}

// Actualizar tarea
async function updateTask(taskId, updates) {
  console.log(`\n✏️  Actualizando tarea ${taskId}...`);

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
    console.error(`Error actualizando tarea:`, error.message);
    return null;
  }
}

// Mostrar opciones de status disponibles
async function showStatusOptions() {
  console.log("\n📋 Obteniendo opciones de Status...");

  try {
    const response = await notionRequest(
      `databases/${TASKS_DATABASE_ID}`,
      "GET",
    );

    const statusProperty = response.properties.Status?.select?.options || [];
    console.log("Opciones de Status disponibles:");
    statusProperty.forEach((option) => {
      console.log(`  - ${option.name}`);
    });

    return statusProperty;
  } catch (error) {
    console.error(`Error obteniendo opciones:`, error.message);
    return [];
  }
}

// Función principal
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "search") {
    await findPOSTasks();
  } else if (command === "status-options") {
    await showStatusOptions();
  } else if (command === "update") {
    const taskId = args[1];
    const newStatus = args[2];
    const notes = args.slice(3).join(" ");

    if (!taskId || !newStatus) {
      console.log(
        "Uso: node find-pos-task.js update <taskId> <status> [notas]",
      );
      return;
    }

    const updates = {
      Status: { select: { name: newStatus } },
    };

    if (notes) {
      updates.Notes = { rich_text: [{ text: { content: notes } }] };
    }

    await updateTask(taskId, updates);
  } else {
    console.log("Comandos disponibles:");
    console.log("  search         - Buscar tareas relacionadas con POS");
    console.log("  status-options - Mostrar opciones de Status");
    console.log("  update         - Actualizar una tarea");
    console.log("");
    console.log("Ejemplo:");
    console.log(
      "  node find-pos-task.js update <taskId> 'In Progress' 'Notas opcionales'",
    );
  }
}

main();
