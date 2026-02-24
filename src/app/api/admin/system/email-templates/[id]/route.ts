import { NextRequest, NextResponse } from "next/server";
import {
  createClient,
  createServiceRoleClient,
} from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    let query = supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", params.id);

    // Apply tenant isolation (root, dev, super_admin see all)
    const isGlobalAdminGet =
      adminUser.role === "super_admin" ||
      adminUser.role === "root" ||
      adminUser.role === "dev";
    if (!isGlobalAdminGet) {
      const orgId = adminUser.organization_id;
      if (orgId) {
        query = query.or(`organization_id.eq.${orgId},organization_id.is.null`);
      } else {
        query = query.is("organization_id", null);
      }
    }

    const { data: template, error } = await query.single();

    if (error) {
      logger.error("Error fetching email template", {
        error,
        templateId: params.id,
      });
      return NextResponse.json(
        {
          error: "Failed to fetch email template",
        },
        { status: 500 },
      );
    }

    if (!template) {
      return NextResponse.json(
        {
          error: "Template not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    logger.error("Error in email template API", {
      error,
      templateId: params.id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { name, subject, content, is_active, variables } = body;

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      logger.warn("Email template PUT 403: adminUser null", {
        userId: user?.id,
        templateId: params.id,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Fetch template with service role (RLS may hide inactive templates from user client)
    const dbClient = createServiceRoleClient();
    const { data: existingTemplate } = await dbClient
      .from("system_email_templates")
      .select("organization_id, is_system, type, name, subject, content, variables")
      .eq("id", params.id)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const isOnlyToggleActive =
      Object.keys(body).filter((k) => k !== "is_active").length === 0 &&
      is_active !== undefined;

    // Global admin: role in admin_users OR is_super_admin RPC (admin_branch_access.branch_id=null)
    let isGlobalAdmin =
      adminUser.role === "super_admin" ||
      adminUser.role === "root" ||
      adminUser.role === "dev";
    if (!isGlobalAdmin) {
      const { data: isSuperAdminRpc } = await supabase.rpc("is_super_admin", {
        user_id: user.id,
      });
      isGlobalAdmin = !!isSuperAdminRpc;
    }

    const canUpdate =
      isGlobalAdmin ||
      existingTemplate.organization_id === adminUser.organization_id ||
      (existingTemplate.organization_id === null &&
        !existingTemplate.is_system) ||
      (existingTemplate.organization_id === null &&
        existingTemplate.is_system &&
        adminUser.organization_id &&
        isOnlyToggleActive);

    if (!canUpdate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Org admin toggling is_active on system template: create/delete org override
    if (
      !isGlobalAdmin &&
      existingTemplate.is_system &&
      adminUser.organization_id &&
      is_active !== undefined
    ) {
      const orgId = adminUser.organization_id;
      const { data: orgOverride } = await supabase
        .from("system_email_templates")
        .select("id")
        .eq("type", existingTemplate.type)
        .eq("organization_id", orgId)
        .is("is_system", false)
        .maybeSingle();

      if (is_active === false) {
        // Disable: create org override with is_active=false (copy from system)
        if (!orgOverride) {
          const { data: created, error: insertErr } = await supabase
            .from("system_email_templates")
            .insert({
              name: existingTemplate.name,
              type: existingTemplate.type,
              subject: existingTemplate.subject,
              content: existingTemplate.content,
              variables: existingTemplate.variables ?? [],
              is_active: false,
              is_system: false,
              organization_id: orgId,
            })
            .select()
            .single();
          if (!insertErr && created) {
            return NextResponse.json({
              success: true,
              template: { ...created, _is_override: true },
            });
          }
        } else {
          const { data: updated, error: updErr } = await supabase
            .from("system_email_templates")
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq("id", orgOverride.id)
            .select()
            .single();
          if (!updErr && updated) {
            return NextResponse.json({
              success: true,
              template: { ...updated, _is_override: true },
            });
          }
        }
      } else {
        // Enable: delete org override
        if (orgOverride) {
          await supabase
            .from("system_email_templates")
            .delete()
            .eq("id", orgOverride.id);
          return NextResponse.json({
            success: true,
            template: { ...existingTemplate, is_active: true },
          });
        }
      }
    }

    // Organizations cannot update system-level templates (except is_active toggle above)
    // Global admins (root, dev, super_admin) can modify system templates
    if (!isGlobalAdmin && existingTemplate.is_system) {
      logger.warn("Email template PUT 403: cannot modify system template", {
        adminRole: adminUser.role,
        templateId: params.id,
      });
      return NextResponse.json(
        {
          error: "Cannot modify system templates. Create a custom one instead.",
        },
        { status: 403 },
      );
    }

    // Build update object
    const updateData: {
      name?: string;
      type?: string;
      subject?: string;
      content?: string;
      variables?: Record<string, unknown>;
      is_active?: boolean;
      updated_at?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) updateData.name = name;
    if (subject !== undefined) updateData.subject = subject;
    if (content !== undefined) updateData.content = content;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (variables !== undefined)
      updateData.variables = Array.isArray(variables)
        ? variables
        : JSON.parse(variables || "[]");

    // Use service role for update - auth already verified, bypasses RLS
    const { data: template, error } = await dbClient
      .from("system_email_templates")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .maybeSingle();

    if (error) {
      logger.error("Error updating email template", {
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
        templateId: params.id,
        updateData,
      });
      return NextResponse.json(
        {
          error: "Failed to update email template",
          details: error.message,
        },
        { status: 500 },
      );
    }

    if (!template) {
      return NextResponse.json(
        { error: "Template not found or update had no effect" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      template,
    });
  } catch (error) {
    logger.error("Error in update email template API", {
      error,
      templateId: params.id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id, role")
      .eq("id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check ownership and system flag
    const { data: existingTemplate } = await supabase
      .from("system_email_templates")
      .select("organization_id, is_system")
      .eq("id", params.id)
      .single();

    if (!existingTemplate) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 },
      );
    }

    const isGlobalAdminDel =
      adminUser.role === "super_admin" ||
      adminUser.role === "root" ||
      adminUser.role === "dev";
    if (
      !isGlobalAdminDel &&
      (existingTemplate.organization_id !== adminUser.organization_id ||
        existingTemplate.is_system)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase
      .from("system_email_templates")
      .delete()
      .eq("id", params.id);

    if (error) {
      logger.error("Error deleting email template", {
        error,
        templateId: params.id,
      });
      return NextResponse.json(
        {
          error: "Failed to delete email template",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (error) {
    logger.error("Error in delete email template API", {
      error,
      templateId: params.id,
    });
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
