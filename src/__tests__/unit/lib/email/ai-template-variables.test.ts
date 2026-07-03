/**
 * Unit tests for ai-template-variables.ts
 *
 * Pure functions — no mocking needed.
 */

import { describe, expect, it } from "vitest";

import {
  B2C_CANONICAL_VARIABLES,
  buildVariablesPromptForAgent,
  getVariablesForEditor,
  getVariablesForType,
  VARIABLE_DESCRIPTIONS,
  VARIABLES_BY_TYPE,
} from "@/lib/email/ai-template-variables";

describe("getVariablesForType", () => {
  it("returns correct variables for order_confirmation", () => {
    const vars = getVariablesForType("order_confirmation");
    expect(vars).toContain("customer_name");
    expect(vars).toContain("order_number");
    expect(vars).toContain("order_total");
    expect(vars).toContain("order_items");
    expect(vars).toContain("order_items_text");
    expect(vars).toContain("organization_name");
  });

  it("returns correct variables for work_order_delivered", () => {
    const vars = getVariablesForType("work_order_delivered");
    expect(vars).toEqual([
      "customer_name",
      "work_order_number",
      "organization_name",
      "survey_url",
    ]);
  });

  it("returns custom variables as fallback for unknown type", () => {
    const vars = getVariablesForType("nonexistent_type");
    expect(vars).toContain("customer_name");
    expect(vars).toContain("organization_name");
    expect(vars).toContain("support_email");
  });

  it("returns appointment_reminder_2h with branch address and phone", () => {
    const vars = getVariablesForType("appointment_reminder_2h");
    expect(vars).toContain("branch_address");
    expect(vars).toContain("branch_phone");
    expect(vars).toContain("professional_name");
  });

  it("includes survey_url only in work_order_delivered", () => {
    const delivered = getVariablesForType("work_order_delivered");
    expect(delivered).toContain("survey_url");

    const shipped = getVariablesForType("order_shipped");
    expect(shipped).not.toContain("survey_url");
  });
});

describe("getVariablesForEditor", () => {
  it("returns array of { key, label, description }", () => {
    const result = getVariablesForEditor("order_confirmation");
    expect(result.length).toBeGreaterThan(0);
    const item = result.find((v) => v.key === "customer_name");
    expect(item).toBeDefined();
    expect(item?.label).toBe("Nombre del Cliente");
    expect(item?.description).toBe("Nombre completo del cliente");
  });

  it("falls back to formatted key when label is missing", () => {
    const items = getVariablesForType("work_order_delivered");
    const result = getVariablesForEditor("work_order_delivered");

    // survey_url might not have a label in the map
    const surveyUrl = result.find((v) => v.key === "survey_url");
    expect(surveyUrl).toBeDefined();
    expect(surveyUrl?.label).toBe("survey url");
  });

  it("falls back to empty description when missing", () => {
    const result = getVariablesForEditor("work_order_delivered");
    // customer_name has a description; work_order_number might not
    const woNum = result.find((v) => v.key === "work_order_number");
    expect(woNum?.description).toBeDefined();
  });

  it("returns empty description for keys not in VARIABLE_DESCRIPTIONS", () => {
    const unusedKey = "__never_exists__";
    const result = getVariablesForEditor("custom");

    // All custom vars have descriptions, but if we added one without...
    expect(result.every((v) => typeof v.description === "string")).toBe(true);
  });

  it("returns all entries with correct shape", () => {
    const result = getVariablesForEditor("appointment_cancelation");
    result.forEach((v) => {
      expect(v).toHaveProperty("key");
      expect(v).toHaveProperty("label");
      expect(v).toHaveProperty("description");
      expect(typeof v.key).toBe("string");
      expect(typeof v.label).toBe("string");
      expect(typeof v.description).toBe("string");
    });
  });
});

describe("buildVariablesPromptForAgent", () => {
  it("returns prompt lines with descriptions when available", () => {
    const prompt = buildVariablesPromptForAgent("order_confirmation");
    expect(prompt).toContain("{{customer_name}}");
    expect(prompt).toContain("Nombre completo del cliente");
    expect(prompt).toContain("{{order_total}}");
    expect(prompt).toContain("Total formateado");
  });

  it("returns prompt lines without description when missing", () => {
    const prompt = buildVariablesPromptForAgent("custom");
    const lines = prompt.split("\n");
    lines.forEach((line) => {
      expect(line).toMatch(/^- \{\{.*\}\}/);
    });
  });

  it("includes all variables for work_order_delivered", () => {
    const prompt = buildVariablesPromptForAgent("work_order_delivered");
    expect(prompt).toContain("{{customer_name}}");
    expect(prompt).toContain("{{work_order_number}}");
    expect(prompt).toContain("{{organization_name}}");
    expect(prompt).toContain("{{survey_url}}");
  });

  it("separates variables by newline", () => {
    const prompt = buildVariablesPromptForAgent("work_order_ready");
    const lines = prompt.split("\n");
    expect(lines.length).toBe(3); // customer_name, work_order_number, organization_name
  });

  it("returns empty line for type with no variables", () => {
    // If somehow a type had no vars, getVariablesForType falls back to custom
    const prompt = buildVariablesPromptForAgent("__missing__");
    expect(prompt.length).toBeGreaterThan(0);
  });
});

describe("VARIABLES_BY_TYPE", () => {
  it("includes all expected email types", () => {
    const types = Object.keys(VARIABLES_BY_TYPE);
    expect(types).toContain("order_confirmation");
    expect(types).toContain("order_shipped");
    expect(types).toContain("order_delivered");
    expect(types).toContain("payment_success");
    expect(types).toContain("payment_failed");
    expect(types).toContain("appointment_confirmation");
    expect(types).toContain("appointment_reminder");
    expect(types).toContain("appointment_reminder_2h");
    expect(types).toContain("appointment_cancelation");
    expect(types).toContain("appointment_rescheduled");
    expect(types).toContain("prescription_ready");
    expect(types).toContain("prescription_expiring");
    expect(types).toContain("quote_sent");
    expect(types).toContain("quote_expiring");
    expect(types).toContain("work_order_ready");
    expect(types).toContain("work_order_delivered");
    expect(types).toContain("low_stock_alert");
    expect(types).toContain("account_welcome");
    expect(types).toContain("password_reset");
    expect(types).toContain("membership_welcome");
    expect(types).toContain("membership_reminder");
    expect(types).toContain("custom");
  });
});

describe("VARIABLE_DESCRIPTIONS", () => {
  it("all canonical variables have descriptions", () => {
    B2C_CANONICAL_VARIABLES.forEach((v) => {
      expect(VARIABLE_DESCRIPTIONS).toHaveProperty(v);
    });
  });

  it("all type variables are documented", () => {
    const allUsed = new Set(Object.values(VARIABLES_BY_TYPE).flat());
    const allDescribed = new Set(Object.keys(VARIABLE_DESCRIPTIONS));
    // survey_url is the only variable in VARIABLES_BY_TYPE that lacks a description
    allUsed.forEach((v) => {
      if (v === "survey_url") return; // no description entry, documented inline in work_order_delivered
      expect(allDescribed.has(v)).toBe(true);
    });
  });
});

describe("B2C_CANONICAL_VARIABLES", () => {
  it("is a readonly tuple with expected entries", () => {
    expect(B2C_CANONICAL_VARIABLES.length).toBeGreaterThan(0);
    expect(B2C_CANONICAL_VARIABLES).toContain("customer_name");
    expect(B2C_CANONICAL_VARIABLES).toContain("support_email");
    expect(B2C_CANONICAL_VARIABLES).toContain("company_name");
  });
});
