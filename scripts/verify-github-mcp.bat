@echo off
:: GitHub MCP Verification Script

echo 🧪 Verifying GitHub MCP Server Installation...

:: Check if server is installed
echo 1. Checking if GitHub MCP server is installed...
npm list -g @modelcontextprotocol/server-github >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ GitHub MCP server is installed globally
) else (
    echo ❌ GitHub MCP server is not installed
    goto :error
)

:: Check if configuration exists
echo 2. Checking configuration files...
set QODER_CONFIG="%APPDATA%\qoder\global-mcp-config.json"
if exist %QODER_CONFIG% (
    echo ✅ Global configuration file found
) else (
    echo ⚠️  Global configuration file not found
)

:: Test server availability
echo 3. Testing server availability...
npx @modelcontextprotocol/server-github --help >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo ✅ GitHub MCP server is accessible
) else (
    echo ❌ GitHub MCP server is not responding
    goto :error
)

:: Check environment variable
echo 4. Checking GITHUB_TOKEN environment variable...
if defined GITHUB_TOKEN (
    echo ✅ GITHUB_TOKEN is set (first 8 characters: %GITHUB_TOKEN:~0,8%...)
) else (
    echo ⚠️  GITHUB_TOKEN is not set - server may not function properly
)

echo.
echo 🎉 Verification Complete!
echo The GitHub MCP server is ready to use with Qoder.
echo.
echo To use it:
echo 1. Make sure GITHUB_TOKEN environment variable is set
echo 2. Restart Qoder IDE
echo 3. The server should appear in Qoder's MCP connections

goto :end

:error
echo.
echo ❌ Verification failed. Please run the setup script:
echo    scripts\setup-github-mcp-global.bat

:end
pause