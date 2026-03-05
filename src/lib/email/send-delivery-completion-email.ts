/**
 * Sends delivery completion email with satisfaction survey link when a work order
 * is marked as delivered. Creates survey invitation token and sends work_order_delivered
 * template if survey is enabled for the organization.
 */

import { randomUUID } from "crypto";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendEmail } from "./client";
import { loadEmailTemplate, incrementTemplateUsage } from "./template-loader";
import {
  replaceTemplateVariables,
  getDefaultVariables,
} from "./template-utils";
import { getOrganizationInfoWithFallbacks } from "./org-utils";
import { wrapInModernLayout } from "./layout";
import { appLogger as logger } from "@/lib/logger";

function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\n\s*\n/g, "\n")
    .trim();
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export interface DeliveryCompletionParams {
  workOrderId: string;
  organizationId: string;
  customerId: string | null;
  customerEmail: string;
  customerName: string;
  workOrderNumber: string;
}

/**
 * Sends delivery completion email with survey link when survey is enabled.
 * Non-blocking: logs errors but does not throw.
 */
export async function sendDeliveryCompletionEmail(
  params: DeliveryCompletionParams,
): Promise<{ success: boolean; error?: string }> {
  try {
    const {
      workOrderId,
      organizationId,
      customerId,
      customerEmail,
      customerName,
      workOrderNumber,
    } = params;

    if (!customerEmail?.trim()) {
      logger.warn("Delivery completion email skipped: no customer email", {
        workOrderId,
        organizationId,
      });
      return { success: false, error: "No customer email" };
    }

    const supabase = createServiceRoleClient();

    // Check survey_enabled for org
    const { data: surveyConfig } = await supabase
      .from("system_config")
      .select("config_value")
      .eq("config_key", "survey_enabled")
      .eq("organization_id", organizationId)
      .is("branch_id", null)
      .maybeSingle();

    let surveyEnabled = false;
    if (surveyConfig?.config_value != null) {
      try {
        const val =
          typeof surveyConfig.config_value === "string"
            ? JSON.parse(surveyConfig.config_value)
            : surveyConfig.config_value;
        surveyEnabled = !!val;
      } catch {
        surveyEnabled = false;
      }
    }

    if (!surveyEnabled) {
      logger.warn(
        "Delivery completion email skipped: survey disabled for org",
        {
          workOrderId,
          organizationId,
        },
      );
      return { success: false, error: "Survey disabled for org" };
    }

    // Create survey invitation
    const token = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error: invError } = await supabase
      .from("survey_invitations")
      .insert({
        token,
        organization_id: organizationId,
        work_order_id: workOrderId,
        customer_id: customerId,
        expires_at: expiresAt.toISOString(),
      });

    if (invError) {
      logger.error(
        "Delivery completion email skipped: failed to create survey invitation",
        {
          workOrderId,
          organizationId,
          error: invError,
        },
      );
      return { success: false, error: "Failed to create survey invitation" };
    }

    const surveyUrl = `${BASE_URL}/encuesta/${token}`;

    // Load template and send
    const template = await loadEmailTemplate(
      "work_order_delivered",
      true,
      organizationId,
    );

    if (!template) {
      logger.warn(
        "No active work_order_delivered template found, skipping delivery email",
      );
      return { success: false, error: "Template not found" };
    }

    const orgInfo = await getOrganizationInfoWithFallbacks(organizationId);
    const variables = {
      ...getDefaultVariables({
        name: orgInfo?.name ?? undefined,
        support_email: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      }),
      customer_name: customerName || "Cliente",
      work_order_number: workOrderNumber,
      organization_name: orgInfo?.name || "Nuestra Óptica",
      survey_url: surveyUrl,
    };

    const subject = replaceTemplateVariables(template.subject, variables);
    let html = replaceTemplateVariables(template.content, variables);
    html = wrapInModernLayout(html, {
      organizationName: orgInfo?.name || "Nuestra Óptica",
      organizationColor:
        (orgInfo?.metadata as { primary_color?: string })?.primary_color ||
        "#1e40af",
      previewText: `Gracias por confiar en ${orgInfo?.name || "nosotros"}`,
    });

    const text = htmlToText(html);

    const result = await sendEmail({
      to: customerEmail,
      subject,
      html,
      text,
      replyTo: orgInfo?.resolvedSupportEmail || "contacto@opttius.cl",
      fromDisplayName: orgInfo?.resolvedDisplayName,
    });

    if (result.success) {
      await incrementTemplateUsage(template.id);
    }

    return result;
  } catch (error) {
    logger.error("Error sending delivery completion email", {
      workOrderId: params.workOrderId,
      organizationId: params.organizationId,
      error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
