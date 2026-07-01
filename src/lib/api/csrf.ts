/**
 * CSRF Protection — Origin/Referer header validation
 *
 * Pure function: no side effects, no Next.js coupling.
 * Validates Origin header (falls back to Referer) against allowed origins.
 */

export function validateCsrfOrigin(
  headers: Headers,
  opts?: { appUrl?: string },
): { valid: boolean; reason?: string } {
  const source = headers.get("origin") || headers.get("referer");
  if (!source) {
    return { valid: false, reason: "Missing Origin and Referer headers" };
  }

  let parsed: URL;
  try {
    parsed = new URL(source);
  } catch {
    return { valid: false, reason: "Invalid Origin or Referer URL" };
  }

  const appUrl = opts?.appUrl || process.env.NEXT_PUBLIC_APP_URL || "";
  const allowedOrigins = new Set<string>();

  if (appUrl) {
    try {
      allowedOrigins.add(new URL(appUrl).origin);
    } catch {
      // ignore unparseable APP_URL
    }
  }
  allowedOrigins.add("http://localhost:3000");

  if (!allowedOrigins.has(parsed.origin)) {
    return { valid: false, reason: `Origin ${parsed.origin} not allowed` };
  }

  return { valid: true };
}

/**
 * List of exempt route prefixes that bypass CSRF validation.
 * These handle external POSTs (webhooks, cron, health checks).
 */
export const CSRF_EXEMPT_PREFIXES = [
  "/api/webhooks/",
  "/api/cron/",
  "/api/admin/system/health",
];
