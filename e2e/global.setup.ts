/**
 * Playwright global setup.
 * Runs before tests. webServer starts in parallel - first test will fail if server is down.
 */
async function globalSetup() {
  console.log("E2E Setup: Ready. Ensure Supabase (supabase:start) is running.");
}

export default globalSetup;
