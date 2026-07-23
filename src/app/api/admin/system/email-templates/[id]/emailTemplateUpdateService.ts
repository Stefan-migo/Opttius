import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/utils/supabase/server";

export async function handleUpdateTemplate(request: NextRequest, params: { id: string }) {
  const body = await request.json();
  const { name, subject, content, is_active, variables } = body;

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminUser } = await supabase.from("admin_users").select("organization_id, role").eq("id", user.id).single();
  if (!adminUser) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const { data: existingTemplate } = await supabase
    .from("system_email_templates").select("organization_id, is_system, type, name, subject, content, variables")
    .eq("id", params.id).single();
  if (!existingTemplate) return NextResponse.json({ error: "Template not found" }, { status: 404 });

  const isOnlyToggleActive = Object.keys(body).filter((k) => k !== "is_active").length === 0 && is_active !== undefined;

  let isGlobalAdmin = ["super_admin", "root", "dev"].includes(adminUser.role);
  if (!isGlobalAdmin) {
    const { data: isSuperAdminRpc } = await supabase.rpc("is_super_admin", { user_id: user.id });
    isGlobalAdmin = !!isSuperAdminRpc;
  }

  const canUpdate = isGlobalAdmin || existingTemplate.organization_id === adminUser.organization_id
    || (existingTemplate.organization_id === null && !existingTemplate.is_system)
    || (existingTemplate.organization_id === null && existingTemplate.is_system && adminUser.organization_id && isOnlyToggleActive);
  if (!canUpdate) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Org admin toggling is_active on system template: create/delete org override
  if (!isGlobalAdmin && existingTemplate.is_system && adminUser.organization_id && is_active !== undefined) {
    const orgId = adminUser.organization_id;
    const { data: orgOverride } = await supabase
      .from("system_email_templates").select("id").eq("type", existingTemplate.type)
      .eq("organization_id", orgId).is("is_system", false).maybeSingle();

    if (is_active === false) {
      if (!orgOverride) {
        const { data: created, error: insertErr } = await supabase.from("system_email_templates").insert({
          name: existingTemplate.name, type: existingTemplate.type, subject: existingTemplate.subject,
          content: existingTemplate.content, variables: existingTemplate.variables ?? [],
          is_active: false, is_system: false, organization_id: orgId,
        }).select().single();
        if (!insertErr && created) return NextResponse.json({ success: true, template: { ...created, _is_override: true } });
      } else {
        const { data: updated, error: updErr } = await supabase.from("system_email_templates")
          .update({ is_active: false, updated_at: new Date().toISOString() }).eq("id", orgOverride.id).select().single();
        if (!updErr && updated) return NextResponse.json({ success: true, template: { ...updated, _is_override: true } });
      }
    } else {
      if (orgOverride) {
        await supabase.from("system_email_templates").delete().eq("id", orgOverride.id);
        return NextResponse.json({ success: true, template: { ...existingTemplate, is_active: true } });
      }
    }
  }

  if (!isGlobalAdmin && existingTemplate.is_system) {
    return NextResponse.json({ error: "Cannot modify system templates. Create a custom one instead." }, { status: 403 });
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updateData.name = name;
  if (subject !== undefined) updateData.subject = subject;
  if (content !== undefined) updateData.content = content;
  if (is_active !== undefined) updateData.is_active = is_active;
  if (variables !== undefined) updateData.variables = Array.isArray(variables) ? variables : JSON.parse(variables || "[]");

  const { data: template, error } = await supabase.from("system_email_templates").update(updateData)
    .eq("id", params.id).select().maybeSingle();
  if (error) return NextResponse.json({ error: "Failed to update email template", details: error.message }, { status: 500 });
  if (!template) return NextResponse.json({ error: "Template not found or update had no effect" }, { status: 404 });

  return NextResponse.json({ success: true, template });
}
