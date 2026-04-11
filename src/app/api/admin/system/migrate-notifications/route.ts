import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    // Read the migration file
    const migrationPath = path.join(
      process.cwd(),
      "supabase",
      "migrations",
      "20250129000000_add_optical_notification_types.sql",
    );

    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json(
        {
          error: "Migration file not found",
          path: migrationPath,
        },
        { status: 404 },
      );
    }

    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Return the SQL for manual execution in Supabase Studio
    // Note: Supabase doesn't allow executing arbitrary SQL via REST API for security reasons
    return NextResponse.json({
      message:
        "Migration SQL prepared. Please execute manually in Supabase Studio.",
      sql: migrationSQL,
      instructions: [
        "1. Go to https://supabase.com/dashboard",
        "2. Select your project",
        "3. Click on SQL Editor",
        "4. Copy and paste the SQL below",
        "5. Click Run",
      ],
    });
  } catch (error: unknown) {
    logger.error("Error in migration endpoint:", { error });
    return NextResponse.json(
      {
        error: "Failed to process migration",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
