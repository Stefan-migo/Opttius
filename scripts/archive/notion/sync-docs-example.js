#!/usr/bin/env node
/**
 * Example script for syncing documentation to Notion
 *
 * Usage:
 * node scripts/notion/sync-docs-example.js --database DOCS_DATABASE_ID --dry-run
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option("database", {
    alias: "d",
    type: "string",
    description: "Notion database ID",
    required: true,
  })
  .option("source", {
    alias: "s",
    type: "string",
    default: "docs",
    description: "Source directory",
  })
  .option("dry-run", {
    type: "boolean",
    default: false,
    description: "Dry run - don't actually create/update pages",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    default: false,
    description: "Verbose output",
  })
  .help().argv;

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY || argv.notionApiKey,
});

/**
 * Parse frontmatter from markdown file
 */
function parseFrontmatter(content) {
  const frontmatter = {};
  const lines = content.split("\n");

  if (lines[0] === "---") {
    let i = 1;
    while (i < lines.length && lines[i] !== "---") {
      const line = lines[i];
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        frontmatter[key.trim()] = value.trim().replace(/^['"](.*)['"]$/, "$1");
      }
      i++;
    }
  }

  return frontmatter;
}

/**
 * Extract title from markdown content
 */
function extractTitle(content) {
  // Look for # Title in markdown
  const match = content.match(/^#\s+(.+)$/m);
  if (match) {
    return match[1].trim();
  }

  // Fallback to first line
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.trim() && !line.startsWith("---")) {
      return line.trim().replace(/^#+\s+/, "");
    }
  }

  return "Untitled Document";
}

/**
 * Get category from file path
 */
function getCategoryFromPath(filePath) {
  const parts = filePath.split(path.sep);

  // Check for our new structure: docs/01-getting-started/, etc.
  for (const part of parts) {
    if (part.startsWith("01-")) return "getting-started";
    if (part.startsWith("02-")) return "architecture";
    if (part.startsWith("03-")) return "modules";
    if (part.startsWith("04-")) return "integration";
    if (part.startsWith("05-")) return "devops";
    if (part.startsWith("06-")) return "design";
    if (part.startsWith("07-")) return "testing";
    if (part.startsWith("08-")) return "user-guide";
    if (part.startsWith("09-")) return "marketing";
  }

  // Fallback based on directory
  const dir = path.dirname(filePath).split(path.sep).pop();
  return dir || "uncategorized";
}

/**
 * Get module from file path
 */
function getModuleFromPath(filePath) {
  const parts = filePath.split(path.sep);

  // Look for module directories
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "03-modules" && i + 1 < parts.length) {
      return parts[i + 1];
    }
  }

  return null;
}

/**
 * Convert markdown to Notion blocks
 */
