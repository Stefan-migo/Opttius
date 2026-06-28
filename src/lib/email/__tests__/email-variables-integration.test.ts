/**
 * Integration tests for email template variables
 * Verifies that each send function produces correct variables from input data
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture variables passed to replaceTemplateVariables
let capturedVariables: Record<string, string | number | null | undefined>[] =
  [];

// Mock template-utils to capture variables
vi.mock("@/lib/email/template-utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/email/template-utils")>();
  return {
    ...actual,
    replaceTemplateVariables: vi.fn(
      (
        template: string,
        variables: Record<string, string | number | null | undefined>,
      ) => {
        capturedVariables.push({ ...variables });
        return actual.replaceTemplateVariables(template, variables);
      },
    ),
  };
});

// Mock template-loader
vi.mock("@/lib/email/template-loader", () => ({
  loadEmailTemplate: vi.fn().mockResolvedValue({
    id: "test-template-id",
    subject: "Test {{customer_name}}",
    content: "<p>Test {{order_number}}</p>",
  }),
  incrementTemplateUsage: vi.fn().mockResolvedValue(undefined),
}));

// Mock org-utils
vi.mock("@/lib/email/org-utils", () => ({
  getOrganizationInfoWithFallbacks: vi.fn().mockResolvedValue({
    name: "Óptica Test",
    metadata: { primary_color: "#1e40af" },
    resolvedSupportEmail: "soporte@test.cl",
    resolvedDisplayName: "Óptica Test",
  }),
}));

// Mock sendEmail
vi.mock("@/lib/email/client", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock layout (dynamic import)
vi.mock("@/lib/email/layout", () => ({
  wrapInModernLayout: vi.fn((html: string) => html),
}));

describe("EmailNotificationService - variable correctness", () => {
  beforeEach(() => {
    capturedVariables = [];
    vi.clearAllMocks();
  });

  describe("sendOrderConfirmation", () => {
    it("passes correct variables from order data", async () => {
      const { sendOrderConfirmation } = await import(
        "@/lib/email/notifications"
      );

      const order = {
        id: "ord-1",
        order_number: "ORD-2025-001",
        user_email: "cliente@test.com",
        customer_name: "Juan Pérez",
        items: [
          {
            id: "i1",
            name: "Lente",
            quantity: 1,
            price: 50000,
            variant_title: "Blue",
          },
        ],
        total_amount: 50000,
        currency: "CLP",
        payment_method: "cash",
        status: "delivered",
        created_at: "2025-02-20T10:00:00Z",
        organization_id: "org-1",
      };

      const result = await sendOrderConfirmation(order);
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.customer_name).toBe("Juan Pérez");
      expect(vars.order_number).toBe("ORD-2025-001");
      expect(vars.order_total).toContain("50"); // CLP formatted
      expect(vars.order_items).toContain("Lente");
      expect(vars.order_items_text).toContain("Lente");
      expect(vars.payment_method).toBe("Efectivo");
      expect(vars.organization_name).toBe("Óptica Test");
      expect(vars.support_email).toBe("soporte@test.cl");
    });
  });

  describe("sendLowStockAlert", () => {
    it("passes correct variables for low stock products", async () => {
      const { sendLowStockAlert } = await import(
        "@/lib/email/notifications"
      );

      const products = [
        { name: "Lente A", current_stock: 2, min_stock: 5 },
        { name: "Marco B", current_stock: 0, min_stock: 3 },
      ];

      const result = await sendLowStockAlert(
        ["admin@test.com"],
        products,
        "org-1",
      );
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.low_stock_products).toContain("Lente A");
      expect(vars.low_stock_products).toContain("Marco B");
      expect(vars.low_stock_products_text).toContain("Lente A");
      expect(vars.product_count).toBe("2");
      expect(vars.organization_name).toBe("Óptica Test");
    });
  });

  describe("sendPaymentSuccess", () => {
    it("passes correct variables including transaction_id", async () => {
      const { sendPaymentSuccess } = await import(
        "@/lib/email/notifications"
      );

      const order = {
        id: "ord-2",
        order_number: "ORD-2025-002",
        user_email: "pago@test.com",
        customer_name: "María López",
        items: [],
        total_amount: 120000,
        currency: "CLP",
        payment_method: "credit_card",
        status: "paid",
        created_at: "2025-02-20T12:00:00Z",
        organization_id: "org-1",
      };

      const result = await sendPaymentSuccess(
        order,
        "MP-TXN-12345",
      );
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.transaction_id).toBe("MP-TXN-12345");
      expect(vars.amount).toBeDefined();
      expect(vars.payment_method).toBe("Tarjeta de Crédito");
    });
  });

  describe("sendPasswordReset", () => {
    it("passes reset_link and reset_url", async () => {
      const { sendPasswordReset } = await import(
        "@/lib/email/notifications"
      );

      const result = await sendPasswordReset(
        "user@test.com",
        "https://app.test/reset?token=abc123",
        "Usuario Test",
      );
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.reset_link).toBe("https://app.test/reset?token=abc123");
      expect(vars.reset_url).toBe("https://app.test/reset?token=abc123");
      expect(vars.customer_name).toBe("Usuario Test");
    });
  });

  describe("sendMembershipWelcome", () => {
    it("passes membership_tier, access_url, membership_start_date", async () => {
      const { sendMembershipWelcome } = await import(
        "@/lib/email/notifications"
      );

      const result = await sendMembershipWelcome(
        "Cliente",
        "cliente@test.com",
        "Plan Premium",
        "https://app.test/acceso",
        "15 de febrero de 2025",
      );
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.membership_tier).toBe("Plan Premium");
      expect(vars.access_url).toBe("https://app.test/acceso");
      expect(vars.membership_start_date).toBe("15 de febrero de 2025");
    });
  });

  describe("sendMembershipReminder", () => {
    it("passes days_remaining and renewal_url", async () => {
      const { sendMembershipReminder } = await import(
        "@/lib/email/notifications"
      );

      const result = await sendMembershipReminder(
        "Cliente",
        "cliente@test.com",
        "Plan Básico",
        7,
      );
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.days_remaining).toBe("7");
      expect(vars.renewal_url).toContain("membresias");
    });
  });
});

describe("optica send functions - variable correctness", () => {
  beforeEach(() => {
    capturedVariables = [];
    vi.clearAllMocks();
  });

  describe("sendAppointmentConfirmation", () => {
    it("passes correct appointment variables", async () => {
      const { sendAppointmentConfirmation } = await import(
        "@/lib/email/templates/optica"
      );

      const appointment = {
        id: "apt-1",
        customer_name: "Carlos Ruiz",
        customer_first_name: "Carlos",
        customer_email: "carlos@test.com",
        date: "25 de febrero de 2025",
        time: "10:00",
        professional_name: "Dr. García",
        branch_name: "Sucursal Centro",
        branch_phone: "+56912345678",
      };

      const result = await sendAppointmentConfirmation(appointment, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.customer_name).toBe("Carlos Ruiz");
      expect(vars.customer_first_name).toBe("Carlos");
      expect(vars.appointment_date).toBe("25 de febrero de 2025");
      expect(vars.appointment_time).toBe("10:00");
      expect(vars.professional_name).toBe("Dr. García");
      expect(vars.branch_name).toBe("Sucursal Centro");
      expect(vars.branch_phone).toBe("+56912345678");
    });
  });

  describe("sendAppointmentRescheduled", () => {
    it("passes old and new appointment dates", async () => {
      const { sendAppointmentRescheduled } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "apt-1",
        customer_name: "Ana",
        customer_first_name: "Ana",
        customer_email: "ana@test.com",
        old_date: "20 de febrero",
        old_time: "09:00",
        date: "25 de febrero",
        time: "14:00",
        branch_name: "Centro",
        branch_phone: "+56911111111",
      };

      const result = await sendAppointmentRescheduled(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.old_appointment_date).toBe("20 de febrero");
      expect(vars.old_appointment_time).toBe("09:00");
      expect(vars.appointment_date).toBe("25 de febrero");
      expect(vars.appointment_time).toBe("14:00");
    });
  });

  describe("sendAppointmentFollowUpReminder", () => {
    it("passes follow_up_date", async () => {
      const { sendAppointmentFollowUpReminder } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "apt-2",
        customer_name: "Pedro",
        customer_first_name: "Pedro",
        customer_email: "pedro@test.com",
        follow_up_date: "2025-03-15T12:00:00Z",
        branch_name: "Providencia",
        branch_phone: "+56922222222",
      };

      const result = await sendAppointmentFollowUpReminder(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.follow_up_date).toMatch(/\d+ de \w+ de \d+/); // Formatted by toLocaleDateString (es-AR)
    });
  });

  describe("sendPrescriptionExpiring", () => {
    it("passes prescription_expiry_date", async () => {
      const { sendPrescriptionExpiring } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "rx-1",
        customer_name: "Luis",
        customer_first_name: "Luis",
        customer_email: "luis@test.com",
        prescription_number: "RX-001",
        date: "2024-03-15",
        expiry_date: "15 de marzo de 2025",
        branch_name: "Las Condes",
        branch_phone: "+56933333333",
      };

      const result = await sendPrescriptionExpiring(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.prescription_expiry_date).toBe("15 de marzo de 2025");
      expect(vars.prescription_number).toBe("RX-001");
    });
  });

  describe("sendAppointmentCancellation", () => {
    it("passes appointment_date, branch_name, booking_url", async () => {
      const { sendAppointmentCancellation } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "apt-3",
        customer_name: "Rosa",
        customer_first_name: "Rosa",
        customer_email: "rosa@test.com",
        date: "28 de febrero",
        time: "11:00",
        branch_name: "Ñuñoa",
        branch_phone: "+56944444444",
        reschedule_url: "https://app.test/reagendar",
      };

      const result = await sendAppointmentCancellation(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.appointment_date).toBe("28 de febrero");
      expect(vars.appointment_time).toBe("11:00");
      expect(vars.branch_name).toBe("Ñuñoa");
      expect(vars.booking_url).toBe("https://app.test/reagendar");
    });
  });

  describe("sendAppointmentReminder2h", () => {
    it("passes appointment_time, professional_name, branch_name", async () => {
      const { sendAppointmentReminder2h } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "apt-4",
        customer_name: "Diego",
        customer_first_name: "Diego",
        customer_email: "diego@test.com",
        date: "1 de marzo de 2025",
        time: "15:30",
        professional_name: "Dr. Soto",
        branch_name: "Vitacura",
        branch_phone: "+56955555555",
      };

      const result = await sendAppointmentReminder2h(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      // Note: appointment_reminder_2h template uses appointment_time only (no appointment_date)
      expect(vars.appointment_time).toBe("15:30");
      expect(vars.professional_name).toBe("Dr. Soto");
      expect(vars.branch_name).toBe("Vitacura");
    });
  });

  describe("sendWorkOrderReady", () => {
    it("passes work_order_number, delivery_date, product_type", async () => {
      const { sendWorkOrderReady } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "wo-1",
        customer_name: "Elena",
        customer_first_name: "Elena",
        customer_email: "elena@test.com",
        work_order_number: "OT-2025-042",
        date: "20 de febrero",
        delivery_date: "25 de febrero",
        estimated_delivery_date: "24 de febrero",
        product_type: "Lentes oftálmicos",
        product_description: "Lente progresivo",
        price: "$150.000",
        branch_name: "Providencia",
        branch_phone: "+56966666666",
      };

      const result = await sendWorkOrderReady(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.work_order_number).toBe("OT-2025-042");
      expect(vars.work_order_date).toBe("20 de febrero");
      expect(vars.delivery_date).toBe("25 de febrero");
      expect(vars.product_type).toBe("Lentes oftálmicos");
      expect(vars.price).toBe("$150.000");
    });
  });

  describe("sendQuoteSent", () => {
    it("passes quote_number, total, quote_url", async () => {
      const { sendQuoteSent } = await import("@/lib/email/templates/optica");

      const data = {
        id: "q-1",
        customer_name: "Fernando",
        customer_first_name: "Fernando",
        customer_email: "fernando@test.com",
        quote_number: "COT-2025-010",
        date: "22 de febrero",
        expiry_date: "24 de marzo",
        valid_days: 30,
        items: [
          { description: "Lente monofocal", amount: "$80.000" },
          { description: "Armazón", amount: "$45.000" },
        ],
        subtotal: "$125.000",
        total: "$125.000",
        quote_url: "https://app.test/cotizacion/1",
        branch_name: "Las Condes",
      };

      const result = await sendQuoteSent(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.quote_number).toBe("COT-2025-010");
      expect(vars.quote_date).toBe("22 de febrero");
      expect(vars.quote_expiry_date).toBe("24 de marzo");
      expect(vars.total).toBe("$125.000");
      expect(vars.quote_url).toBe("https://app.test/cotizacion/1");
      expect(vars.items_table).toContain("Lente monofocal");
    });
  });

  describe("sendQuoteExpiring", () => {
    it("passes quote_number, quote_expiry_date, accept_url", async () => {
      const { sendQuoteExpiring } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "q-2",
        customer_name: "Gloria",
        customer_first_name: "Gloria",
        customer_email: "gloria@test.com",
        quote_number: "COT-2025-011",
        date: "18 de febrero",
        expiry_date: "25 de febrero",
        total: "$90.000",
        accept_url: "https://app.test/aceptar/2",
        quote_url: "https://app.test/cotizacion/2",
        branch_phone: "+56977777777",
      };

      const result = await sendQuoteExpiring(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.quote_number).toBe("COT-2025-011");
      expect(vars.quote_expiry_date).toBe("25 de febrero");
      expect(vars.total).toBe("$90.000");
      expect(vars.accept_url).toBe("https://app.test/aceptar/2");
    });
  });

  describe("sendAccountWelcomeEmail", () => {
    it("passes customer_name, dashboard_url", async () => {
      const { sendAccountWelcomeEmail } = await import(
        "@/lib/email/templates/optica"
      );

      const data = {
        id: "c-1",
        name: "Héctor Morales",
        first_name: "Héctor",
        email: "hector@test.com",
        dashboard_url: "https://app.test/mi-cuenta",
      };

      const result = await sendAccountWelcomeEmail(data, "org-1");
      expect(result.success).toBe(true);

      const vars = capturedVariables[capturedVariables.length - 1];
      expect(vars.customer_name).toBe("Héctor Morales");
      expect(vars.customer_first_name).toBe("Héctor");
      expect(vars.dashboard_url).toBe("https://app.test/mi-cuenta");
    });
  });
});
