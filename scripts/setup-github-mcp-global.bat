@echo off
:: GitHub MCP Global Setup Script for Qoder (Windows)

echo 🚀 Setting up GitHub MCP Server globally for Qoder...

:: Check if Node.js and npm are installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is required. Please install it first.
    exit /b 1
)

where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is required. Please install it first.
    exit /b 1
)

echo ✅ Node.js and npm found

:: Install GitHub MCP server globally
echo 📦 Installing @modelcontextprotocol/server-github globally...
npm install -g @modelcontextprotocol/server-github

if %ERRORLEVEL% EQU 0 (
    echo ✅ GitHub MCP server installed successfully
) else (
    echo ❌ Failed to install GitHub MCP server
    exit /b 1
)

:: Create Qoder MCP configuration directory
set QODER_CONFIG_DIR=%APPDATA%\qoder
mkdir "%QODER_CONFIG_DIR%" 2>nul

:: Create global MCP configuration
(
echo {
echo   "mcpServers": {
echo     "github": {
echo       "command": "npx",
echo       "args": ["@modelcontextprotocol/server-github"],
echo       "env": {
echo         "GITHUB_TOKEN": "${GITHUB_TOKEN}"
echo       }
echo     }
echo   }
echo }
) > "%QODER_CONFIG_DIR%\global-mcp-config.json"

echo ✅ Created global MCP configuration at %QODER_CONFIG_DIR%\global-mcp-config.json

:: Test the installation
echo 🧪 Testing GitHub MCP server...
npx @modelcontextprotocol/server-github --help >nul 2>&1

if %ERRORLEVEL% EQU 0 (
    echo ✅ GitHub MCP server is working correctly
) else (
    echo ⚠️  GitHub MCP server installed but may need configuration
)

echo.
echo 📋 Setup Complete!
echo Next steps:
echo 1. Create a GitHub Personal Access Token:
echo    - Go to https://github.com/settings/tokens
echo    - Generate a new token with 'repo' scope
echo 2. Set the token as environment variable:
echo    set GITHUB_TOKEN=your_token_here
echo 3. Restart Qoder to load the MCP server
echo.
echo 📁 Configuration file location: %QODER_CONFIG_DIR%\global-mcp-config.json
pause