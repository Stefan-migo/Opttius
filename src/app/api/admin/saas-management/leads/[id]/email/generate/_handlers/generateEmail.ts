import { NextRequest, NextResponse } from "next/server";

import { createServiceRoleClient } from "@/utils/supabase/service-role";

// eslint-disable-next-line no-restricted-imports
export async function generateEmailHandler(request: NextRequest, leadId: string) {
  const supabase = createServiceRoleClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!adminUser || (adminUser.role !== "root" && adminUser.role !== "dev")) {
    return NextResponse.json({ error: "Root/Dev access required" }, { status: 403 });
  }

  const { data: lead } = await supabase
    .from("saas_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  const body = await request.json();
  const { template, customizations } = body;

  // Generate email content based on lead data and template
  const emailContent = generateFromTemplate(template, lead, customizations);

  return NextResponse.json({ success: true, email: emailContent });
}

function generateFromTemplate(template: string, lead: Record<string, unknown>, customizations?: Record<string, string>) {
  const vars: Record<string, string> = {
    company: (lead.company_name as string) || (lead.organization_name as string) || "",
    name: `${lead.contact_first_name || ""} ${lead.contact_last_name || ""}`.trim() || (lead.contact_name as string) || "",
    email: (lead.contact_email as string) || "",
    phone: (lead.contact_phone as string) || "",
    plan: (lead.plan_interest as string) || (lead.tier_interest as string) || "",
    employees: String(lead.employee_count || lead.branch_count || ""),
    ...customizations,
  };

  return Object.entries(vars).reduce(
    (text, [key, val]) => text.replace(new RegExp(`{{${key}}}`, "g"), val),
    template,
  );
}
