import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export async function handleDeleteTemplate(request: NextRequest, params: { id: string }) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminUser } = await supabase.from("admin_users").select("organization_id, role").eq("id", user.id).single();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { data: existingTemplate } = await supabase
    .from("system_email_templates").select("organization_id, is_system").eq("id", params.id).single();
  if (!existingTemplate) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const isGlobalAdmin = ["super_admin", "root", "dev"].includes(adminUser.role);
  if (!isGlobalAdmin && (existingTemplate.organization_id !== adminUser.organization_id || existingTemplate.is_system)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { error } = await supabase.from("system_email_templates").delete().eq("id", params.id);
  if (error) {
    logger.error("Error deleting email template", { error, templateId: params.id });
    return NextResponse.json({ error: "Failed to delete email template" }, { status: 500 });
  }
  return NextResponse.json({ success: true, message: "Template deleted successfully" });
}
