/**
 * Rate Limiting Shared Types
 *
 * Shared type re-exports to break import cycle between index.ts and middleware.ts.
 *
 * @module lib/rate-limiting/types
 */

export type { NextRequest, NextResponse } from "next/server";
