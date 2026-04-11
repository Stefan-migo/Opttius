#!/usr/bin/env node

/**
 * Create Notion Databases for Opttius Project
 * Creates: Docs, Tasks, Features databases with proper schema
 */

const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const readline = require("readline");

// Load environment variables
const envPath = path.join(__dirname, ".env");
dotenv.config({ path: envPath });

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n${step}. ${message}`, "blue");
}

function logSuccess(message) {
  log(`✅ ${message}`, "green");
}

function logError(message) {
  log(`❌ ${message}`, "red");
}

function logInfo(message) {
  log(`ℹ️  ${message}`, "blue");
}

function askForPageId() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log("\n📝 Please provide a Notion page ID to use as parent:");
    console.log("   1. Go to Notion and create a page (or use existing)");
    console.log("   2. Click 'Share' and add 'Opttius' integration");
    console.log("   3. Copy the page URL and extract the ID");
    console.log("      (e.g., notion.so/My-Workspace-1234567890abcdef)");
    console.log("   4. Enter the 32-character ID below:\n");

    rl.question("Page ID: ", (answer) => {
      rl.close();
      const pageId = answer.trim().replace(/-/g, "");
      if (pageId.length !== 32) {
        logError("Invalid page ID. It should be 32 characters.");
        process.exit(1);
      }
      resolve(pageId);
    });
  });
}

// Database schemas based on NOTION_DATABASES.md
const databases = {
  docs: {
    name: "Opttius Docs",
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
            { name: "agreements", color: "brown" },
            { name: "support", color: "blue" },
            { name: "analytics", color: "green" },
            { name: "system", color: "purple" },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: "draft", color: "gray" },
            { name: "in_review", color: "yellow" },
            { name: "published", color: "green" },
            { name: "deprecated", color: "red" },
            { name: "archived", color: "brown" },
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
      Owner: { people: {} },
      Reviewer: { people: {} },
      "Last Updated": { date: {} },
      "Next Review": { date: {} },
      "Notion ID": { rich_text: {} },
      "Repo Path": { rich_text: {} },
      "Notion URL": { url: {} },
      "GitHub URL": { url: {} },
      Tags: {
        multi_select: {
          options: [
            { name: "technical", color: "blue" },
            { name: "user-guide", color: "green" },
            { name: "api", color: "purple" },
            { name: "database", color: "yellow" },
            { name: "security", color: "red" },
            { name: "devops", color: "orange" },
            { name: "design", color: "pink" },
          ],
        },
      },
      "Word Count": { number: {} },
    },
  },

  tasks: {
    name: "Opttius Tasks",
    properties: {
      Task: { title: {} },
      Status: {
        select: {
          options: [
            { name: "backlog", color: "gray" },
            { name: "todo", color: "blue" },
            { name: "in_progress", color: "yellow" },
            { name: "review", color: "purple" },
            { name: "done", color: "green" },
            { name: "blocked", color: "red" },
            { name: "cancelled", color: "brown" },
          ],
        },
      },
      Type: {
        select: {
          options: [
            { name: "task", color: "blue" },
            { name: "bug", color: "red" },
            { name: "feature", color: "green" },
            { name: "improvement", color: "purple" },
            { name: "documentation", color: "blue" },
            { name: "refactor", color: "orange" },
            { name: "maintenance", color: "gray" },
          ],
        },
      },
      Priority: {
        select: {
          options: [
            { name: "P0-critical", color: "red" },
            { name: "P1-high", color: "orange" },
            { name: "P2-medium", color: "yellow" },
            { name: "P3-low", color: "gray" },
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
            { name: "agreements", color: "brown" },
            { name: "support", color: "blue" },
            { name: "analytics", color: "green" },
            { name: "system", color: "purple" },
            { name: "devops", color: "orange" },
            { name: "design", color: "pink" },
          ],
        },
      },
      Sprint: {
        select: {
          options: [
            { name: "Sprint 1", color: "blue" },
            { name: "Sprint 2", color: "green" },
            { name: "Sprint 3", color: "purple" },
            { name: "Sprint 4", color: "yellow" },
            { name: "Sprint 5", color: "orange" },
          ],
        },
      },
      Assignee: { people: {} },
      Reporter: { people: {} },
      Estimate: { number: {} },
      "Time Spent": { number: {} },
      "Due Date": { date: {} },
      "Start Date": { date: {} },
      "Done Date": { date: {} },
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
      "GitHub Issue": { url: {} },
      "PR Link": { url: {} },
    },
  },

  features: {
    name: "Opttius Features",
    properties: {
      Feature: { title: {} },
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
            { name: "agreements", color: "brown" },
            { name: "support", color: "blue" },
            { name: "analytics", color: "green" },
            { name: "system", color: "purple" },
            { name: "devops", color: "orange" },
            { name: "design", color: "pink" },
          ],
        },
      },
      Status: {
        select: {
          options: [
            { name: "idea", color: "gray" },
            { name: "planned", color: "blue" },
            { name: "in_progress", color: "yellow" },
            { name: "testing", color: "purple" },
            { name: "done", color: "green" },
            { name: "released", color: "blue" },
            { name: "postponed", color: "orange" },
            { name: "cancelled", color: "red" },
          ],
        },
      },
      Priority: {
        select: {
          options: [
            { name: "P0-must-have", color: "red" },
            { name: "P1-should-have", color: "orange" },
            { name: "P2-nice-to-have", color: "yellow" },
            { name: "P3-future", color: "gray" },
          ],
        },
      },
      Complexity: {
        select: {
          options: [
            { name: "small (1-3 days)", color: "green" },
            { name: "medium (1-2 weeks)", color: "yellow" },
            { name: "large (2-4 weeks)", color: "orange" },
            { name: "xlarge (1+ month)", color: "red" },
          ],
        },
      },
      Release: {
        select: {
          options: [
            { name: "v1.0", color: "blue" },
            { name: "v1.1", color: "green" },
            { name: "v1.2", color: "purple" },
            { name: "v2.0", color: "yellow" },
            { name: "v2.1", color: "orange" },
          ],
        },
      },
      "Product Owner": { people: {} },
      "Tech Lead": { people: {} },
      "Start Date": { date: {} },
      "Target Date": { date: {} },
      "Actual Date": { date: {} },
      "User Story": { rich_text: {} },
      "Acceptance Criteria": { rich_text: {} },
      Impact: {
        select: {
          options: [
            { name: "high", color: "red" },
            { name: "medium", color: "yellow" },
            { name: "low", color: "green" },
          ],
        },
      },
      Risk: {
        select: {
          options: [
            { name: "high", color: "red" },
            { name: "medium", color: "yellow" },
            { name: "low", color: "green" },
          ],
        },
      },
      "GitHub Milestone": { url: {} },
    },
  },
};

async function getParentPageId() {
  // Check if page ID was provided via environment variable
  const envPageId = process.env.NOTION_PARENT_PAGE_ID;
  if (envPageId && envPageId.length === 32) {
    logSuccess(`Using parent page from NOTION_PARENT_PAGE_ID: ${envPageId}`);
    return envPageId;
  }

  logStep("1", "Looking for existing page in Notion...");

  try {
    // Search for any existing page in the workspace
    const search = await notion.search({
      filter: { property: "object", value: "page" },
      page_size: 10,
    });

    if (search.results.length > 0) {
      const page = search.results[0];
      logSuccess(`Using existing page as parent: ${page.id}`);
      logInfo(
        `Page title: ${page.properties?.title?.title?.[0]?.plain_text || "Untitled"}`,
      );
      return page.id;
    }
  } catch (error) {
    logError(`Search failed: ${error.message}`);
  }

  // No pages found - ask user for page ID
  return await askForPageId();
}

async function createDatabase(name, schema, parentPageId) {
  // Create database as child of the parent page
  const parent = { page_id: parentPageId };

  try {
    const database = await notion.databases.create({
      parent: parent,
      title: [{ type: "text", text: { content: name } }],
      properties: schema.properties,
    });

    logSuccess(`Created: ${name}`);
    return database;
  } catch (error) {
    logError(`Failed to create ${name}: ${error.message}`);
    throw error;
  }
}

function updateEnvFile(docsId, tasksId, featuresId) {
  const envPath = path.join(__dirname, ".env");
  const envExamplePath = path.join(__dirname, ".env.example");
  const rootEnvPath = path.join(__dirname, "..", "..", ".env.local");

  let envContent = "";

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, "utf8");
  }

  // Update or add database IDs
  const updates = {
    NOTION_DATABASE_DOCS: docsId,
    NOTION_DATABASE_TASKS: tasksId,
    NOTION_DATABASE_FEATURES: featuresId,
  };

  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }

  fs.writeFileSync(envPath, envContent);
  logSuccess("Updated .env file with database IDs");

  // Also update root .env.local
  if (fs.existsSync(rootEnvPath)) {
    let rootContent = fs.readFileSync(rootEnvPath, "utf8");

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^#?${key}=.*$`, "m");
      if (regex.test(rootContent)) {
        rootContent = rootContent.replace(regex, `${key}=${value}`);
      } else {
        rootContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(rootEnvPath, rootContent);
    logSuccess("Updated .env.local with database IDs");
  }
}

