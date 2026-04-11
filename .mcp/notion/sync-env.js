#!/usr/bin/env node

/**
 * Sync environment variables from project root to Notion MCP .env file
 */

const fs = require("fs");
const path = require("path");

const projectEnvPath = path.join(__dirname, "../../.env.local");
const notionEnvPath = path.join(__dirname, ".env");
const notionEnvExamplePath = path.join(__dirname, ".env.example");

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const env = {};

  for (const line of lines) {
    const trimmed = line.trim();
    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      env[key] = value;
    }
  }

  return env;
}

function writeEnvFile(filePath, env, example = false) {
  const lines = [];

  // Add header
  if (example) {
    lines.push("# Notion MCP Server Configuration");
    lines.push("# Copy this file to .env and fill in your actual values");
    lines.push("");
  } else {
    lines.push("# Notion MCP Server Environment");
    lines.push("# This file is auto-generated from project .env.local");
    lines.push("# Do not edit manually - changes will be overwritten");
    lines.push("");
  }

  // Add NOTION variables
  const notionVars = [
    "NOTION_API_KEY",
    "NOTION_DATABASE_DOCS",
    "NOTION_DATABASE_TASKS",
    "NOTION_DATABASE_FEATURES",
  ];

  for (const key of notionVars) {
    const value = env[key];
    if (value !== undefined) {
      if (example) {
        lines.push(`${key}=xxxxxx`);
      } else {
        lines.push(`${key}=${value}`);
      }
    } else {
      if (example) {
        lines.push(`${key}=xxxxxx`);
      } else {
        lines.push(`# ${key}= (not set in project .env.local)`);
      }
    }
  }

  // Add optional configuration
  lines.push("");
  lines.push("# ===== OPTIONAL CONFIGURATION =====");
  lines.push("# Logging level: debug, info, warn, error");
  lines.push("LOG_LEVEL=info");
  lines.push("");
  lines.push("# Server port (if running as HTTP server)");
  lines.push("PORT=3001");

  fs.writeFileSync(filePath, lines.join("\n"));
  console.log(`✅ Updated ${filePath}`);
}

function main() {
  console.log("🔧 Syncing Notion MCP environment variables...");

  // Read project .env.local
  const projectEnv = readEnvFile(projectEnvPath);
  console.log(
    `📁 Read ${Object.keys(projectEnv).length} variables from ${projectEnvPath}`,
  );

  // Check for required variables
  const requiredVars = ["NOTION_API_KEY"];
  const missingVars = requiredVars.filter(
    (key) => !projectEnv[key] || projectEnv[key].includes("your_"),
  );

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Missing or placeholder values for: ${missingVars.join(", ")}`,
    );
    console.warn(`   Please update ${projectEnvPath} with actual values`);
  }

  // Write .env file for Notion MCP
  writeEnvFile(notionEnvPath, projectEnv);

  // Ensure .env.example exists
  if (!fs.existsSync(notionEnvExamplePath)) {
    writeEnvFile(notionEnvExamplePath, {}, true);
  }

  console.log("✅ Done!");
}

if (require.main === module) {
  main();
}

module.exports = { readEnvFile, writeEnvFile };
