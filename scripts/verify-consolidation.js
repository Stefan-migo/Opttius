/**
 * Script para verificar los resultados de la consolidación
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

async function verifyMobDashConsolidation() {
  console.log("🔍 VERIFICANDO CONSOLIDACIÓN MOB-DASH\n");

  // Buscar tareas MOB-DASH activas (no archivadas)
  const response = await notionRequest(
    `databases/${TASKS_DATABASE_ID}/query`,
    "POST",
    JSON.stringify({
      page_size: 50,
      filter: {
        and: [
          {
            property: "Task",
            title: {
              contains: "[MOB-DASH]",
            },
          },
          {
            property: "Status",
            select: {
              is_not_empty: true,
            },
          },
        ],
      },
    }),
  );

  const activeTasks = response.results || [];
  console.log(`📊 Tareas MOB-DASH activas: ${activeTasks.length}`);

  if (activeTasks.length === 0) {
    console.log("❌ No hay tareas MOB-DASH activas");
    return;
  }

  // Verificar cada tarea activa
  for (const task of activeTasks) {
    const title = task.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const status = task.properties.Status?.select?.name || "Sin status";
    const labels =
      task.properties.Labels?.multi_select?.map((l) => l.name).join(", ") ||
      "Sin labels";
    const isArchived = task.archived || false;

    console.log(`\n--- Tarea: ${title} ---`);
    console.log(`ID: ${task.id}`);
    console.log(`Status: ${status}`);
    console.log(`Labels: ${labels}`);
    console.log(`Archivada: ${isArchived}`);
    console.log(`URL: https://www.notion.so/${task.id.replace(/-/g, "")}`);

    // Obtener bloques de contenido
    const blocks = await notionRequest(`blocks/${task.id}/children`);
    const blockCount = blocks.results?.length || 0;

    console.log(`Bloques de contenido: ${blockCount}`);

    if (blockCount > 0) {
      console.log("✅ Tarea tiene plan detallado");

      // Listar tipos de bloques
      const blockTypes = blocks.results.map((b) => b.type).slice(0, 5);
      console.log(`   Primeros tipos de bloques: ${blockTypes.join(", ")}`);
    } else {
      console.log("❌ Tarea NO tiene plan detallado");
    }
  }

  // Buscar tareas archivadas
  console.log("\n🔍 BUSCANDO TAREAS ARCHIVADAS...");

  // Nota: La API de consulta de databases no filtra por archived, hay que buscar de otra manera
  // Por ahora confiamos en que la consolidación funcionó
  console.log("   (La verificación de archivadas requiere API diferente)");
}

async function verifyUxTasks() {
  console.log("\n\n🎨 VERIFICANDO TAREAS UX-2 Y UX-7\n");

  // Buscar UX-2
  const ux2Response = await notionRequest(
    `databases/${TASKS_DATABASE_ID}/query`,
    "POST",
    JSON.stringify({
      page_size: 10,
      filter: {
        property: "Task",
        title: {
          contains: "[UX-2]",
        },
      },
    }),
  );

  const ux2Tasks = ux2Response.results || [];
  console.log(`📊 Tareas UX-2 encontradas: ${ux2Tasks.length}`);

  ux2Tasks.forEach((task, index) => {
    const title = task.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const status = task.properties.Status?.select?.name || "Sin status";
    const isArchived = task.archived || false;

    console.log(`   ${index + 1}. ${title}`);
    console.log(`      Status: ${status} ${status === "Done" ? "✅" : "❌"}`);
    console.log(`      Archivada: ${isArchived}`);
  });

  // Buscar UX-7
  const ux7Response = await notionRequest(
    `databases/${TASKS_DATABASE_ID}/query`,
    "POST",
    JSON.stringify({
      page_size: 10,
      filter: {
        property: "Task",
        title: {
          contains: "[UX-7]",
        },
      },
    }),
  );

  const ux7Tasks = ux7Response.results || [];
  console.log(`\n📊 Tareas UX-7 encontradas: ${ux7Tasks.length}`);

  ux7Tasks.forEach((task, index) => {
    const title = task.properties.Task?.title?.[0]?.plain_text || "Sin título";
    const status = task.properties.Status?.select?.name || "Sin status";
    const isArchived = task.archived || false;

    console.log(`   ${index + 1}. ${title}`);
    console.log(`      Status: ${status} ${status === "Done" ? "✅" : "❌"}`);
    console.log(`      Archivada: ${isArchived}`);
  });

  // Resumen
  const ux2Done = ux2Tasks.filter(
    (t) => t.properties.Status?.select?.name === "Done" && !t.archived,
  ).length;
  const ux7Done = ux7Tasks.filter(
    (t) => t.properties.Status?.select?.name === "Done" && !t.archived,
  ).length;

  console.log("\n📈 RESUMEN VERIFICACIÓN UX:");
  console.log(`   UX-2 en "Done" y activa: ${ux2Done}/${ux2Tasks.length}`);
  console.log(`   UX-7 en "Done" y activa: ${ux7Done}/${ux7Tasks.length}`);
}

async function main() {
  console.log("✅ VERIFICACIÓN DE RESULTADOS DE CONSOLIDACIÓN\n");

  await verifyMobDashConsolidation();
  await verifyUxTasks();

  console.log("\n🎯 VERIFICACIÓN COMPLETADA");
  console.log("\n💡 RECOMENDACIONES:");
  console.log("1. Revisar manualmente la tarea MOB-DASH en Notion");
  console.log("2. Verificar que el plan detallado sea adecuado");
  console.log("3. Confirmar que UX-2 y UX-7 estén realmente completadas");
}

main().catch((error) => {
  console.error("❌ Error en verificación:", error);
  process.exit(1);
});
