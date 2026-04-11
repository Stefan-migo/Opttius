#!/usr/bin/env node

/**
 * Setup script for Claude Desktop configuration
 * Helps users configure Claude Desktop to use the local Notion MCP server
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const readline = require("readline");

// Determine platform-specific config path
function getClaudeConfigPath() {
  const platform = os.platform();

  if (platform === "darwin") {
    // macOS
    return path.join(
      os.homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json",
    );
  } else if (platform === "win32") {
    // Windows
    return path.join(
      process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming"),
      "Claude",
      "claude_desktop_config.json",
    );
  } else {
    // Linux and others
    return path.join(
      os.homedir(),
      ".config",
      "Claude",
      "claude_desktop_config.json",
    );
  }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(filePath, "utf8");
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return {};
  }
}

function writeJsonFile(filePath, data) {
  const dir = path.dirname(filePath);

  // Create directory if it doesn't exist
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const content = JSON.stringify(data, null, 2);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`✅ Configuration written to: ${filePath}`);
}

function createConfig() {
  const projectRoot = path.resolve(__dirname, "../..");
  const notionServerPath = path.join(
    projectRoot,
    ".mcp",
    "notion",
    "start-server.js",
  );

  // Read project .env.local to get variable names
  const envPath = path.join(projectRoot, ".env.local");
  let envVars = {};

  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, "utf8");
    const lines = content.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(/^([^=]+)=/);
        if (match) {
          envVars[match[1]] = `\${${match[1]}}`;
        }
      }
    }
  }

  const config = {
    mcpServers: {
      "opttius-notion": {
        command: "node",
        args: [notionServerPath],
        env: {
          NODE_ENV: "development",
          NOTION_API_KEY: envVars.NOTION_API_KEY || "${NOTION_API_KEY}",
          NOTION_DATABASE_DOCS:
            envVars.NOTION_DATABASE_DOCS || "${NOTION_DATABASE_DOCS}",
          NOTION_DATABASE_TASKS:
            envVars.NOTION_DATABASE_TASKS || "${NOTION_DATABASE_TASKS}",
          NOTION_DATABASE_FEATURES:
            envVars.NOTION_DATABASE_FEATURES || "${NOTION_DATABASE_FEATURES}",
        },
      },
    },
  };

  return config;
}

async function main() {
  console.log("🔧 Claude Desktop MCP Configuration Setup");
  console.log("=".repeat(50));

  const configPath = getClaudeConfigPath();
  console.log(`📁 Claude config location: ${configPath}`);

  // Check if config exists
  const existingConfig = readJsonFile(configPath);
  const hasExistingMCP =
    existingConfig.mcpServers &&
    Object.keys(existingConfig.mcpServers).length > 0;

  if (hasExistingMCP) {
    console.log("⚠️  Existing MCP configuration found:");
    console.log(
      `   Servers: ${Object.keys(existingConfig.mcpServers).join(", ")}`,
    );

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise((resolve) => {
      rl.question(
        "Do you want to (O)verwrite, (M)erge, or (S)kip? [O/m/s]: ",
        resolve,
      );
    });

    rl.close();

    if (answer.toLowerCase() === "s") {
      console.log("⏭️  Skipping configuration");
      return;
    }

    const newConfig = createConfig();

    if (answer.toLowerCase() === "m" || answer === "") {
      // Merge configurations
      console.log("🔄 Merging configurations...");
      const mergedConfig = {
        ...existingConfig,
        mcpServers: {
          ...existingConfig.mcpServers,
          ...newConfig.mcpServers,
        },
      };
      writeJsonFile(configPath, mergedConfig);
    } else {
      // Overwrite
      console.log("✏️  Overwriting configuration...");
      writeJsonFile(configPath, { ...existingConfig, ...newConfig });
    }
  } else {
    // Create new config
    console.log("📝 Creating new configuration...");
    const newConfig = createConfig();
    const finalConfig = { ...existingConfig, ...newConfig };
    writeJsonFile(configPath, finalConfig);
  }

  console.log("");
  console.log("🎉 Configuration complete!");
  console.log("");
  console.log("Next steps:");
  console.log(
    "1. Make sure you have set NOTION_API_KEY and other variables in .env.local",
  );
  console.log("2. Restart Claude Desktop for changes to take effect");
  console.log(
    '3. In Claude Desktop, check "Server Settings" to verify connection',
  );
  console.log("");
  console.log("For troubleshooting, run:");
  console.log("  cd .mcp/notion && npm run dev");
  console.log("This will start the server in debug mode");
}

if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

module.exports = { getClaudeConfigPath, createConfig };
