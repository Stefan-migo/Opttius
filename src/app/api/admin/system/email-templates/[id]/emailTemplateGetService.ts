import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export async function handleGetTemplate(request: NextRequest, params: { id: string }) {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminUser } = await supabase.from("admin_users").select("organization_id, role").eq("id", user.id).single();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  let query = supabase.from("system_email_templates").select("*").eq("id", params.id);
  const isGlobalAdmin = ["super_admin", "root", "dev"].includes(adminUser.role);
  if (!isGlobalAdmin) {
    const orgId = adminUser.organization_id;
    query = orgId ? query.or(`organization_id.eq.${orgId},organization_id.is.null`) : query.is("organization_id", null);
  }

  const { data: template, error } = await query.single();
  if (error) {
    logger.error("Error fetching email template", { error, templateId: params.id });
    return NextResponse.json({ error: "Failed to fetch email template" }, { status: 500 });
  }
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  return NextResponse.json({ template });
}
