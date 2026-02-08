#!/bin/bash
# GitHub MCP Global Setup Script for Qoder

echo "🚀 Setting up GitHub MCP Server globally for Qoder..."

# Check if Node.js and npm are installed
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "❌ Node.js and npm are required. Please install them first."
    exit 1
fi

echo "✅ Node.js and npm found"

# Install GitHub MCP server globally
echo "📦 Installing @modelcontextprotocol/server-github globally..."
npm install -g @modelcontextprotocol/server-github

if [ $? -eq 0 ]; then
    echo "✅ GitHub MCP server installed successfully"
else
    echo "❌ Failed to install GitHub MCP server"
    exit 1
fi

# Create Qoder MCP configuration directory
QODER_CONFIG_DIR="$APPDATA/qoder"
mkdir -p "$QODER_CONFIG_DIR"

# Create global MCP configuration
cat > "$QODER_CONFIG_DIR/global-mcp-config.json" << EOF
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "\${GITHUB_TOKEN}"
      }
    }
  }
}
EOF

echo "✅ Created global MCP configuration at $QODER_CONFIG_DIR/global-mcp-config.json"

# Test the installation
echo "🧪 Testing GitHub MCP server..."
npx @modelcontextprotocol/server-github --help >/dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "✅ GitHub MCP server is working correctly"
else
    echo "⚠️  GitHub MCP server installed but may need configuration"
fi

echo ""
echo "📋 Setup Complete!"
echo "Next steps:"
echo "1. Create a GitHub Personal Access Token:"
echo "   - Go to https://github.com/settings/tokens"
echo "   - Generate a new token with 'repo' scope"
echo "2. Set the token as environment variable:"
echo "   export GITHUB_TOKEN=your_token_here"
echo "3. Restart Qoder to load the MCP server"
echo ""
echo "📁 Configuration file location: $QODER_CONFIG_DIR/global-mcp-config.json"