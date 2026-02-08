@echo off
REM Sentry Setup Script for Opttius (Windows)

echo 🚀 Setting up Sentry for Opttius...
echo.

REM Check if Sentry DSN is configured
findstr /C:"your_sentry_dsn_here" .env.local >nul
if %errorlevel% == 0 (
    echo ⚠️  Sentry DSN not configured yet.
    echo.
    echo Please follow these steps:
    echo 1. Go to https://sentry.io/signup/
    echo 2. Create a free account
    echo 3. Create a new Next.js project
    echo 4. Copy the DSN from your project settings
    echo 5. Replace 'your_sentry_dsn_here' in .env.local with your actual DSN
    echo.
    echo Example DSN format: https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@oxxxxxxx.ingest.sentry.io/xxxxxx
    echo.
    pause
)

echo ✅ Sentry setup complete!
echo.
echo Next steps:
echo 1. Run 'npm run dev' to start your development server
echo 2. Visit http://localhost:3000 to test error reporting
echo 3. Check your Sentry dashboard for captured errors
echo.
echo 💡 Tip: Try triggering an error by visiting a non-existent page to verify setup
pause