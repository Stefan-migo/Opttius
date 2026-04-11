/**
 * Script para limpiar y reescribir la main page de Opttius en Notion
 */

const https = require("https");

const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const MAIN_PAGE_ID = "33106293-43fc-801d-9af3-d4276041f38d";

// IDs de las child databases en la main page
const DOCS_DATABASE_ID = "33106293-43fc-816e-aa74-c5c95aa8b658";
const TASKS_DATABASE_ID = "33206293-43fc-8131-af94-d5d204be1dfd"; // Nueva
const FEATURES_DATABASE_ID = "33106293-43fc-81e3-88e8-c967841ade57";

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

// Eliminar un bloque
async function deleteBlock(blockId) {
  try {
    await notionRequest(`blocks/${blockId}`, "DELETE");
    console.log(`   ✅ Eliminado: ${blockId}`);
  } catch (e) {
    console.log(`   ❌ Error: ${blockId} - ${e.message?.slice(0, 50)}`);
  }
}

// Obtener todos los bloques de la página
async function getBlocks() {
  const response = await notionRequest(`blocks/${MAIN_PAGE_ID}/children`);
  return response.results;
}

// Crear nuevos bloques para la main page
async function createBlocks() {
  const blocks = [
    {
      heading_2: {
        rich_text: [{ text: { content: "👓 Opttius - SaaS para Ópticas" } }],
      },
    },
    {
      paragraph: {
        rich_text: [
          {
            text: {
              content:
                "Sistema SaaS multi-tenant 100% nativo para el mercado chileno. Gestiona clientes, citas, presupuestos, POS, inventario y trabajo de laboratorio.",
            },
          },
        ],
      },
    },
    { divider: {} },
    {
      heading_2: {
        rich_text: [{ text: { content: "📋 Gestión" } }],
      },
    },
    {
      column_list: {
        children: [
          {
            column: {
              children: [
                {
                  callout: {
                    rich_text: [{ text: { content: "📄 Documentación" } }],
                    icon: { emoji: "📄" },
                    color: "blue_background",
                  },
                },
              ],
            },
          },
          {
            column: {
              children: [
                {
                  callout: {
                    rich_text: [{ text: { content: "✅ Tareas" } }],
                    icon: { emoji: "✅" },
                    color: "green_background",
                  },
                },
              ],
            },
          },
          {
            column: {
              children: [
                {
                  callout: {
                    rich_text: [{ text: { content: "🚀 Features" } }],
                    icon: { emoji: "🚀" },
                    color: "purple_background",
                  },
                },
              ],
            },
          },
        ],
      },
    },
    { divider: {} },
    {
      heading_2: {
        rich_text: [{ text: { content: "🏗️ Arquitectura" } }],
      },
    },
    {
      bulleted_list_item: {
        rich_text: [{ text: { content: "Next.js 14 + TypeScript" } }],
      },
    },
    {
      bulleted_list_item: {
        rich_text: [
          { text: { content: "Supabase (PostgreSQL + Auth + Realtime)" } },
        ],
      },
    },
    {
      bulleted_list_item: {
        rich_text: [{ text: { content: "Tailwind CSS + shadcn/ui" } }],
      },
    },
    {
      bulleted_list_item: {
        rich_text: [
          { text: { content: "Multi-tenant con organización/sucursales" } },
        ],
      },
    },
    { divider: {} },
    {
      callout: {
        rich_text: [
          {
            text: {
              content:
                "Fuente de verdad: Esta base de conocimiento reemplazó NotebookLM. La documentación técnica está en las databases de arriba.",
            },
          },
        ],
        icon: { emoji: "💡" },
        color: "yellow_background",
      },
    },
  ];

  console.log("📝 Creando nuevos bloques...");

  for (const block of blocks) {
    await notionRequest(
      `blocks/${MAIN_PAGE_ID}/children`,
      "POST",
      JSON.stringify({
        children: [block],
      }),
    );
    console.log("   ✅ Bloque creado");
    await new Promise((r) => setTimeout(r, 200));
  }
}

// Añadir las databases como embebidas
async function addDatabases() {
  console.log("🔗 Añadiendo databases...");

  // Docs database
  await notionRequest(
    `blocks/${MAIN_PAGE_ID}/children`,
    "POST",
    JSON.stringify({
      children: [
        {
          child_database: { title: "📄 Opttius Docs" },
        },
      ],
    }),
  );

  await new Promise((r) => setTimeout(r, 300));

  // Tasks database
  await notionRequest(
    `blocks/${MAIN_PAGE_ID}/children`,
    "POST",
    JSON.stringify({
      children: [
        {
          child_database: { title: "✅ Opttius Tasks" },
        },
      ],
    }),
  );

  await new Promise((r) => setTimeout(r, 300));

  // Features database
  await notionRequest(
    `blocks/${MAIN_PAGE_ID}/children`,
    "POST",
    JSON.stringify({
      children: [
        {
          child_database: { title: "🚀 Opttius Features" },
        },
      ],
    }),
  );
}

async function main() {
  console.log("🚀 Limpiando y reescribiendo main page...\n");

  // 1. Obtener bloques actuales
  console.log("1. Obteniendo bloques actuales...");
  const blocks = await getBlocks();
  console.log(`   Encontrados: ${blocks.length} bloques`);

  // 2. Eliminar todos los bloques
  console.log("\n2. Eliminando bloques existentes...");
  for (const block of blocks) {
    await deleteBlock(block.id);
    await new Promise((r) => setTimeout(r, 100));
  }

  // 3. Crear nuevos bloques
  console.log("\n3. Creando nueva estructura...");
  await createBlocks();

  // 4. Añadir databases
  console.log("\n4. Añadiendo databases...");
  await addDatabases();

  console.log("\n✅ Main page actualizada!");
}

main().catch(console.error);
