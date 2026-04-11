#!/usr/bin/env node

/**
 * Notion MCP Server for Opttius
 *
 * Local MCP server for Notion integration with Claude Desktop.
 * This server provides tools to interact with Notion databases and pages.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const {
  StdioServerTransport,
} = require("@modelcontextprotocol/sdk/server/stdio.js");
const {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");

const { Client } = require("@notionhq/client");
const yargs = require("yargs");
const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config({ path: __dirname + "/.env" });

// Parse command line arguments
const argv = yargs(process.argv.slice(2))
  .option("test", {
    alias: "t",
    type: "boolean",
    description: "Run in test mode",
    default: false,
  })
  .option("debug", {
    alias: "d",
    type: "boolean",
    description: "Run in debug mode",
    default: false,
  })
  .help().argv;

class NotionMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "opttius-notion-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {
            search_pages: {
              description:
                "Search pages in Notion with optional query and filter",
              inputSchema: {
                type: "object",
                properties: {
                  query: {
                    type: "string",
                    description: "Search query (optional)",
                  },
                  filter: {
                    type: "object",
                    description: "Filter object (optional)",
                  },
                  sort: {
                    type: "object",
                    description: "Sort object (optional)",
                  },
                  page_size: {
                    type: "number",
                    description: "Number of results per page (default: 20)",
                  },
                },
              },
            },
            get_page: {
              description:
                "Get a page by ID with all its content and properties",
              inputSchema: {
                type: "object",
                properties: {
                  page_id: {
                    type: "string",
                    description: "Notion page ID",
                  },
                },
                required: ["page_id"],
              },
            },
            create_page: {
              description: "Create a new page in Notion",
              inputSchema: {
                type: "object",
                properties: {
                  parent: {
                    type: "object",
                    description:
                      "Parent object (either database_id or page_id)",
                    properties: {
                      database_id: { type: "string" },
                      page_id: { type: "string" },
                    },
                  },
                  properties: {
                    type: "object",
                    description: "Page properties",
                  },
                  children: {
                    type: "array",
                    description: "Page content blocks (optional)",
                  },
                  icon: {
                    type: "object",
                    description: "Page icon (optional)",
                  },
                  cover: {
                    type: "object",
                    description: "Page cover (optional)",
                  },
                },
                required: ["parent", "properties"],
              },
            },
            update_page: {
              description: "Update an existing page",
              inputSchema: {
                type: "object",
                properties: {
                  page_id: {
                    type: "string",
                    description: "Notion page ID",
                  },
                  properties: {
                    type: "object",
                    description: "Updated properties (optional)",
                  },
                  archived: {
                    type: "boolean",
                    description: "Archive the page (optional)",
                  },
                  icon: {
                    type: "object",
                    description: "Updated icon (optional)",
                  },
                  cover: {
                    type: "object",
                    description: "Updated cover (optional)",
                  },
                },
                required: ["page_id"],
              },
            },
            query_database: {
              description: "Query a Notion database with filters and sorts",
              inputSchema: {
                type: "object",
                properties: {
                  database_id: {
                    type: "string",
                    description: "Notion database ID",
                  },
                  filter: {
                    type: "object",
                    description: "Filter conditions (optional)",
                  },
                  sorts: {
                    type: "array",
                    description: "Sort conditions (optional)",
                  },
                  page_size: {
                    type: "number",
                    description: "Number of results per page (default: 100)",
                  },
                  start_cursor: {
                    type: "string",
                    description: "Pagination cursor (optional)",
                  },
                },
                required: ["database_id"],
              },
            },
            create_database_page: {
              description:
                "Create a new page in a database with structured properties",
              inputSchema: {
                type: "object",
                properties: {
                  database_id: {
                    type: "string",
                    description: "Notion database ID",
                  },
                  properties: {
                    type: "object",
                    description: "Database page properties",
                  },
                  children: {
                    type: "array",
                    description: "Page content blocks (optional)",
                  },
                  icon: {
                    type: "object",
                    description: "Page icon (optional)",
                  },
                  cover: {
                    type: "object",
                    description: "Page cover (optional)",
                  },
                },
                required: ["database_id", "properties"],
              },
            },
          },
        },
      },
    );

    // Initialize Notion client
    const apiKey = process.env.NOTION_API_KEY;
    if (!apiKey) {
      console.error("ERROR: NOTION_API_KEY environment variable is not set");
      console.error("Please add NOTION_API_KEY to your .env file");
      process.exit(1);
    }

    this.notion = new Client({ auth: apiKey });

    // Set up request handlers
    this.setupHandlers();

    // Logging
    this.debugMode = argv.debug;
    this.log("Notion MCP Server initialized");
    this.log(`Debug mode: ${this.debugMode}`);
  }

  log(message) {
    if (this.debugMode) {
      console.error(`[Notion MCP] ${message}`);
    }
  }

  setupHandlers() {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.log("ListTools request received");
      return {
        tools: [
          {
            name: "search_pages",
            description:
              "Search pages in Notion with optional query and filter",
            inputSchema:
              this.server.capabilities.tools.search_pages.inputSchema,
          },
          {
            name: "get_page",
            description: "Get a page by ID with all its content and properties",
            inputSchema: this.server.capabilities.tools.get_page.inputSchema,
          },
          {
            name: "create_page",
            description: "Create a new page in Notion",
            inputSchema: this.server.capabilities.tools.create_page.inputSchema,
          },
          {
            name: "update_page",
            description: "Update an existing page",
            inputSchema: this.server.capabilities.tools.update_page.inputSchema,
          },
          {
            name: "query_database",
            description: "Query a Notion database with filters and sorts",
            inputSchema:
              this.server.capabilities.tools.query_database.inputSchema,
          },
          {
            name: "create_database_page",
            description:
              "Create a new page in a database with structured properties",
            inputSchema:
              this.server.capabilities.tools.create_database_page.inputSchema,
          },
        ],
      };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.log(`Tool called: ${name}`);

      try {
        let result;
        switch (name) {
          case "search_pages":
            result = await this.searchPages(args);
            break;
          case "get_page":
            result = await this.getPage(args);
            break;
          case "create_page":
            result = await this.createPage(args);
            break;
          case "update_page":
            result = await this.updatePage(args);
            break;
          case "query_database":
            result = await this.queryDatabase(args);
            break;
          case "create_database_page":
            result = await this.createDatabasePage(args);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        this.log(`Error in tool ${name}: ${error.message}`);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  error: error.message,
                  type: error.constructor.name,
                },
                null,
                2,
              ),
            },
          ],
          isError: true,
        };
      }
    });

    // List resources handler (empty for now)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return { resources: [] };
    });

    // Read resource handler (empty for now)
    this.server.setRequestHandler(ReadResourceRequestSchema, async () => {
      throw new Error("Resources not implemented");
    });
  }

  // Tool implementations
  async searchPages({ query, filter, sort, page_size = 20 }) {
    this.log(`Searching pages with query: ${query || "(none)"}`);

    const requestBody = {
      page_size,
    };

    if (query) {
      requestBody.query = query;
    }

    if (filter) {
      requestBody.filter = filter;
    }

    if (sort) {
      requestBody.sort = sort;
    }

    try {
      const response = await this.notion.search(requestBody);
      return {
        results: response.results,
        has_more: response.has_more,
        next_cursor: response.next_cursor,
      };
    } catch (error) {
      this.log(`Search error: ${error.message}`);
      throw error;
    }
  }

  async getPage({ page_id }) {
    this.log(`Getting page: ${page_id}`);

    try {
      const page = await this.notion.pages.retrieve({
        page_id,
      });

      // Also get page content if needed
      const blocks = await this.notion.blocks.children.list({
        block_id: page_id,
      });

      return {
        page,
        blocks: blocks.results,
      };
    } catch (error) {
      this.log(`Get page error: ${error.message}`);
      throw error;
    }
  }

  async createPage({ parent, properties, children, icon, cover }) {
    this.log(`Creating page in parent: ${JSON.stringify(parent)}`);

    const requestBody = {
      parent,
      properties,
    };

    if (children && children.length > 0) {
      requestBody.children = children;
    }

    if (icon) {
      requestBody.icon = icon;
    }

    if (cover) {
      requestBody.cover = cover;
    }

    try {
      const page = await this.notion.pages.create(requestBody);
      return { page };
    } catch (error) {
      this.log(`Create page error: ${error.message}`);
      throw error;
    }
  }

  async updatePage({ page_id, properties, archived, icon, cover }) {
    this.log(`Updating page: ${page_id}`);

    const requestBody = {
      page_id,
    };

    if (properties) {
      requestBody.properties = properties;
    }

    if (archived !== undefined) {
      requestBody.archived = archived;
    }

    if (icon) {
      requestBody.icon = icon;
    }

    if (cover) {
      requestBody.cover = cover;
    }

    try {
      const page = await this.notion.pages.update(requestBody);
      return { page };
    } catch (error) {
      this.log(`Update page error: ${error.message}`);
      throw error;
    }
  }

  async queryDatabase({
    database_id,
    filter,
    sorts,
    page_size = 100,
    start_cursor,
  }) {
    this.log(`Querying database: ${database_id}`);

    const requestBody = {
      database_id,
    };

    if (filter) {
      requestBody.filter = filter;
    }

    if (sorts) {
      requestBody.sorts = sorts;
    }

    if (page_size) {
      requestBody.page_size = page_size;
    }

    if (start_cursor) {
      requestBody.start_cursor = start_cursor;
    }

    try {
      const response = await this.notion.databases.query(requestBody);
      return {
        results: response.results,
        has_more: response.has_more,
        next_cursor: response.next_cursor,
      };
    } catch (error) {
      this.log(`Query database error: ${error.message}`);
      throw error;
    }
  }

  async createDatabasePage({ database_id, properties, children, icon, cover }) {
    this.log(`Creating database page in: ${database_id}`);

    const requestBody = {
      parent: { database_id },
      properties,
    };

    if (children && children.length > 0) {
      requestBody.children = children;
    }

    if (icon) {
      requestBody.icon = icon;
    }

    if (cover) {
      requestBody.cover = cover;
    }

    try {
      const page = await this.notion.pages.create(requestBody);
      return { page };
    } catch (error) {
      this.log(`Create database page error: ${error.message}`);
      throw error;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.log("Server connected and ready");
  }
}

// Run the server
if (require.main === module) {
  const server = new NotionMCPServer();
  server.run().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}

module.exports = { NotionMCPServer };
