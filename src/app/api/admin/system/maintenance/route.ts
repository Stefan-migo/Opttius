import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

import { handleBackupDatabase } from "./actions/backupDatabase";
import { handleCleanLogs } from "./actions/cleanLogs";
import { handleClearMemory } from "./actions/clearMemory";
import { handleOptimizeDatabase } from "./actions/optimizeDatabase";
import { handleSecurityAudit } from "./actions/securityAudit";
import { handleSystemStatus } from "./actions/systemStatus";
import { handleTestEmail } from "./actions/testEmail";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, branch_id: branchId } = body;

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: adminRole } = await supabase.rpc("get_admin_role", { user_id: user.id }) as unknown;
    if (!["admin", "super_admin", "root", "dev"].includes(adminRole as string)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    logger.info("Maintenance action requested", { action, userEmail: user.email });

    const { data: adminUser } = await supabase.from("admin_users").select("organization_id").eq("id", user.id).single();
    const userOrganizationId = (adminUser as unknown)?.organization_id;
    if (!userOrganizationId) return NextResponse.json({ error: "Organization not found for user" }, { status: 400 });

    switch (action) {
      case "backup_database":
        return NextResponse.json(await handleBackupDatabase(userOrganizationId, user.email!, branchId, supabase));
      case "clean_logs":
        return handleResult(await handleCleanLogs(supabase));
      case "optimize_database":
        return handleResult(await handleOptimizeDatabase(supabase));
      case "security_audit":
        return NextResponse.json(await handleSecurityAudit(supabase));
      case "test_email":
        return handleResult(await handleTestEmail(user.email!, supabase));
      case "system_status":
        return NextResponse.json(await handleSystemStatus(supabase, userOrganizationId, branchId));
      case "clear_memory":
        return NextResponse.json(await handleClearMemory(supabase));
      default:
        return NextResponse.json({ error: "Acción de mantenimiento no válida" }, { status: 400 });
    }
  } catch (error) {
    logger.error("Error in maintenance API", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function handleResult(result: unknown) {
  if (result.error) return NextResponse.json(result, { status: 500 });
  return NextResponse.json(result);
}
