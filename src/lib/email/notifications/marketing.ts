import { createServiceRoleClient } from "@/utils/supabase/server";

import { sendEmail } from "../client";
import { incrementTemplateUsage } from "../template-loader";
import {
  getDefaultVariables,
  replaceTemplateVariables,
} from "../template-utils";

// Send marketing email using DB template
export async function sendMarketingEmail(
  recipients: string[],
  templateId: string,
  variables: Record<string, string>,
): Promise<{
  success: boolean;
  results: Array<{
    email: string;
    success: boolean;
    id?: string;
    error?: string;
  }>;
  errors: Array<{ email: string; error: string }>;
}> {
  try {
    const supabase = createServiceRoleClient();
    const { data: template, error } = await supabase
      .from("system_email_templates")
      .select("*")
      .eq("id", templateId)
      .eq("is_active", true)
      .single();

    if (error || !template) {
      return {
        success: false,
        results: [],
        errors: recipients.map((email) => ({
          email,
          error: "Template not found",
        })),
      };
    }

    const allVariables = {
      ...getDefaultVariables(),
      ...variables,
    };

    const subject = replaceTemplateVariables(template.subject, allVariables);
    const html = replaceTemplateVariables(template.content, allVariables);

    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();

    const results: Array<{
      email: string;
      success: boolean;
      id?: string;
      error?: string;
    }> = [];
    const errors: Array<{ email: string; error: string }> = [];

    // Send emails in batches
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      const batchPromises = batch.map(async (email) => {
        try {
          const result = await sendEmail({
            to: email,
            subject,
            html,
            text,
          });
          results.push({ email, ...result });

          await new Promise((resolve) => setTimeout(resolve, 50));
        } catch (error) {
          errors.push({
            email,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      });

      await Promise.all(batchPromises);

      if (i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    if (results.some((r) => r.success)) {
      await incrementTemplateUsage(template.id);
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  } catch (error) {
    console.error("Error sending marketing email:", error);
    return {
      success: false,
      results: [],
      errors: recipients.map((email) => ({
        email,
        error: error instanceof Error ? error.message : "Unknown error",
      })),
    };
  }
}
