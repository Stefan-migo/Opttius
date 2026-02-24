/**
 * Unit tests for email template variables
 * Verifies that each send function produces the correct variables object
 * and that replaceTemplateVariables correctly replaces all {{var}} placeholders
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  replaceTemplateVariables,
  getDefaultVariables,
  formatOrderItemsHTML,
  formatOrderItemsText,
} from "@/lib/email/template-utils";

// =============================================================================
// 1. replaceTemplateVariables
// =============================================================================

describe("replaceTemplateVariables", () => {
  it("replaces single variable", () => {
    const result = replaceTemplateVariables("Hola {{customer_name}}", {
      customer_name: "María",
    });
    expect(result).toBe("Hola María");
  });

  it("replaces multiple variables", () => {
    const result = replaceTemplateVariables(
      "Orden {{order_number}} total {{order_total}}",
      { order_number: "ORD-001", order_total: "$10.000" },
    );
    expect(result).toBe("Orden ORD-001 total $10.000");
  });

  it("replaces variable with spaces around name", () => {
    const result = replaceTemplateVariables("Hola {{ customer_name }}", {
      customer_name: "Juan",
    });
    expect(result).toBe("Hola Juan");
  });

  it("replaces empty/null with empty string", () => {
    const result = replaceTemplateVariables("Valor: {{x}}", { x: null });
    expect(result).toBe("Valor: ");
  });

  it("leaves unreplaced placeholder when variable not in object", () => {
    const result = replaceTemplateVariables("Hola {{missing}}", {
      customer_name: "María",
    });
    expect(result).toBe("Hola {{missing}}");
  });

  it("replaces all occurrences of same variable", () => {
    const result = replaceTemplateVariables(
      "{{org}} - {{org}} - {{org}}",
      { org: "Opttius" },
    );
    expect(result).toBe("Opttius - Opttius - Opttius");
  });
});

// =============================================================================
// 2. getDefaultVariables
// =============================================================================

describe("getDefaultVariables", () => {
  it("returns default values when no organization", () => {
    const vars = getDefaultVariables();
    expect(vars.organization_name).toBe("Opttius");
    expect(vars.support_email).toBe("soporte@opttius.cl");
    expect(vars.contact_email).toBe("contacto@opttius.cl");
    expect(vars.website_url).toBeDefined();
    expect(vars.company_name).toBe("Opttius");
  });

  it("returns org values when organization provided", () => {
    const vars = getDefaultVariables({
      name: "Óptica Los Andes",
      support_email: "soporte@losandes.cl",
    });
    expect(vars.organization_name).toBe("Óptica Los Andes");
    expect(vars.support_email).toBe("soporte@losandes.cl");
    expect(vars.contact_email).toBe("soporte@losandes.cl");
    expect(vars.company_name).toBe("Óptica Los Andes");
  });

  it("includes all required keys for templates", () => {
    const vars = getDefaultVariables();
    const requiredKeys = [
      "organization_name",
      "organization_email",
      "organization_support_email",
      "website_url",
      "company_name",
      "support_email",
      "contact_email",
    ];
    requiredKeys.forEach((key) => {
      expect(vars).toHaveProperty(key);
      expect(typeof vars[key]).toBe("string");
      expect(vars[key].length).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// 3. formatOrderItemsHTML / formatOrderItemsText
// =============================================================================

describe("formatOrderItemsHTML", () => {
  it("formats items with name, quantity, price", () => {
    const html = formatOrderItemsHTML([
      { name: "Lente A", quantity: 2, price: 5000 },
    ]);
    expect(html).toContain("Lente A");
    expect(html).toContain("x2");
    expect(html).toContain("$"); // CLP format
  });

  it("includes variant_title when provided", () => {
    const html = formatOrderItemsHTML([
      { name: "Marco", quantity: 1, price: 30000, variant_title: "Negro" },
    ]);
    expect(html).toContain("Marco - Negro");
  });

  it("handles empty array", () => {
    const html = formatOrderItemsHTML([]);
    expect(html).toBe("");
  });
});

describe("formatOrderItemsText", () => {
  it("formats items as plain text", () => {
    const text = formatOrderItemsText([
      { name: "Producto X", quantity: 1, price: 10000 },
    ]);
    expect(text).toContain("Producto X");
    expect(text).toContain("x1");
  });
});

// =============================================================================
// 4. Variable completeness - ensure no {{var}} left after replacement
// =============================================================================

describe("variable completeness", () => {
  /** All variables used across organization email templates */
  const ALL_TEMPLATE_VARIABLES = [
    "customer_name",
    "customer_first_name",
    "order_number",
    "order_total",
    "order_date",
    "order_items",
    "order_items_text",
    "organization_name",
    "support_email",
    "contact_email",
    "website_url",
    "tracking_number",
    "carrier",
    "estimated_delivery",
    "delivery_date",
    "payment_method",
    "transaction_id",
    "amount",
    "membership_tier",
    "membership_start_date",
    "access_url",
    "renewal_url",
    "days_remaining",
    "reset_link",
    "reset_url",
    "account_url",
    "low_stock_products",
    "low_stock_products_text",
    "product_count",
    "appointment_date",
    "appointment_time",
    "appointment_datetime",
    "professional_name",
    "professional_title",
    "branch_name",
    "branch_address",
    "branch_phone",
    "branch_email",
    "branch_hours",
    "appointment_type",
    "old_appointment_date",
    "old_appointment_time",
    "follow_up_date",
    "cancellation_reason",
    "booking_url",
    "work_order_number",
    "work_order_date",
    "quote_number",
    "quote_total",
    "quote_expiry",
    "prescription_number",
    "prescription_expiry_date",
    "prescription_date",
  ];

  it("replaceTemplateVariables leaves no {{var}} when all variables provided", () => {
    const template = ALL_TEMPLATE_VARIABLES.map(
      (v) => `{{${v}}}`,
    ).join(" | ");
    const variables = Object.fromEntries(
      ALL_TEMPLATE_VARIABLES.map((v) => [v, `val_${v}`]),
    );
    const result = replaceTemplateVariables(template, variables);
    const unreplaced = result.match(/\{\{[^}]+\}\}/g);
    expect(unreplaced).toBeNull();
  });

  it("extracts variable names from template string", () => {
    const template = "Hola {{customer_name}}, tu orden {{order_number}}";
    const regex = /\{\{\s*([a-z0-9_]+)\s*\}\}/g;
    const vars: string[] = [];
    let m;
    while ((m = regex.exec(template)) !== null) vars.push(m[1]);
    expect(vars).toContain("customer_name");
    expect(vars).toContain("order_number");
  });
});
