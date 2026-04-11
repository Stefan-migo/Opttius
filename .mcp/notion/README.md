# 🔌 Notion MCP Server for Opttius

Local Model Context Protocol (MCP) server for Notion integration with Claude Desktop.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd .mcp/notion
npm install
```

This will automatically:

- Install required packages
- Create `.env` file from project `.env.local`
- Set up basic configuration

### 2. Configure Notion Integration

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration:
   - Name: `Opttius Docs Sync`
   - Permissions: Read content, Update content, Insert content
3. Copy the **Internal Integration Token**
4. Share the integration with your Notion workspace/pages

### 3. Set Up Environment Variables

Edit `.env.local` in the project root:

```env
NOTION_API_KEY=secret_xxxx
NOTION_DATABASE_DOCS=xxxxxx
NOTION_DATABASE_TASKS=xxxxxx
NOTION_DATABASE_FEATURES=xxxxxx
```

Then sync to MCP server:

```bash
npm run sync-env
```

### 4. Configure Claude Desktop

Run the setup script:

```bash
node setup-claude.js
```

Or manually edit Claude Desktop configuration:

**Location:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Content:**

```json
{
  "mcpServers": {
    "opttius-notion": {
      "command": "node",
      "args": ["/absolute/path/to/Opttius-app/.mcp/notion/start-server.js"],
      "env": {
        "NODE_ENV": "development",
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    }
  }
}
```

### 5. Restart Claude Desktop

Restart Claude Desktop for changes to take effect.

## 🛠️ Available Tools

The server provides 6 tools for interacting with Notion:

### 1. `search_pages`

Search pages in Notion with optional query and filter.

**Parameters:**

- `query` (string, optional): Search query
- `filter` (object, optional): Filter object
- `sort` (object, optional): Sort object
- `page_size` (number, optional): Results per page (default: 20)

### 2. `get_page`

Get a page by ID with all its content and properties.

**Parameters:**

- `page_id` (string, required): Notion page ID

### 3. `create_page`

Create a new page in Notion.

**Parameters:**

- `parent` (object, required): Parent object (`database_id` or `page_id`)
- `properties` (object, required): Page properties
- `children` (array, optional): Page content blocks
- `icon` (object, optional): Page icon
- `cover` (object, optional): Page cover

### 4. `update_page`

Update an existing page.

**Parameters:**

- `page_id` (string, required): Notion page ID
- `properties` (object, optional): Updated properties
- `archived` (boolean, optional): Archive the page
- `icon` (object, optional): Updated icon
- `cover` (object, optional): Updated cover

### 5. `query_database`

Query a Notion database with filters and sorts.

**Parameters:**

- `database_id` (string, required): Notion database ID
- `filter` (object, optional): Filter conditions
- `sorts` (array, optional): Sort conditions
- `page_size` (number, optional): Results per page (default: 100)
- `start_cursor` (string, optional): Pagination cursor

### 6. `create_database_page`

Create a new page in a database with structured properties.

**Parameters:**

- `database_id` (string, required): Notion database ID
- `properties` (object, required): Database page properties
- `children` (array, optional): Page content blocks
- `icon` (object, optional): Page icon
- `cover` (object, optional): Page cover

## 🧪 Testing

### Test Server Connection

```bash
# Start server in test mode
npm test

# Start server in debug mode
npm run dev
```

### Verify Configuration

```bash
# Check environment variables
node -e "console.log(process.env.NOTION_API_KEY ? '✅ API key set' : '❌ API key missing')"

# Test Notion API connection
node test-connection.js
```

## 🔧 Development

### Project Structure

```
.mcp/notion/
├── start-server.js          # Main MCP server
├── package.json            # Dependencies and metadata
├── .env.example           # Example environment variables
├── .env                   # Actual environment (gitignored)
├── sync-env.js           # Environment sync script
├── setup-claude.js       # Claude Desktop setup
├── test-connection.js    # Notion API test
└── README.md            # This file
```

### Adding New Tools

1. Edit `start-server.js`:
   - Add tool definition in constructor's `capabilities.tools`
   - Add tool implementation method
   - Add case in `switch` statement

2. Update `package.json` `mcp.capabilities.tools` section

3. Test the new tool:
   ```bash
   npm run dev
   ```

## 🚨 Troubleshooting

### Common Issues

#### "NOTION_API_KEY environment variable is not set"

- Check that `.env.local` exists in project root
- Run `npm run sync-env` to update `.env`
- Verify variable name matches exactly

#### Claude Desktop doesn't detect server

- Restart Claude Desktop
- Check configuration file location
- Verify server path is absolute
- Check console for errors: `npm run dev`

#### Notion API errors

- Verify integration is shared with pages/databases
- Check integration permissions
- Verify database IDs are correct

#### Server crashes on startup

- Check Node.js version >= 18
- Run `npm install` to ensure dependencies
- Check debug logs: `npm run dev`

### Logs

Enable debug mode for detailed logs:

```bash
cd .mcp/notion
npm run dev
```

## 📚 Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Model Context Protocol](https://spec.modelcontextprotocol.io/)
- [Claude Desktop MCP Docs](https://docs.anthropic.com/claude/docs/model-context-protocol)
- [Opttius Integration Guide](../docs/04-integration/NOTION.md)

## 🔄 Maintenance

### Updating Dependencies

```bash
cd .mcp/notion
npm update
```

### Syncing Environment Variables

When `.env.local` changes:

```bash
npm run sync-env
```

Or manually copy values to `.env`.

### Checking Server Status

```bash
# Check if server starts without errors
timeout 2 node start-server.js --test 2>&1 | head -20
```

---

**Last Updated:** 2026-03-28  
**Status:** ✅ Ready for use
