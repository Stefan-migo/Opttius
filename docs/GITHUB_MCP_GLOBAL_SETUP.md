# GitHub MCP Server Global Setup for Qoder

This guide explains how to install and configure the GitHub MCP server globally for use with Qoder across all your projects.

## 📋 Prerequisites

- Node.js and npm installed
- GitHub account
- Qoder IDE

## 🚀 Installation Steps

### 0. Quick Verification (Optional)

First, verify if everything is already set up:

```bash
scripts\verify-github-mcp.bat
```

### 1. Run the Setup Script

Choose the appropriate script for your operating system:

**Windows:**

```bash
scripts\setup-github-mcp-global.bat
```

**macOS/Linux:**

```bash
chmod +x scripts/setup-github-mcp-global.sh
./scripts/setup-github-mcp-global.sh
```

### 2. Create GitHub Personal Access Token

1. Go to [GitHub Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select the following scopes:
   - `repo` - Full control of private repositories
   - `read:org` - Read org and team membership
   - `gist` - Create gists (optional)

### 3. Configure Environment Variable

Add the GitHub token to your environment:

**Windows (Command Prompt):**

```cmd
set GITHUB_TOKEN=your_github_token_here
```

**Windows (PowerShell):**

```powershell
$env:GITHUB_TOKEN="your_github_token_here"
```

**macOS/Linux:**

```bash
export GITHUB_TOKEN=your_github_token_here
```

For permanent setup, add to your shell profile:

- Windows: Add to System Environment Variables
- macOS: Add to `~/.zshrc` or `~/.bash_profile`
- Linux: Add to `~/.bashrc` or `~/.profile`

### 4. Restart Qoder

Close and reopen Qoder to load the MCP server configuration.

## 📁 Configuration Files

The setup creates configuration files at:

- **Windows:** `%APPDATA%\qoder\global-mcp-config.json`
- **macOS/Linux:** `~/Library/Application Support/qoder/global-mcp-config.json` or `~/.config/qoder/global-mcp-config.json`

## 🔧 Manual Configuration

If the automatic setup doesn't work, you can manually configure:

1. **Install the server:**

   ```bash
   npm install -g @modelcontextprotocol/server-github
   ```

2. **Create configuration file:**
   ```json
   {
     "mcpServers": {
       "github": {
         "command": "npx",
         "args": ["@modelcontextprotocol/server-github"],
         "env": {
           "GITHUB_TOKEN": "${GITHUB_TOKEN}"
         }
       }
     }
   }
   ```

## 🎯 Features Available

Once configured, the GitHub MCP server provides:

- **Repository Operations:**
  - List repositories
  - Get repository details
  - Create repositories
  - Manage branches

- **Issue Management:**
  - List issues
  - Create/edit issues
  - Comment on issues
  - Close/reopen issues

- **Pull Request Operations:**
  - List pull requests
  - Create pull requests
  - Review pull requests
  - Merge pull requests

- **Code Operations:**
  - Search code
  - Get file contents
  - Create commits
  - Manage workflows

## 🔍 Troubleshooting

### Common Issues:

1. **Server not found:**
   - Ensure the token is set in environment variables
   - Restart Qoder after setting the token
   - Check that npm global packages are in PATH

2. **Authentication errors:**
   - Verify the GitHub token is valid
   - Check that required scopes are granted
   - Ensure the token hasn't expired

3. **Permission denied:**
   - Make sure you have access to the repository
   - Check organization permissions if applicable

### Testing the Connection:

You can test the MCP server directly:

```bash
npx @modelcontextprotocol/server-github --help
```

## 🔄 Project-Specific Configuration

For project-specific GitHub MCP configuration, create `.qoder/github-mcp-config.json` in your project root:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "project_specific_token_or_${GITHUB_TOKEN}"
      }
    }
  }
}
```

## 🛡️ Security Notes

- Never commit GitHub tokens to version control
- Use fine-grained tokens when possible
- Regularly rotate your tokens
- Monitor token usage in GitHub settings

## 📚 Additional Resources

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [GitHub REST API Documentation](https://docs.github.com/en/rest)
- [Qoder MCP Documentation](https://docs.qoder.ai/mcp)

---

_Last updated: February 8, 2026_
