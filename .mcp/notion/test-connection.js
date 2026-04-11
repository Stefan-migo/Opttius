#!/usr/bin/env node

/**
 * Test connection to Notion API
 * Verifies that the API key is valid and has necessary permissions
 */

const { Client } = require("@notionhq/client");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables from .env file
const envPath = path.join(__dirname, ".env");
dotenv.config({ path: envPath });

async function testConnection() {
  console.log("🔍 Testing Notion API Connection");
  console.log("=".repeat(40));

  // Check API key
  const apiKey = process.env.NOTION_API_KEY;

  if (!apiKey) {
    console.error("❌ NOTION_API_KEY is not set");
    console.log("");
    console.log("Please add to .env.local in project root:");
    console.log("NOTION_API_KEY=secret_xxxx");
    console.log("");
    console.log("Then run: npm run sync-env");
    process.exit(1);
  }

  console.log(`✅ API key found (${apiKey.substring(0, 10)}...)`);

  // Initialize client
  const notion = new Client({ auth: apiKey });

  try {
    // Test API with a simple search
    console.log("📡 Testing API connection...");
    const response = await notion.search({
      query: "",
      page_size: 1,
    });

    console.log(`✅ Connection successful!`);
    console.log(
      `📊 Total pages in workspace: ${response.results.length} (sample)`,
    );

    // Check database IDs if set
    const databases = {
      docs: process.env.NOTION_DATABASE_DOCS,
      tasks: process.env.NOTION_DATABASE_TASKS,
      features: process.env.NOTION_DATABASE_FEATURES,
    };

    console.log("");
    console.log("📋 Database Configuration:");

    for (const [name, id] of Object.entries(databases)) {
      if (id && !id.includes("your_") && id !== "xxxxxx") {
        try {
          const db = await notion.databases.retrieve({ database_id: id });
          console.log(
            `✅ ${name}: ${db.title[0]?.plain_text || "Untitled"} (${id.substring(0, 8)}...)`,
          );
        } catch (error) {
          console.log(
            `❌ ${name}: Invalid database ID (${id.substring(0, 8)}...) - ${error.message}`,
          );
        }
      } else {
        console.log(`⚠️  ${name}: Not configured`);
      }
    }

    // List available integrations
    console.log("");
    console.log("🔧 Testing integration permissions...");

    const me = await notion.users.me({});
    console.log(`✅ Integration: ${me.name || "Unnamed Integration"}`);
    console.log(`   Type: ${me.type}`);
    console.log(`   Workspace: ${me.workspace_name || "Unknown"}`);

    if (me.bot) {
      console.log(`   Bot owner: ${me.bot.owner.type}`);
    }

    console.log("");
    console.log("🎉 All tests passed! Notion integration is ready.");
    console.log("");
    console.log("Next steps:");
    console.log("1. Share the integration with your Notion pages/databases");
    console.log("2. Run `node setup-claude.js` to configure Claude Desktop");
    console.log("3. Restart Claude Desktop and test the MCP tools");
  } catch (error) {
    console.error("❌ API connection failed:");
    console.error(`   Error: ${error.message}`);

    if (error.status === 401) {
      console.error("");
      console.error("🔑 Authentication failed. Possible issues:");
      console.error("   • API key is invalid or expired");
      console.error("   • Integration was deleted");
      console.error("   • Check https://www.notion.so/my-integrations");
    } else if (error.status === 403) {
      console.error("");
      console.error("🚫 Permission denied. Possible issues:");
      console.error("   • Integration not shared with workspace");
      console.error("   • Insufficient permissions");
      console.error("   • Workspace limits reached");
    } else if (error.status === 429) {
      console.error("");
      console.error("⏱️  Rate limited. Try again later.");
    } else {
      console.error("");
      console.error("🔧 General API error. Check network connection.");
    }

    process.exit(1);
  }
}

if (require.main === module) {
  testConnection().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

module.exports = { testConnection };
