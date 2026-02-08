import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import { requireRoot } from "@/lib/api/root-middleware";
import { AuthorizationError } from "@/lib/api/errors";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import {
  handlePost,
  handleGet,
  validateRequestBody,
  successResponse,
} from "@/lib/middleware/error-handler";
import {
  ValidationError,
  mapPostgresError,
} from "@/lib/errors/comprehensive-handler";

export const GET = handleGet(
  async (request, { requestId }) => {
    // Require root or dev role for SaaS management
    await requireRoot(request);

    const supabase = await createClient();

    // Fetch SaaS-level templates
    const { data: templates, error } = await supabase
      .from("system_email_templates")
      .select("*")
      .eq("category", "saas")
      .order("type", { ascending: true });

    if (error) {
      throw mapPostgresError(error);
    }

    logger.info("SaaS email templates fetched successfully", {
      requestId,
      templateCount: templates?.length || 0,
    });

    return successResponse(templates || [], {
      message: "Email templates retrieved successfully",
    });
  },
  {
    requireAuth: true,
    requireAdmin: true,
    allowedRoles: ["root", "dev"],
  },
);

export const POST = handlePost(
  async (request, { requestId }) => {
    // Require root or dev role for SaaS management
    const { userId } = await requireRoot(request);

    // Validate and parse request body
    const body = await validateRequestBody(request, (data) => {
      const requiredFields = ["name", "type", "subject", "content"];
      const missingFields = requiredFields.filter((field) => !data[field]);

      if (missingFields.length > 0) {
        throw new ValidationError("Missing required fields", {
          missingFields,
        });
      }

      return {
        name: data.name,
        type: data.type,
        subject: data.subject,
        content: data.content,
        variables: Array.isArray(data.variables) ? data.variables : [],
        is_active:
          data.is_active !== undefined ? Boolean(data.is_active) : true,
      };
    });

    const supabase = await createClient();

    // Create the SaaS template
    const { data: template, error: templateError } = await supabase
      .from("system_email_templates")
      .insert({
        name: body.name,
        type: body.type,
        subject: body.subject,
        content: body.content,
        variables: JSON.stringify(body.variables),
        is_active: body.is_active,
        is_system: false,
        category: "saas",
        created_by: userId,
      })
      .select()
      .single();

    if (templateError) {
      throw mapPostgresError(templateError);
    }

    logger.info("SaaS email template created successfully", {
      requestId,
      templateId: template.id,
      templateName: template.name,
      createdBy: userId,
    });

    return successResponse(template, {
      message: "Email template created successfully",
    });
  },
  {
    requireAuth: true,
    requireAdmin: true,
    allowedRoles: ["root", "dev"],
  },
);
