#!/bin/bash
# Supabase MCP Server Configuration Script

export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
export SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY"

echo "Starting Supabase MCP Server with configuration:"
echo "Supabase URL: $SUPABASE_URL"
echo "Anon Key: $SUPABASE_ANON_KEY"
echo "Service Role Key: $SUPABASE_SERVICE_ROLE_KEY"
echo ""

# Run the MCP server
npx @aliyun-rds/supabase-mcp-server