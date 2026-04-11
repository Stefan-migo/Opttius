/**
 * Script de diagnóstico para tareas de Notion - Verificar duplicados y estados
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

// Buscar todas las tareas con filtro opcional
async function getAllTasks(filterTitle = null) {
  console.log(
    `🔍 Buscando tareas${filterTitle ? ` con filtro: "${filterTitle}"` : ""}...`,
  );

  try {
    const response = await notionRequest(
      `databases/${TASKS_DATABASE_ID}/query`,
      "POST",
      JSON.stringify({
        page_size: 100,
        sorts: [{ property: "Task", direction: "ascending" }],
      }),
    );

    let tasks = response.results;

    // Filtrar por título si se especifica
    if (filterTitle) {
      tasks = tasks.filter((task) => {
        const taskTitle = task.properties.Task?.title?.[0]?.plain_text || "";
        return taskTitle.includes(filterTitle);
      });
    }

    console.log(`   Encontradas ${tasks.length} tareas`);
    return tasks;
  } catch (error) {
    console.error(`Error buscando tareas:`, error.message);
    return [];
  }
}

// Mostrar detalles de tareas específicas
async function diagnoseMobDashTasks() {
  console.log("📱 DIAGNÓSTICO: Tareas MOB-DASH\n");

  // Buscar todas las tareas MOB-DASH
  const mobDashTasks = await getAllTasks("[MOB-DASH]");

  if (mobDashTasks.length === 0) {
    console.log("❌ No se encontraron tareas MOB-DASH");
    return;
  }

  console.log(`📊 Se encontraron ${mobDashTasks.length} tareas MOB-DASH:`);

  mobDashTasks.forEach((task, index) => {
    const title = task.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const status = task.properties.Status?.select?.name || "Sin status";
    const priority = task.properties.Priority?.select?.name || "Sin prioridad";
    const labels =
      task.properties.Labels?.multi_select?.map((l) => l.name).join(", ") ||
      "Sin labels";
    const createdTime = new Date(task.created_time).toLocaleDateString();
    const lastEdited = new Date(task.last_edited_time).toLocaleDateString();

    console.log(`\n--- Tarea ${index + 1} ---`);
    console.log(`ID: ${task.id}`);
    console.log(`Título: ${title}`);
    console.log(`Status: ${status}`);
    console.log(`Prioridad: ${priority}`);
    console.log(`Labels: ${labels}`);
    console.log(`Creada: ${createdTime}`);
    console.log(`Última edición: ${lastEdited}`);

    // Verificar si tiene contenido/plan detallado
    console.log(`URL: https://www.notion.so/${task.id.replace(/-/g, "")}`);
  });

  // Recomendaciones
  console.log("\n🎯 RECOMENDACIONES:");
  if (mobDashTasks.length > 1) {
    console.log("1. ✅ Hay tareas duplicadas - Se debe consolidar en una sola");
    console.log(
      "2. 💡 Sugerencia: Mantener la más reciente o la mejor estructurada",
    );
    console.log(
      "3. 🗑️  Eliminar las duplicadas después de consolidar la información",
    );
  } else {
    console.log("1. ✅ Solo hay una tarea - No hay duplicados");
  }

  // Verificar si tienen plan detallado
  console.log("\n📋 VERIFICACIÓN DE PLAN DETALLADO:");
  const tasksWithContent = mobDashTasks.filter((task) => {
    // Verificar si tiene contenido en la página (bloques)
    // Esto requeriría otra llamada a la API
    return true; // Por ahora asumimos que no
  });

  if (tasksWithContent.length === 0) {
    console.log("❌ Ninguna tarea tiene plan detallado agregado");
    console.log("💡 Necesitas agregar:");
    console.log("   - Objetivos específicos móviles");
    console.log("   - Componentes a optimizar");
    console.log("   - Métricas de éxito");
    console.log("   - Timeline estimado");
  }
}

// Verificar estado de tareas UX
async function diagnoseUxTasks() {
  console.log("\n\n🎨 DIAGNÓSTICO: Tareas UX-2 y UX-7\n");

  // Buscar UX-2
  const ux2Tasks = await getAllTasks("[UX-2]");
  console.log(`📊 Tareas UX-2 encontradas: ${ux2Tasks.length}`);

  ux2Tasks.forEach((task, index) => {
    const title = task.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const status = task.properties.Status?.select?.name || "Sin status";
    console.log(`   ${index + 1}. ${title} - Status: ${status}`);

    if (status !== "Done") {
      console.log(`   ⚠️  UX-2 NO está en "Done" - Actual: ${status}`);
    }
  });

  // Buscar UX-7
  const ux7Tasks = await getAllTasks("[UX-7]");
  console.log(`\n📊 Tareas UX-7 encontradas: ${ux7Tasks.length}`);

  ux7Tasks.forEach((task, index) => {
    const title = task.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const status = task.properties.Status?.select?.name || "Sin status";
    console.log(`   ${index + 1}. ${title} - Status: ${status}`);

    if (status !== "Done") {
      console.log(`   ⚠️  UX-7 NO está en "Done" - Actual: ${status}`);
    }
  });

  // Resumen
  const ux2Done = ux2Tasks.filter(
    (t) => t.properties.Status?.select?.name === "Done",
  ).length;
  const ux7Done = ux7Tasks.filter(
    (t) => t.properties.Status?.select?.name === "Done",
  ).length;

  console.log("\n📈 RESUMEN ESTADO UX:");
  console.log(`   UX-2 en "Done": ${ux2Done}/${ux2Tasks.length}`);
  console.log(`   UX-7 en "Done": ${ux7Done}/${ux7Tasks.length}`);
}

// Listar todas las tareas para contexto
async function listAllTasksBrief() {
  console.log("\n\n📋 CONTEXTO: Todas las tareas en la database\n");

  const allTasks = await getAllTasks();

  console.log(`Total de tareas: ${allTasks.length}\n`);

  // Agrupar por tipo/módulo para análisis
  const tasksByType = {};
  allTasks.forEach((task) => {
    const type = task.properties.Type?.select?.name || "Sin tipo";
    const module = task.properties.Module?.select?.name || "Sin módulo";
    const status = task.properties.Status?.select?.name || "Sin status";

    const key = `${type} - ${module}`;
    if (!tasksByType[key]) {
      tasksByType[key] = { total: 0, byStatus: {} };
    }
    tasksByType[key].total++;

    if (!tasksByType[key].byStatus[status]) {
      tasksByType[key].byStatus[status] = 0;
    }
    tasksByType[key].byStatus[status]++;
  });

  console.log("📊 Distribución por tipo/módulo:");
  Object.entries(tasksByType).forEach(([key, data]) => {
    console.log(`   ${key}: ${data.total} tareas`);
    Object.entries(data.byStatus).forEach(([status, count]) => {
      console.log(`      - ${status}: ${count}`);
    });
  });
}

// Función principal
async function main() {
  console.log("🔍 INICIANDO DIAGNÓSTICO DE TAREAS NOTION\n");

  // 1. Diagnóstico MOB-DASH
  await diagnoseMobDashTasks();

  // 2. Diagnóstico UX tasks
  await diagnoseUxTasks();

  // 3. Contexto general
  await listAllTasksBrief();

  console.log("\n✅ DIAGNÓSTICO COMPLETADO");
  console.log("\n💡 SUGERENCIAS DE ACCIÓN:");
  console.log("1. Revisar IDs de tareas MOB-DASH duplicadas");
  console.log("2. Consolidar en una sola tarea con plan detallado");
  console.log("3. Verificar que UX-2 y UX-7 estén realmente en 'Done'");
  console.log("4. Actualizar tareas con información faltante");
}

// Ejecutar
main().catch((error) => {
  console.error("❌ Error en diagnóstico:", error);
  process.exit(1);
});
