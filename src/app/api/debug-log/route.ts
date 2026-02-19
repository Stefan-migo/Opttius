/**
 * Debug log proxy - forwards client logs to debug ingest (bypasses CSP).
 * Only active when debug endpoint is configured.
 */
import { NextRequest, NextResponse } from "next/server";

const DEBUG_INGEST =
  "http://127.0.0.1:7244/ingest/31142538-c0fe-4e58-9e94-5a9176bfd36e";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await fetch(DEBUG_INGEST, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    // Ignore errors - debug logging should not affect app
  }
  return NextResponse.json({ ok: true });
}
