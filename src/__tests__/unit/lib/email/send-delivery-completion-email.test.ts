/**
 * Unit tests for sendDeliveryCompletionEmail (send-delivery-completion-email.ts)
 *
 * Tests delivery completion notification with mocked Supabase, template loader,
 * and email client.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/utils/supabase/server", () => ({
  createServiceRoleClient: vi.fn(),
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  appLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/email/layout", () => ({
  wrapInModernLayout: vi.fn((content: string) => `<layout>${content}</layout>`),
}));

vi.mock("@/lib/email/org-utils", () => ({
  getOrganizationInfoWithFallbacks: vi.fn(),
}));

vi.mock("@/lib/email/template-loader", () => ({
  loadEmailTemplate: vi.fn(),
  incrementTemplateUsage: vi.fn(),
}));

vi.mock("@/lib/email/template-utils", () => ({
  getDefaultVariables: vi.fn(),
  replaceTemplateVariables: vi.fn(
    (template: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce(
        (t, [k, v]) => t.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v)),
        template,
      ),
  ),
}));

import { sendEmail } from "@/lib/email/client";
import { getOrganizationInfoWithFallbacks } from "@/lib/email/org-utils";
import { sendDeliveryCompletionEmail } from "@/lib/email/send-delivery-completion-email";
import {
  incrementTemplateUsage,
  loadEmailTemplate,
} from "@/lib/email/template-loader";
import { getDefaultVariables, replaceTemplateVariables } from "@/lib/email/template-utils";
import { appLogger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

const ORG_ID = "org-1";
const CUSTOMER_ID = "cust-1";
const WORK_ORDER_ID = "wo-1";
const DEFAULT_PARAMS = {
  workOrderId: WORK_ORDER_ID,
  organizationId: ORG_ID,
  customerId: CUSTOMER_ID,
  customerEmail: "cliente@test.cl",
  customerName: "Juan Pérez",
  workOrderNumber: "WO-001",
};

function mockSupabase(options: {
  surveyValue?: unknown;
  surveyConfigError?: object | null;
  insertError?: object | null;
}) {
  const maybeSingle = vi
    .fn()
    .mockResolvedValue(
      options.surveyValue !== undefined
        ? { data: { config_value: options.surveyValue }, error: options.surveyConfigError ?? null }
        : { data: null, error: options.surveyConfigError ?? null },
    );

  const insertFn = vi
    .fn()
    .mockResolvedValue({ error: options.insertError ?? null });

  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "system_config") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          is: vi.fn().mockReturnThis(),
          maybeSingle,
        };
      }
      if (table === "survey_invitations") {
        return { insert: insertFn };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), maybeSingle: vi.fn() };
    }),
  } as unknown as ReturnType<typeof createServiceRoleClient>);

  return { maybeSingle, insertFn };
}

function mockSuccessDependencies() {
  vi.mocked(loadEmailTemplate).mockResolvedValue({
    id: "tmpl-1",
    name: "Work Order Delivered",
    type: "work_order_delivered",
    subject: "{{work_order_number}} entregado",
    content: "<p>Gracias {{customer_name}}</p>",
    variables: ["customer_name", "work_order_number"],
    is_active: true,
  });

  vi.mocked(getOrganizationInfoWithFallbacks).mockResolvedValue({
    name: "Mi Óptica",
    metadata: { primary_color: "#8B5A3C" },
    resolvedSupportEmail: "soporte@mioptica.cl",
    resolvedDisplayName: "Mi Óptica",
  });

  vi.mocked(getDefaultVariables).mockReturnValue({
    organization_name: "Mi Óptica",
    organization_email: "soporte@mioptica.cl",
    organization_support_email: "soporte@mioptica.cl",
    website_url: "https://opttius.cl",
    support_email: "soporte@mioptica.cl",
    login_url: "https://opttius.cl/login",
    contact_email: "soporte@mioptica.cl",
  });

  vi.mocked(replaceTemplateVariables).mockImplementation(
    (template: string, vars: Record<string, string>) =>
      Object.entries(vars).reduce(
        (t, [k, v]) => t.replace(new RegExp(`{{\\s*${k}\\s*}}`, "g"), String(v)),
        template,
      ),
  );

  vi.mocked(sendEmail).mockResolvedValue({ success: true, id: "email_123" });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendDeliveryCompletionEmail", () => {
  it("sends delivery completion email with survey link", async () => {
    mockSupabase({ surveyValue: true });
    mockSuccessDependencies();

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "cliente@test.cl",
        subject: "WO-001 entregado",
      }),
    );
    expect(incrementTemplateUsage).toHaveBeenCalledWith("tmpl-1");
  });

  it("skips when customer email is missing", async () => {
    const result = await sendDeliveryCompletionEmail({
      ...DEFAULT_PARAMS,
      customerEmail: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("No customer email");
    expect(appLogger.warn).toHaveBeenCalled();
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("skips when survey is disabled for org", async () => {
    mockSupabase({ surveyValue: false });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey disabled for org");
  });

  it("skips when survey config is missing (null)", async () => {
    mockSupabase({});

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey disabled for org");
  });

  it("handles db error on survey config lookup", async () => {
    mockSupabase({ surveyConfigError: { message: "DB error" } });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey disabled for org");
  });

  it("returns error when survey invitation insert fails", async () => {
    mockSupabase({ surveyValue: true, insertError: { message: "FK violation" } });
    mockSuccessDependencies();

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Failed to create survey invitation");
  });

  it("returns error when email template is not found", async () => {
    mockSupabase({ surveyValue: true });
    vi.mocked(loadEmailTemplate).mockResolvedValue(null);
    vi.mocked(sendEmail).mockResolvedValue({ success: true, id: "email_123" });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Template not found");
  });

  it("returns error when sendEmail fails", async () => {
    mockSupabase({ surveyValue: true });
    mockSuccessDependencies();
    vi.mocked(sendEmail).mockResolvedValue({
      success: false,
      error: "Send error",
    });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Send error");
  });

  it("does not increment template usage when send fails", async () => {
    mockSupabase({ surveyValue: true });
    mockSuccessDependencies();
    vi.mocked(sendEmail).mockResolvedValue({
      success: false,
      error: "Send error",
    });

    await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(incrementTemplateUsage).not.toHaveBeenCalled();
  });

  it("handles null org info gracefully", async () => {
    mockSupabase({ surveyValue: true });
    vi.mocked(loadEmailTemplate).mockResolvedValue({
      id: "tmpl-1",
      name: "Work Order Delivered",
      type: "work_order_delivered",
      subject: "Entregado",
      content: "<p>Gracias</p>",
      variables: [],
      is_active: true,
    });
    vi.mocked(getOrganizationInfoWithFallbacks).mockResolvedValue(null);
    vi.mocked(getDefaultVariables).mockReturnValue({
      organization_name: "Opttius",
      organization_email: "contacto@opttius.cl",
      organization_support_email: "soporte@opttius.cl",
      website_url: "https://opttius.cl",
      support_email: "soporte@opttius.cl",
      login_url: "https://opttius.cl/login",
      contact_email: "contacto@opttius.cl",
    });
    vi.mocked(sendEmail).mockResolvedValue({ success: true, id: "email_456" });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(true);
  });

  it("catches unexpected errors and returns failure", async () => {
    vi.mocked(createServiceRoleClient).mockImplementation(() => {
      throw new Error("Unexpected crash");
    });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unexpected crash");
  });

  it("passes display name and reply-to from org info", async () => {
    mockSupabase({ surveyValue: true });
    mockSuccessDependencies();

    await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        replyTo: "soporte@mioptica.cl",
        fromDisplayName: "Mi Óptica",
      }),
    );
  });

  it("parses survey_enabled from string config value", async () => {
    mockSupabase({ surveyValue: "true" });
    mockSuccessDependencies();

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(true);
  });

  it("treats invalid survey config json as disabled", async () => {
    mockSupabase({ surveyValue: "not-json" });

    const result = await sendDeliveryCompletionEmail(DEFAULT_PARAMS);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Survey disabled for org");
  });
});
