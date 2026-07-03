/**
 * Unit tests for sendQuoteEmailToClient (send-quote-email.ts)
 *
 * Tests quote email sending with mocked Supabase and email client.
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

import { sendEmail } from "@/lib/email/client";
import { createServiceRoleClient } from "@/utils/supabase/server";
import { sendQuoteEmailToClient } from "@/lib/email/send-quote-email";

const ORG_ID = "org-1";
const QUOTE_ID = "quote-1";
const CUSTOMER_EMAIL = "cliente@test.cl";

function mockQuoteChain(
  overrides: Partial<{
    quoteData: Record<string, unknown> | null;
    quoteError: object | null;
    customerData: Record<string, unknown> | null;
    prescriptionData: Record<string, unknown> | null;
    updateResponse: { error: object | null };
    sendEmailResult: { success: boolean; id?: string; error?: string };
  }>,
) {
  const sendEmailResult = overrides.sendEmailResult ?? {
    success: true,
    id: "email_123",
  };

  const quoteSingle = vi
    .fn()
    .mockResolvedValue({
      data: overrides.quoteData ?? null,
      error: overrides.quoteError ?? null,
    });

  const customerSingle = vi
    .fn()
    .mockResolvedValue({
      data: overrides.customerData ?? null,
      error: null,
    });

  const prescriptionSingle = vi
    .fn()
    .mockResolvedValue({
      data: overrides.prescriptionData ?? null,
      error: null,
    });

  const updateEqFn = vi
    .fn()
    .mockResolvedValue(overrides.updateResponse ?? { error: null });
  const updateFn = vi.fn().mockReturnValue({ eq: updateEqFn });

  const eqFn = vi.fn().mockReturnThis();
  const selectFn = vi.fn().mockReturnThis();

  vi.mocked(createServiceRoleClient).mockReturnValue({
    from: vi.fn((table: string) => {
      if (table === "quotes") {
        return {
          select: selectFn,
          eq: eqFn,
          single: quoteSingle,
          update: updateFn,
        };
      }
      if (table === "customers") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: customerSingle,
        };
      }
      if (table === "prescriptions") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: prescriptionSingle,
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn() };
    }),
  } as unknown as ReturnType<typeof createServiceRoleClient>);

  vi.mocked(sendEmail).mockResolvedValue(sendEmailResult);

  return { eqFn, selectFn, updateFn, quoteSingle, customerSingle, prescriptionSingle };
}

const defaultQuote = {
  id: QUOTE_ID,
  organization_id: ORG_ID,
  quote_number: "Q-001",
  quote_date: "2025-06-15",
  expiration_date: "2025-07-15",
  customer_id: "cust-1",
  prescription_id: "presc-1",
  frame_name: "Ray-Ban",
  frame_brand: "Ray-Ban",
  frame_price: 150000,
  frame_cost: 80000,
  lens_type: "Monofocal",
  lens_cost: 50000,
  treatments_cost: 15000,
  labor_cost: 10000,
  subtotal: 155000,
  discount_percentage: 0,
  discount_amount: 0,
  tax_amount: 29450,
  total_amount: 184450,
  currency: "CLP",
  lens_treatments: ["Antireflex", "Fotocromático"],
  customer_notes: "Gracias por su preferencia",
  status: "draft",
};

const defaultCustomer = {
  id: "cust-1",
  first_name: "Juan",
  last_name: "Pérez",
  email: "cliente@test.cl",
  phone: "+56912345678",
  preferred_contact_method: "email",
};

const defaultPrescription = {
  id: "presc-1",
  right_sphere: "-2.00",
  left_sphere: "-1.50",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("sendQuoteEmailToClient", () => {
  it("sends quote email and updates status to sent", async () => {
    mockQuoteChain({
      quoteData: defaultQuote,
      customerData: defaultCustomer,
      prescriptionData: defaultPrescription,
    });

    const result = await sendQuoteEmailToClient(QUOTE_ID, CUSTOMER_EMAIL, {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(result.emailId).toBe("email_123");
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: CUSTOMER_EMAIL,
        subject: expect.stringContaining("Q-001"),
      }),
    );
  });

  it("returns error for invalid email", async () => {
    const result = await sendQuoteEmailToClient(QUOTE_ID, "invalid", {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Email válido requerido");
    expect(createServiceRoleClient).not.toHaveBeenCalled();
  });

  it("returns error when quote is not found", async () => {
    mockQuoteChain({
      quoteData: null,
      quoteError: { message: "Not found" },
    });

    const result = await sendQuoteEmailToClient(QUOTE_ID, CUSTOMER_EMAIL, {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Presupuesto no encontrado");
  });

  it("returns error when sendEmail fails", async () => {
    mockQuoteChain({
      quoteData: defaultQuote,
      customerData: defaultCustomer,
      sendEmailResult: { success: false, error: "Resend API error" },
    });

    const result = await sendQuoteEmailToClient(QUOTE_ID, CUSTOMER_EMAIL, {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Resend API error");
  });

  it("handles quote without customer_id", async () => {
    mockQuoteChain({
      quoteData: { ...defaultQuote, customer_id: null, prescription_id: null },
    });

    const result = await sendQuoteEmailToClient(QUOTE_ID, CUSTOMER_EMAIL, {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(true);
  });

  it("handles quote without prescription_id", async () => {
    mockQuoteChain({
      quoteData: { ...defaultQuote, prescription_id: null },
      customerData: defaultCustomer,
    });

    const result = await sendQuoteEmailToClient(QUOTE_ID, CUSTOMER_EMAIL, {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(true);
  });

  it("displays 'Cliente' when customer has no name", async () => {
    mockQuoteChain({
      quoteData: defaultQuote,
      customerData: { id: "cust-1", first_name: null, last_name: null, email: null, phone: null, preferred_contact_method: null },
    });

    const result = await sendQuoteEmailToClient(QUOTE_ID, CUSTOMER_EMAIL, {
      organizationId: ORG_ID,
    });

    expect(result.success).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining("Cliente"),
      }),
    );
  });
});
