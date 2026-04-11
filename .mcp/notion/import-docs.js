#!/usr/bin/env node

/**
 * Import documentation from local docs/ folder to Notion Docs database
 */

const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config({ path: __dirname + "/.env" });

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DOCS_DB_ID = process.env.NOTION_DATABASE_DOCS;

// Colors
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(msg, color = "reset") {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// Map folders to categories
const categoryMap = {
  "01-getting-started": "getting-started",
  "02-architecture": "architecture",
  "03-modules": "modules",
  "04-integration": "integration",
  "05-devops": "devops",
  "06-design": "design",
  "07-testing": "testing",
  "08-user-guide": "user-guide",
  "09-marketing": "marketing",
  archive: "archived",
};

// Map module subfolders
const moduleMap = {
  crm: "crm",
  appointments: "appointments",
  quotes: "quotes",
  pos: "pos",
  inventory: "inventory",
  "work-orders": "work-orders",
  payments: "payments",
  ai: "ai",
  whatsapp: "whatsapp",
  agreements: "agreements",
  support: "support",
  analytics: "analytics",
  admin: "admin",
  saas: "system",
  "user-profile": "system",
  emails: "system",
  "field-operations": "system",
};

function getCategoryAndModule(filePath) {
  const parts = filePath.split(/[/\\]/);

  let category = "modules";
  let module = null;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    // Check for category folder
    if (categoryMap[part]) {
      category = categoryMap[part];
    }

    // Check for module subfolder
    if (moduleMap[part]) {
      module = moduleMap[part];
    }
  }

  return { category, module };
}

function getTitleFromPath(filePath) {
  const basename = path.basename(filePath, ".md");
  // Remove numbers and dashes from title
  return basename.replace(/^\d+-/, "").replace(/_/g, " ").replace(/-/g, " ");
}

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return { metadata: {}, content };

  const frontmatter = match[1];
  const metadata = {};

  frontmatter.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split(":");
    if (key && valueParts.length) {
      metadata[key.trim()] = valueParts.join(":").trim();
    }
  });

  return {
    metadata,
    content: content.slice(match[0].length).trim(),
  };
}

function getWordCount(content) {
  return content.split(/\s+/).filter((w) => w.length > 0).length;
}

async function importDocument(filePath) {
  const { category, module } = getCategoryAndModule(filePath);
  const title = getTitleFromPath(filePath);
  const content = fs.readFileSync(filePath, "utf8");
  const { metadata } = extractFrontmatter(content);

  // Determine status from frontmatter or default to draft
  let status = "draft";
  if (metadata.status === "published" || metadata.status === "active") {
    status = "published";
  } else if (metadata.status === "deprecated") {
    status = "deprecated";
  }

  // Determine priority
  let priority = "medium";
  if (category === "getting-started" || category === "architecture") {
    priority = "high";
  }

  const properties = {
    Name: { title: [{ text: { content: title } }] },
    Category: { select: { name: category } },
    Status: { select: { name: status } },
    Priority: { select: { name: priority } },
    "Repo Path": { rich_text: [{ text: { content: filePath } }] },
    "Notion URL": {
      url:
        "https://github.com/opttius/opttius/blob/main/docs/" +
        path.basename(filePath),
    },
    "Last Updated": { date: { start: new Date().toISOString().split("T")[0] } },
    "Word Count": { number: getWordCount(content) },
  };

  if (module) {
    properties["Module"] = { select: { name: module } };
  }

  try {
    const page = await notion.pages.create({
      parent: { database_id: DOCS_DB_ID },
      properties: properties,
    });

    log(
      `✅ Imported: ${title} (${category}${module ? "/" + module : ""})`,
      "green",
    );
    return page;
  } catch (error) {
    log(`❌ Failed: ${title} - ${error.message}`, "red");
    throw error;
  }
}

async function main() {
  log("\n📚 Importing documentation to Notion...\n", "cyan");

  if (!DOCS_DB_ID) {
    log("❌ NOTION_DATABASE_DOCS not set", "red");
    process.exit(1);
  }

  const docsPath = path.join(__dirname, "..", "..", "docs");

  // Get all md files, excluding archive
  const files = [];

  function walkDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip archive unless explicitly included
        if (entry.name === "archive" || entry.name === "node_modules") {
          continue;
        }
        walkDir(fullPath);
      } else if (entry.name.endsWith(".md")) {
        // Skip index files at root level
        if (dir === docsPath && entry.name === "README.md") {
          continue;
        }
        files.push(fullPath);
      }
    }
  }

  walkDir(docsPath);

  log(`Found ${files.length} documents to import\n`, "blue");

  let imported = 0;
  let failed = 0;

  for (const file of files) {
    try {
      await importDocument(file);
      imported++;
    } catch (error) {
      failed++;
    }
  }

  log("\n" + "=".repeat(50), "cyan");
  log(`✅ Import complete!`, "green");
  log(`   Imported: ${imported}`, "blue");
  if (failed > 0) {
    log(`   Failed: ${failed}`, "red");
  }
  log("=".repeat(50) + "\n", "cyan");
}

main().catch((error) => {
  log(`\n❌ Error: ${error.message}\n`, "red");
  process.exit(1);
});
