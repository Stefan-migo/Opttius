/**
 * Script de prueba para agregar bloque a tarea MOB-DASH
 */

const https = require("https");

const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const MOB_DASH_TASK_ID = "33206293-43fc-815f-a78f-efb7c8db53a0"; // Tarea activa

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
          // Verificar si hay error en la respuesta
          if (res.statusCode >= 400) {
            reject({
              statusCode: res.statusCode,
              message: parsed.message || `HTTP ${res.statusCode}`,
              body: parsed,
            });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          // Si no es JSON, devolver raw data
          if (res.statusCode >= 400) {
            reject({
              statusCode: res.statusCode,
              message: `HTTP ${res.statusCode}`,
              body: data,
            });
          } else {
            resolve(data);
          }
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

async function testAddSimpleBlock() {
  console.log("🧪 Probando agregar bloque simple...");

  const simpleBlock = {
    children: [
      {
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [
            {
              type: "text",
              text: { content: "🎯 TEST: Plan de Optimización Móvil" },
            },
          ],
          color: "blue",
        },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: {
                content: "Este es un bloque de prueba agregado via API.",
              },
            },
          ],
        },
      },
    ],
  };

  try {
    console.log(
      `📝 Agregando bloque a tarea ${MOB_DASH_TASK_ID.substring(0, 8)}...`,
    );

    const response = await notionRequest(
      `blocks/${MOB_DASH_TASK_ID}/children`,
      "POST",
      JSON.stringify(simpleBlock),
    );

    console.log("✅ Bloque agregado exitosamente!");
    console.log("Respuesta:", JSON.stringify(response, null, 2).slice(0, 500));

    // Verificar que se creó
    const blocks = await notionRequest(`blocks/${MOB_DASH_TASK_ID}/children`);
    console.log(`\n📊 Bloques actuales: ${blocks.results?.length || 0}`);

    return true;
  } catch (error) {
    console.error("❌ Error agregando bloque:");
    console.error("Status:", error.statusCode);
    console.error("Mensaje:", error.message);
    console.error("Body:", JSON.stringify(error.body, null, 2));
    return false;
  }
}

async function getTaskDetails() {
  console.log("\n📋 Obteniendo detalles de la tarea...");

  try {
    const task = await notionRequest(`pages/${MOB_DASH_TASK_ID}`);

    console.log("Título:", task.properties.Task?.title?.[0]?.plain_text);
    console.log("Status:", task.properties.Status?.select?.name);
    console.log("Archivada:", task.archived || false);
    console.log(
      "URL:",
      `https://www.notion.so/${MOB_DASH_TASK_ID.replace(/-/g, "")}`,
    );

    return task;
  } catch (error) {
    console.error("Error obteniendo detalles:", error.message);
    return null;
  }
}

async function main() {
  console.log("🚀 PRUEBA DE AGREGADO DE BLOQUES A MOB-DASH\n");

  // 1. Obtener detalles
  await getTaskDetails();

  // 2. Probar agregar bloque simple
  const success = await testAddSimpleBlock();

  if (success) {
    console.log("\n🎯 PRUEBA EXITOSA - Se pueden agregar bloques");
    console.log("💡 Ahora puedes agregar el plan detallado completo.");
  } else {
    console.log("\n❌ PRUEBA FALLIDA - Revisar errores arriba");
    console.log("💡 Posibles problemas:");
    console.log("   - Token API inválido o expirado");
    console.log("   - Tarea archivada");
    console.log("   - Permisos insuficientes");
    console.log("   - Estructura de bloque inválida");
  }
}

main().catch((error) => {
  console.error("❌ Error en prueba:", error);
  process.exit(1);
});