function markdownToBlocks(markdown) {
  const blocks = [];
  const lines = markdown.split("\n");

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip frontmatter
    if (i === 0 && line === "---") {
      while (i < lines.length && lines[i] !== "---") {
        i++;
      }
      i++;
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      blocks.push({
        type: "heading_1",
        heading_1: {
          rich_text: [
            { type: "text", text: { content: line.replace(/^#\s+/, "") } },
          ],
        },
      });
    } else if (line.startsWith("## ")) {
      blocks.push({
        type: "heading_2",
        heading_2: {
          rich_text: [
            { type: "text", text: { content: line.replace(/^##\s+/, "") } },
          ],
        },
      });
    } else if (line.startsWith("### ")) {
      blocks.push({
        type: "heading_3",
        heading_3: {
          rich_text: [
            { type: "text", text: { content: line.replace(/^###\s+/, "") } },
          ],
        },
      });
    }
    // Paragraphs
    else if (line.trim()) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: line } }],
        },
      });
    }
    // Code blocks
    else if (line.startsWith("```")) {
      const language = line.replace(/^```/, "").trim();
      let codeContent = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeContent.push(lines[i]);
        i++;
      }

      blocks.push({
        type: "code",
        code: {
          rich_text: [
            { type: "text", text: { content: codeContent.join("\n") } },
          ],
          language: language || "plain text",
        },
      });
    }

    i++;
  }

  return blocks;
}

/**
 * Sync a single markdown file to Notion
 */
async function syncFileToNotion(filePath, databaseId, dryRun = false) {
  const content = fs.readFileSync(filePath, "utf8");
  const frontmatter = parseFrontmatter(content);
  const title = frontmatter.title || extractTitle(content);
  const category = frontmatter.category || getCategoryFromPath(filePath);
  const module = frontmatter.module || getModuleFromPath(filePath);

  if (argv.verbose) {
    console.log(`Processing: ${filePath}`);
    console.log(`  Title: ${title}`);
    console.log(`  Category: ${category}`);
    console.log(`  Module: ${module}`);
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would sync: ${title} (${filePath})`);
    return null;
  }

  try {
    // Check if page already exists
    const searchResponse = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "Repo Path",
        rich_text: {
          equals: filePath,
        },
      },
    });

    const properties = {
      Title: {
        title: [{ type: "text", text: { content: title } }],
      },
      Category: {
        select: { name: category },
      },
      Status: {
        select: { name: frontmatter.status || "draft" },
      },
      Priority: {
        select: { name: frontmatter.priority || "medium" },
      },
      "Repo Path": {
        rich_text: [{ type: "text", text: { content: filePath } }],
      },
      "Last Updated": {
        date: { start: new Date().toISOString() },
      },
    };

    if (module) {
      properties.Module = {
        select: { name: module },
      };
    }

    if (searchResponse.results.length > 0) {
      // Update existing page
      const pageId = searchResponse.results[0].id;
      console.log(`Updating existing page: ${title} (${pageId})`);

      await notion.pages.update({
        page_id: pageId,
        properties,
      });

      // Clear existing content and add new content
      const blocks = markdownToBlocks(content);
      if (blocks.length > 0) {
        await notion.blocks.children.append({
          block_id: pageId,
          children: blocks,
        });
      }

      return { action: "updated", pageId };
    } else {
      // Create new page
      console.log(`Creating new page: ${title}`);

      const newPage = await notion.pages.create({
        parent: { database_id: databaseId },
        properties,
        children: markdownToBlocks(content),
      });

      return { action: "created", pageId: newPage.id };
    }
  } catch (error) {
    console.error(`Error syncing ${filePath}:`, error.message);
    return { action: "error", error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log("📚 Opttius Docs Sync to Notion");
  console.log("===============================\n");

  if (!process.env.NOTION_API_KEY && !argv.notionApiKey) {
    console.error(
      "Error: NOTION_API_KEY environment variable or --notionApiKey is required",
    );
    process.exit(1);
  }

  if (!argv.database) {
    console.error("Error: Database ID is required (--database)");
    process.exit(1);
  }

  console.log(`Source: ${argv.source}`);
  console.log(`Database: ${argv.database}`);
  console.log(`Dry run: ${argv.dryRun ? "Yes" : "No"}`);
  console.log("");

  // Find all markdown files
  const mdFiles = [];
  function findMarkdownFiles(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        entry.name !== "node_modules" &&
        entry.name !== ".git"
      ) {
        findMarkdownFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        mdFiles.push(fullPath);
      }
    }
  }

  findMarkdownFiles(argv.source);

  console.log(`Found ${mdFiles.length} markdown files\n`);

  // Process files
  const results = {
    created: 0,
    updated: 0,
    errors: 0,
  };

  for (const file of mdFiles) {
    const result = await syncFileToNotion(file, argv.database, argv.dryRun);

    if (result) {
      if (result.action === "created") results.created++;
      if (result.action === "updated") results.updated++;
      if (result.action === "error") results.errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log("\n📊 Sync Summary");
  console.log("===============");
  console.log(`Total files: ${mdFiles.length}`);
  console.log(`Created: ${results.created}`);
  console.log(`Updated: ${results.updated}`);
  console.log(`Errors: ${results.errors}`);

  if (argv.dryRun) {
    console.log("\n⚠️  This was a dry run. No changes were made to Notion.");
  }
}

// Run main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
