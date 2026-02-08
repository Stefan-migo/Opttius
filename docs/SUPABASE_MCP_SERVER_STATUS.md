# Supabase MCP Server - Quick Start Guide

## 🚀 Server Status: CONNECTED ✅

Your Supabase MCP server is now successfully running and connected to your local Supabase Docker container!

## 🔧 Connection Details

- **Supabase URL**: http://127.0.0.1:54321
- **Database URL**: postgresql://postgres:postgres@127.0.0.1:54322/postgres
- **Studio URL**: http://127.0.0.1:54323
- **Mode**: Single Instance Admin Access (Full permissions)

## 📋 Available Tools (23 registered)

The MCP server has successfully registered 23 tools including:

- Database schema browsing
- SQL query execution
- Performance insights
- Migration management
- Table operations
- Function management
- And more...

## 🔄 Quick Restart Commands

### Linux/Mac:

```bash
./scripts/start-mcp-server.sh
```

### Windows:

```cmd
scripts\start-mcp-server.bat
```

### Direct Command:

```bash
npx @aliyun-rds/supabase-mcp-server --supabase-url "http://127.0.0.1:54321" --supabase-anon-key "YOUR_SUPABASE_ANON_KEY" --supabase-service-role-key "YOUR_SUPABASE_SERVICE_ROLE_KEY"
```

## 🎯 What You Can Do Now

With the MCP server running, you can:

1. **Browse Database Schema** - Explore tables, columns, relationships
2. **Execute SQL Queries** - Run queries directly through the MCP interface
3. **Performance Analysis** - Get insights about slow queries and optimization opportunities
4. **Migration Management** - View and manage database migrations
5. **Real-time Monitoring** - Monitor database performance and activity

## 🛠️ Integration with Your IDE

The MCP server can be integrated with:

- Cursor IDE
- Claude Desktop
- Other MCP-compatible tools
- Custom AI assistants

## 📊 Benefits Over Manual Scripts

Instead of maintaining custom optimization scripts, you now have:

- Real-time database insights
- Interactive schema exploration
- Built-in performance recommendations
- Easy query testing and validation
- No need to remember complex psql commands

## 🆘 Troubleshooting

If the server stops working:

1. Ensure Supabase is still running: `npx supabase status`
2. Restart the MCP server using the commands above
3. Check that the connection URLs haven't changed

## 📝 Next Steps

1. Integrate with your preferred IDE/AI tool
2. Explore the available tools through the MCP interface
3. Start using it for database management tasks
4. Replace manual optimization scripts with MCP-driven workflows

---

_Server successfully connected to local Supabase instance_
