/**
 * Script para crear una nueva database de Tasks optimizada en Notion
 * y migrar las tareas existentes
 */

const https = require("https");

const NOTION_API_KEY =
  process.env.NOTION_API_KEY ||
  "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const PARENT_PAGE_ID = "33106293-43fc-801d-9af3-d4276041f38d"; // Página principal de Opttius

// Nueva estructura de database
const DATABASE_SCHEMA = {
  title: "Opttius Tasks",
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
};

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

// Obtener tareas existentes
async function getOldTasks() {
  const response = await notionRequest(
    "databases/33106293-43fc-8110-a810-d26d78113a30/query",
    "POST",
    JSON.stringify({ page_size: 100 }),
  );
  return response.results;
}

// Mapear status antiguo al nuevo
function mapStatus(oldStatus) {
  const map = {
    backlog: "Backlog",
    todo: "To Do",
    in_progress: "In Progress",
    review: "Review",
    done: "Done",
    blocked: "Blocked",
    cancelled: "Done",
  };
  return map[oldStatus] || "Backlog";
}

// Mapear priority
function mapPriority(priority) {
  if (!priority) return "P2 - Medium";
  const map = {
    "P0-critical": "P0 - Critical",
    "P1-high": "P1 - High",
    "P2-medium": "P2 - Medium",
    "P3-low": "P3 - Low",
  };
  return map[priority] || "P2 - Medium";
}

// Crear nueva database
async function createNewDatabase() {
  console.log("📋 Creando nueva database de Tasks...");

  const response = await notionRequest(
    "databases",
    "POST",
    JSON.stringify({
      parent: { page_id: PARENT_PAGE_ID },
      title: [{ text: { content: "Opttius Tasks" } }],
      properties: DATABASE_SCHEMA.properties,
      icon: { emoji: "✅" },
    }),
  );

  if (response.id) {
    console.log(`   ✅ Nueva database creada: ${response.id}`);
    return response.id;
  } else {
    console.log("   ❌ Error:", response.message);
    return null;
  }
}

// Migrar tareas
async function migrateTasks(oldTasks, newDbId) {
  console.log(`\n📦 Migrando ${oldTasks.length} tareas...`);

  let migrated = 0;
  for (const task of oldTasks) {
    const props = task.properties;

    const newProps = {
      parent: { database_id: newDbId },
      properties: {
        Task: {
          title: [
            {
              text: {
                content: props.Task?.title?.[0]?.plain_text || "Untitled",
              },
            },
          ],
        },
        Status: {
          select: { name: mapStatus(props.Status?.select?.name) },
        },
        Priority: {
          select: { name: mapPriority(props.Priority?.select?.name) },
        },
        Type: {
          select: { name: props.Type?.select?.name || "Task" },
        },
        Module: {
          select: { name: props.Module?.select?.name || "system" },
        },
        Labels: {
          multi_select: (props.Labels?.multi_select || []).map((l) => ({
            name: l.name,
          })),
        },
      },
    };

    // Due Date si existe
    if (props["Due Date"]?.date?.start) {
      newProps.properties["Due Date"] = {
        date: { start: props["Due Date"].date.start },
      };
    }

    // Assignee si existe
    if (props.Assignee?.people?.length > 0) {
      newProps.properties["Assignee"] = { people: props.Assignee.people };
    }

    try {
      await notionRequest("pages", "POST", JSON.stringify(newProps));
      migrated++;
      console.log(
        `   ✅ ${props.Task?.title?.[0]?.plain_text?.slice(0, 40)}...`,
      );
    } catch (e) {
      console.log(`   ❌ Error migrando: ${e.message?.slice(0, 50)}`);
    }

    // Rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  return migrated;
}

async function main() {
  console.log("🚀 Iniciando migración de Tasks...\n");

  // 1. Obtener tareas antiguas
  console.log("1. Obteniendo tareas existentes...");
  const oldTasks = await getOldTasks();
  console.log(`   Encontradas: ${oldTasks.length} tareas`);

  // 2. Crear nueva database
  const newDbId = await createNewDatabase();
  if (!newDbId) {
    console.log("❌ No se pudo crear la nueva database");
    return;
  }

  // 3. Migrar tareas
  const migrated = await migrateTasks(oldTasks, newDbId);

  console.log(`\n✅ Migración completada:`);
  console.log(`   - Nueva database: ${newDbId}`);
  console.log(`   - Tareas migradas: ${migrated}`);
  console.log(`\n🔗 URL: https://www.notion.so/${newDbId.replace(/-/g, "")}`);
}

main().catch(console.error);
