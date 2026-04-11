/**
 * Script para recrear las databases y reconstruir la main page
 */

const https = require("https");

const NOTION_API_KEY = "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const MAIN_PAGE_ID = "33106293-43fc-801d-9af3-d4276041f38d";

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

// Crear database de Docs
async function createDocsDatabase() {
  console.log("📄 Creando database Docs...");

  const db = await notionRequest(
    "databases",
    "POST",
    JSON.stringify({
      parent: { page_id: MAIN_PAGE_ID },
      title: [{ text: { content: "📄 Opttius Docs" } }],
      properties: {
        Name: { title: {} },
        Category: {
          select: {
            options: [
              { name: "getting-started", color: "blue" },
              { name: "architecture", color: "green" },
              { name: "modules", color: "purple" },
              { name: "integration", color: "yellow" },
              { name: "devops", color: "orange" },
              { name: "design", color: "pink" },
              { name: "testing", color: "red" },
              { name: "user-guide", color: "blue" },
              { name: "marketing", color: "gray" },
            ],
          },
        },
        Status: {
          select: {
            options: [
              { name: "draft", color: "gray" },
              { name: "in_review", color: "yellow" },
              { name: "published", color: "green" },
            ],
          },
        },
        Priority: {
          select: {
            options: [
              { name: "low", color: "gray" },
              { name: "medium", color: "yellow" },
              { name: "high", color: "orange" },
              { name: "critical", color: "red" },
            ],
          },
        },
      },
      icon: { emoji: "📄" },
    }),
  );

  if (db.id) {
    console.log(`   ✅ Docs database: ${db.id}`);
    return db.id;
  }
  console.log("   ❌ Error:", db.message);
  return null;
}

// Crear database de Tasks
async function createTasksDatabase() {
  console.log("✅ Creando database Tasks...");

  const db = await notionRequest(
    "databases",
    "POST",
    JSON.stringify({
      parent: { page_id: MAIN_PAGE_ID },
      title: [{ text: { content: "✅ Opttius Tasks" } }],
      properties: {
        Task: { title: {} },
        Status: {
          select: {
            options: [
              { name: "Backlog", color: "gray" },
              { name: "To Do", color: "blue" },
              { name: "In Progress", color: "yellow" },
              { name: "Review", color: "purple" },
              { name: "Done", color: "green" },
              { name: "Blocked", color: "red" },
            ],
          },
        },
        Priority: {
          select: {
            options: [
              { name: "P0 - Critical", color: "red" },
              { name: "P1 - High", color: "orange" },
              { name: "P2 - Medium", color: "yellow" },
              { name: "P3 - Low", color: "gray" },
            ],
          },
        },
        Type: {
          select: {
            options: [
              { name: "Task", color: "blue" },
              { name: "Bug", color: "red" },
              { name: "Feature", color: "green" },
              { name: "Improvement", color: "purple" },
            ],
          },
        },
        Module: {
          select: {
            options: [
              { name: "crm", color: "blue" },
              { name: "appointments", color: "green" },
              { name: "quotes", color: "purple" },
              { name: "pos", color: "yellow" },
              { name: "inventory", color: "orange" },
              { name: "work-orders", color: "red" },
              { name: "payments", color: "pink" },
              { name: "ai", color: "blue" },
              { name: "whatsapp", color: "gray" },
              { name: "support", color: "blue" },
              { name: "analytics", color: "green" },
              { name: "design", color: "pink" },
              { name: "system", color: "purple" },
            ],
          },
        },
        Labels: {
          multi_select: {
            options: [
              { name: "frontend", color: "blue" },
              { name: "backend", color: "green" },
              { name: "database", color: "purple" },
              { name: "api", color: "yellow" },
              { name: "ui-ux", color: "pink" },
              { name: "testing", color: "blue" },
              { name: "security", color: "red" },
              { name: "performance", color: "orange" },
            ],
          },
        },
        "Due Date": { date: {} },
        Assignee: { people: {} },
      },
      icon: { emoji: "✅" },
    }),
  );

  if (db.id) {
    console.log(`   ✅ Tasks database: ${db.id}`);
    return db.id;
  }
  console.log("   ❌ Error:", db.message);
  return null;
}

// Crear database de Features
async function createFeaturesDatabase() {
  console.log("🚀 Creando database Features...");

  const db = await notionRequest(
    "databases",
    "POST",
    JSON.stringify({
      parent: { page_id: MAIN_PAGE_ID },
      title: [{ text: { content: "🚀 Opttius Features" } }],
      properties: {
        Feature: { title: {} },
        Status: {
          select: {
            options: [
              { name: "Planned", color: "gray" },
              { name: "In Development", color: "yellow" },
              { name: "Beta", color: "purple" },
              { name: "Released", color: "green" },
            ],
          },
        },
        Priority: {
          select: {
            options: [
              { name: "Low", color: "gray" },
              { name: "Medium", color: "yellow" },
              { name: "High", color: "orange" },
              { name: "Critical", color: "red" },
            ],
          },
        },
        Module: {
          select: {
            options: [
              { name: "crm", color: "blue" },
              { name: "appointments", color: "green" },
              { name: "quotes", color: "purple" },
              { name: "pos", color: "yellow" },
              { name: "inventory", color: "orange" },
              { name: "work-orders", color: "red" },
              { name: "ai", color: "blue" },
              { name: "whatsapp", color: "gray" },
            ],
          },
        },
      },
      icon: { emoji: "🚀" },
    }),
  );

  if (db.id) {
    console.log(`   ✅ Features database: ${db.id}`);
    return db.id;
  }
  console.log("   ❌ Error:", db.message);
  return null;
}

// Añadir contenido a la main page
async function addMainPageContent(docsId, tasksId, featuresId) {
  console.log("📝 Añadiendo contenido a main page...");

  // Usar el endpoint de append children
  const content = [
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
        rich_text: [{ text: { content: "📚 Bases de Conocimiento" } }],
      },
    },
    {
      callout: {
        rich_text: [
          {
            text: {
              content:
                "Esta base de conocimiento reemplazó NotebookLM. La documentación técnica está en las databases abaixo.",
            },
          },
        ],
        icon: { emoji: "💡" },
        color: "yellow_background",
      },
    },
    { divider: {} },
    { heading_2: { rich_text: [{ text: { content: "🏗️ Tech Stack" } }] } },
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
  ];

  for (const block of content) {
    await notionRequest(
      `blocks/${MAIN_PAGE_ID}/children`,
      "POST",
      JSON.stringify({
        children: [block],
      }),
    );
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("   ✅ Contenido creado");
}

async function main() {
  console.log("🚀 Recreando databases y main page...\n");

  // Crear databases
  const docsId = await createDocsDatabase();
  const tasksId = await createTasksDatabase();
  const featuresId = await createFeaturesDatabase();

  if (docsId && tasksId && featuresId) {
    // Añadir contenido
    await addMainPageContent(docsId, tasksId, featuresId);

    console.log("\n✅ Todo listo!");
    console.log(`📄 Docs: https://notion.so/${docsId}`);
    console.log(`✅ Tasks: https://notion.so/${tasksId}`);
    console.log(`🚀 Features: https://notion.so/${featuresId}`);

    // Actualizar .env.local con los nuevos IDs
    console.log("\n📝 IDs de databases:");
    console.log(`NOTION_DATABASE_DOCS=${docsId}`);
    console.log(`NOTION_DATABASE_TASKS=${tasksId}`);
    console.log(`NOTION_DATABASE_FEATURES=${featuresId}`);
  } else {
    console.log("\n❌ Error al crear databases");
  }
}

main().catch(console.error);
