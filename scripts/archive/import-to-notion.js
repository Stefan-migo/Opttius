/**
 * Script para importar documentos Markdown a Notion
 * Uso: node scripts/import-to-notion.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const NOTION_API_KEY =
  process.env.NOTION_API_KEY ||
  "ntn_N165381836479d6rgph8qix715k0rIcOuaARXOQ3Drf616";
const DATABASE_ID = "33206293-43fc-812d-91c4-f3f5ca58bbc5";

// Mapeo de carpetas a propiedades de Notion
const MODULE_MAP = {
  ai: "ai",
  appointments: "appointments",
  quotes: "quotes",
  pos: "pos",
  inventory: "inventory",
  "work-orders": "work-orders",
  payments: "payments",
  whatsapp: "whatsapp",
  agreements: "agreements",
  support: "support",
  analytics: "analytics",
  admin: "admin",
  emails: "system",
  notifications: "system",
  "user-profile": "system",
  saas: "system",
  "field-operations": "system",
  crm: "crm",
};

const CATEGORY_MAP = {
  "03-modules": "modules",
  "02-architecture": "architecture",
  "01-getting-started": "getting-started",
  "04-integration": "integration",
  "05-devops": "devops",
  "06-design": "design",
  "07-testing": "testing",
  "08-user-guide": "user-guide",
  "09-marketing": "marketing",
};

// Función para hacer requests a Notion API
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

// Obtener documentos ya importados
async function getImportedDocs() {
  const results = [];
  let hasMore = true;
  let cursor = null;

  while (hasMore) {
    const body = cursor
      ? { page_size: 100, start_cursor: cursor }
      : { page_size: 100 };

    const response = await notionRequest(
      `databases/${DATABASE_ID}/query`,
      "POST",
      JSON.stringify(body),
    );

    for (const page of response.results) {
      const repoPath = page.properties?.RepoPath?.rich_text?.[0]?.plain_text;
      if (repoPath) {
        results.push(repoPath);
      }
    }

    hasMore = response.has_more;
    cursor = response.next_cursor;
  }

  return results;
}

// Leer archivo markdown
function readMarkdownFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    // Limitar a primeros 2000 caracteres para el bloque de contenido
    return content.slice(0, 2000);
  } catch (e) {
    console.error(`Error leyendo ${filePath}:`, e.message);
    return null;
  }
}

// Obtener propiedades del documento
function getDocProperties(filePath) {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const parts = normalizedPath.split("/");

  // docs/03-modules/ai/README.md -> ['docs', '03-modules', 'ai', 'README.md']
  const category = parts[1] || "";
  const module = parts[2] || "";
  const fileName = parts[parts.length - 1];

  return {
    category: CATEGORY_MAP[category] || "modules",
    module: MODULE_MAP[module] || null,
    name: fileName.replace(".md", "").replace(/_/g, " "),
  };
}

// Crear página en Notion
async function createNotionPage(filePath, content) {
  const props = getDocProperties(filePath);

  const properties = {
    Name: {
      title: [{ text: { content: props.name } }],
    },
    Category: {
      select: { name: props.category },
    },
    Status: {
      select: { name: "draft" },
    },
    Priority: {
      select: { name: "medium" },
    },
  };

  const response = await notionRequest(
    "pages",
    "POST",
    JSON.stringify({
      parent: { database_id: DATABASE_ID },
      properties: properties,
    }),
  );

  return response;
}

// Función principal
async function main() {
  console.log("🔍 Obteniendo documentos ya importados...");
  const imported = await getImportedDocs();
  console.log(`   ${imported.length} documentos ya importados`);

  // Buscar archivos markdown en docs/
  const docsDir = path.join(__dirname, "..", "docs");
  const files = [];

  function scanDir(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory() && !item.startsWith(".")) {
        scanDir(fullPath);
      } else if (item.endsWith(".md")) {
        files.push(fullPath);
      }
    }
  }

  scanDir(docsDir);

  // Filtrar documentos faltantes
  const toImport = files.filter((f) => !imported.includes(f));

  console.log(`\n📄 Documentos encontrados: ${files.length}`);
  console.log(`➕ Documentos por importar: ${toImport.length}`);
  console.log(`   (Ya importados: ${imported.length})`);

  // Importar documentos
  let newImported = 0;
  let failed = 0;

  for (const filePath of toImport) {
    const content = readMarkdownFile(filePath);
    if (!content) {
      failed++;
      continue;
    }

    try {
      const result = await createNotionPage(filePath, content);
      if (result.id) {
        newImported++;
        const props = getDocProperties(filePath);
        console.log(`   ✅ ${props.name} (${props.category})`);
      } else {
        failed++;
        console.log(`   ❌ Error: ${filePath}`);
      }
    } catch (e) {
      failed++;
      console.log(`   ❌ ${filePath}: ${e.message.slice(0, 50)}`);
    }

    // Rate limiting - esperar entre requests
    await new Promise((r) => setTimeout(r, 500));
  }

  console.log(`\n✅ Importación completada: ${newImported} documentos`);
  console.log(`❌ Fallidos: ${failed}`);
}

main().catch(console.error);