async function main() {
  log("\n" + "=".repeat(50), "bright");
  log("🚀 Creating Notion Databases for Opttius", "bright");
  log("=".repeat(50) + "\n", "bright");

  // Check API key
  if (!process.env.NOTION_API_KEY) {
    logError("NOTION_API_KEY is not set");
    logInfo("Please add to .env.local and run: npm run sync-env");
    process.exit(1);
  }

  logSuccess("Connected to Notion API");

  // Get existing page to use as parent
  const parentPageId = await getParentPageId();

  // Create databases
  const results = {};

  logStep("2", "Creating Opttius Docs database...");
  results.docs = await createDatabase(
    databases.docs.name,
    databases.docs,
    parentPageId,
  );

  logStep("3", "Creating Opttius Tasks database...");
  results.tasks = await createDatabase(
    databases.tasks.name,
    databases.tasks,
    parentPageId,
  );

  logStep("4", "Creating Opttius Features database...");
  results.features = await createDatabase(
    databases.features.name,
    databases.features,
    parentPageId,
  );

  // Update environment files
  logStep("5", "Saving database IDs...");
  updateEnvFile(results.docs.id, results.tasks.id, results.features.id);

  // Summary
  log("\n" + "=".repeat(50), "bright");
  log("✅ Databases Created Successfully!", "green");
  log("=".repeat(50), "bright");

  log("\n📋 Database IDs:", "blue");
  log(`   Docs:     ${results.docs.id}`, "blue");
  log(`   Tasks:    ${results.tasks.id}`, "blue");
  log(`   Features: ${results.features.id}`, "blue");

  log("\n🔗 Quick Links:", "blue");
  log(
    `   Docs:     https://notion.so/${results.docs.id.replace(/-/g, "")}`,
    "blue",
  );
  log(
    `   Tasks:    https://notion.so/${results.tasks.id.replace(/-/g, "")}`,
    "blue",
  );
  log(
    `   Features: https://notion.so/${results.features.id.replace(/-/g, "")}`,
    "blue",
  );

  log("\n⚠️  IMPORTANT:", "yellow");
  log("   1. Open each database in Notion and click 'Share'");
  log("   2. Add 'Opttius' integration to each database");
  log("   3. Run 'npm run sync-env' to sync with MCP server");

  log("\n✨ Done!\n", "green");
}

main().catch((error) => {
  logError(`Script failed: ${error.message}`);
  process.exit(1);
});
