/**
 * Characterization test for CreateQuoteForm extraction.
 *
 * Tests the public API boundary of each extracted module:
 * - CreateQuoteForm.types — type shapes
 * - CreateQuoteForm.constants — constant values and formatPrice
 * - quotePricingUtils — calculation helpers
 * - quoteSubmitHandler — validation and payload building
 */
import { describe, expect, it } from "vitest";

// ─── Types ───────────────────────────────────────────────────────────────────

import type {
  CreateQuoteFormProps,
  QuoteFormData,
  PresbyopiaSolution,
  QuoteSettings,
  TreatmentOption,
} from "../CreateQuoteForm.types";

describe("CreateQuoteForm.types", () => {
  it("exports expected interface types", () => {
    // Type-level test: these should compile. At runtime they're just objects.
    const props: CreateQuoteFormProps = {
      onSuccess: () => {},
      onCancel: () => {},
    };
    expect(props.onSuccess).toBeDefined();
    expect(props.onCancel).toBeDefined();
  });

  it("CreateQuoteFormProps supports optional field operation & branch IDs", () => {
    // Verify the extended props (from original) are present in the type
    const props: CreateQuoteFormProps = {
      onSuccess: () => {},
      onCancel: () => {},
      initialCustomerId: "c1",
      initialFieldOperationId: "fo1",
      initialBranchId: "b1",
      initialPrescriptionId: "p1",
    };
    expect(props.initialFieldOperationId).toBe("fo1");
    expect(props.initialBranchId).toBe("b1");
  });

  it("QuoteFormData has all required fields", () => {
    const data: QuoteFormData = {
      frame_name: "",
      frame_brand: "",
      frame_model: "",
      frame_color: "",
      frame_size: "",
      frame_sku: "",
      frame_price: 0,
      frame_price_includes_tax: false,
      customer_own_frame: false,
      lens_family_id: "",
      lens_type: "",
      lens_material: "",
      lens_index: null,
      lens_treatments: [],
      lens_tint_color: "",
      lens_tint_percentage: 0,
      lens_sourcing_type: "surfaced",
      frame_cost: 0,
      lens_cost: 0,
      treatments_cost: 0,
      labor_cost: 0,
      subtotal: 0,
      tax_amount: 0,
      discount_amount: 0,
      discount_percentage: 0,
      total_amount: 0,
      notes: "",
      customer_notes: "",
      expiration_days: 30,
      presbyopia_solution: "none",
      far_lens_family_id: "",
      near_lens_family_id: "",
      far_lens_cost: 0,
      near_lens_cost: 0,
      contact_lens_family_id: "",
      contact_lens_rx_sphere_od: null,
      contact_lens_rx_cylinder_od: null,
      contact_lens_rx_axis_od: null,
      contact_lens_rx_add_od: null,
      contact_lens_rx_base_curve_od: null,
      contact_lens_rx_diameter_od: null,
      contact_lens_rx_sphere_os: null,
      contact_lens_rx_cylinder_os: null,
      contact_lens_rx_axis_os: null,
      contact_lens_rx_add_os: null,
      contact_lens_rx_base_curve_os: null,
      contact_lens_rx_diameter_os: null,
      contact_lens_quantity: 1,
      contact_lens_cost: 0,
      contact_lens_price: 0,
      near_frame_product_id: "",
      near_frame_name: "",
      near_frame_brand: "",
      near_frame_model: "",
      near_frame_color: "",
      near_frame_size: "",
      near_frame_sku: "",
      near_frame_price: 0,
      near_frame_price_includes_tax: false,
      near_frame_cost: 0,
    };
    expect(data.lens_sourcing_type).toBe("surfaced");
    expect(data.presbyopia_solution).toBe("none");
  });

  it("PresbyopiaSolution is a union of string literals", () => {
    const valid: PresbyopiaSolution[] = [
      "none",
      "progressive",
      "bifocal",
      "trifocal",
      "two_separate",
    ];
    expect(valid).toHaveLength(5);
  });

  it("QuoteSettings supports treatment_prices and config flags", () => {
    const s: QuoteSettings = {
      treatment_prices: { anti_reflective: { price: 15000, enabled: true } },
      lens_cost_includes_tax: true,
    };
    expect(s.lens_cost_includes_tax).toBe(true);
  });
});

// ─── Constants ───────────────────────────────────────────────────────────────

import {
  MATERIAL_INDICES,
  DEFAULT_QUOTE_SETTINGS,
  UUID_REGEX,
  formatPrice,
  roundCurrency,
} from "../CreateQuoteForm.constants";

describe("CreateQuoteForm.constants", () => {
  it("MATERIAL_INDICES maps materials to refractive indices", () => {
    expect(MATERIAL_INDICES.cr39).toBe(1.49);
    expect(MATERIAL_INDICES.polycarbonate).toBe(1.59);
    expect(MATERIAL_INDICES.high_index_1_74).toBe(1.74);
    expect(Object.keys(MATERIAL_INDICES)).toHaveLength(8);
  });

  it("UUID_REGEX matches valid UUIDs", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000";
    expect(UUID_REGEX.test(uuid)).toBe(true);
    expect(UUID_REGEX.test("not-a-uuid")).toBe(false);
    expect(UUID_REGEX.test("")).toBe(false);
  });

  it("formatPrice formats CLP currency", () => {
    const result = formatPrice(15000);
    expect(result).toContain("15.000");
    expect(result).toContain("$");
  });

  it("formatPrice handles zero", () => {
    const result = formatPrice(0);
    expect(result).toContain("0");
  });

  it("roundCurrency rounds to 2 decimal places", () => {
    expect(roundCurrency(10.456)).toBe(10.46);
    expect(roundCurrency(10.001)).toBe(10.0);
    expect(roundCurrency(100)).toBe(100);
  });

  it("DEFAULT_QUOTE_SETTINGS provides fallback settings", () => {
    expect(DEFAULT_QUOTE_SETTINGS.default_labor_cost).toBe(15000);
    expect(DEFAULT_QUOTE_SETTINGS.default_tax_percentage).toBe(19.0);
    expect(DEFAULT_QUOTE_SETTINGS.default_expiration_days).toBe(30);
    expect(DEFAULT_QUOTE_SETTINGS.currency).toBe("CLP");
    expect(
      DEFAULT_QUOTE_SETTINGS.treatment_prices?.anti_reflective,
    ).toBeDefined();
  });
});

// ─── Pricing Utils ───────────────────────────────────────────────────────────

import {
  getTreatmentPrice,
  isTreatmentEnabled,
  buildAvailableTreatments,
  toggleTreatment,
  calculateTotal,
  mapFrameToFormData,
  mapNearFrameToFormData,
  inheritFamilyProperties,
  shouldCalculateLensPrice,
  isTreatmentDisabled,
  type CalculateTotalInput,
  type FrameData,
} from "../quotePricingUtils";

describe("quotePricingUtils", () => {
  describe("getTreatmentPrice", () => {
    it("returns number as-is", () => {
      expect(getTreatmentPrice(15000)).toBe(15000);
    });

    it("extracts price from { price, enabled } object", () => {
      expect(getTreatmentPrice({ price: 20000, enabled: true })).toBe(20000);
    });

    it("returns 0 for unknown format", () => {
      expect(getTreatmentPrice("string")).toBe(0);
      expect(getTreatmentPrice(null)).toBe(0);
      expect(getTreatmentPrice(undefined)).toBe(0);
    });
  });

  describe("isTreatmentEnabled", () => {
    it("returns true for numbers", () => {
      expect(isTreatmentEnabled(15000)).toBe(true);
    });

    it("reads enabled flag from object", () => {
      expect(isTreatmentEnabled({ price: 20000, enabled: true })).toBe(true);
      expect(isTreatmentEnabled({ price: 20000, enabled: false })).toBe(false);
    });

    it("defaults to true for unknown format", () => {
      expect(isTreatmentEnabled(null)).toBe(true);
    });
  });

  describe("buildAvailableTreatments", () => {
    it("returns defaults when settings is null", () => {
      const treatments = buildAvailableTreatments(null);
      expect(treatments.length).toBeGreaterThanOrEqual(3);
      expect(
        treatments.find((t) => t.value === "anti_reflective"),
      ).toBeDefined();
    });

    it("filters out disabled treatments", () => {
      const treatments = buildAvailableTreatments({
        treatment_prices: {
          anti_reflective: { price: 15000, enabled: true },
          scratch_resistant: { price: 12000, enabled: false },
        },
        default_expiration_days: 30,
      } as QuoteSettings);
      expect(
        treatments.find((t) => t.value === "scratch_resistant"),
      ).toBeUndefined();
      expect(
        treatments.find((t) => t.value === "anti_reflective"),
      ).toBeDefined();
    });
  });

  describe("toggleTreatment", () => {
    const treatment: TreatmentOption = {
      value: "anti_reflective",
      label: "AR",
      cost: 15000,
      enabled: true,
    };

    it("adds treatment when not selected", () => {
      const result = toggleTreatment([], 0, treatment);
      expect(result.lens_treatments).toEqual(["anti_reflective"]);
      expect(result.treatments_cost).toBe(15000);
    });

    it("removes treatment when already selected", () => {
      const result = toggleTreatment(["anti_reflective"], 15000, treatment);
      expect(result.lens_treatments).toEqual([]);
      expect(result.treatments_cost).toBe(0);
    });
  });

  describe("calculateTotal", () => {
    const baseInput: CalculateTotalInput = {
      formData: {
        frame_name: "",
        frame_brand: "",
        frame_model: "",
        frame_color: "",
        frame_size: "",
        frame_sku: "",
        frame_price: 50000,
        frame_price_includes_tax: false,
        customer_own_frame: false,
        lens_family_id: "",
        lens_type: "",
        lens_material: "",
        lens_index: null,
        lens_treatments: [],
        lens_tint_color: "",
        lens_tint_percentage: 0,
        lens_sourcing_type: "surfaced",
        frame_cost: 0,
        lens_cost: 30000,
        treatments_cost: 0,
        labor_cost: 15000,
        subtotal: 0,
        tax_amount: 0,
        discount_amount: 0,
        discount_percentage: 0,
        total_amount: 0,
        notes: "",
        customer_notes: "",
        expiration_days: 30,
        presbyopia_solution: "none",
        far_lens_family_id: "",
        near_lens_family_id: "",
        far_lens_cost: 0,
        near_lens_cost: 0,
        contact_lens_family_id: "",
        contact_lens_rx_sphere_od: null,
        contact_lens_rx_cylinder_od: null,
        contact_lens_rx_axis_od: null,
        contact_lens_rx_add_od: null,
        contact_lens_rx_base_curve_od: null,
        contact_lens_rx_diameter_od: null,
        contact_lens_rx_sphere_os: null,
        contact_lens_rx_cylinder_os: null,
        contact_lens_rx_axis_os: null,
        contact_lens_rx_add_os: null,
        contact_lens_rx_base_curve_os: null,
        contact_lens_rx_diameter_os: null,
        contact_lens_quantity: 1,
        contact_lens_cost: 0,
        contact_lens_price: 0,
        near_frame_product_id: "",
        near_frame_name: "",
        near_frame_brand: "",
        near_frame_model: "",
        near_frame_color: "",
        near_frame_size: "",
        near_frame_sku: "",
        near_frame_price: 0,
        near_frame_price_includes_tax: false,
        near_frame_cost: 0,
      },
      quoteSettings: null,
      taxPercentage: 19.0,
      discountType: "amount",
      lensType: "optical",
      presbyopiaSolution: "none",
      customerOwnFrame: false,
      customerOwnNearFrame: false,
    };

    it("calculates basic total with frame + lens + labor", () => {
      const result = calculateTotal(baseInput);
      // Uses calculatePriceWithTax: frame(50000, no-tax), lens(30000, with-tax), labor(15000, with-tax)
      // subtotal = 50000 + 25210.08 + 12605.04 = 87815.12
      expect(result.subtotal).toBe(87815.12);
      // total = 114000
      expect(result.total_amount).toBe(114000);
    });

    it("applies percentage discount to total with tax", () => {
      const input: CalculateTotalInput = {
        ...baseInput,
        discountType: "percentage",
        formData: { ...baseInput.formData, discount_percentage: 10 },
      };
      const result = calculateTotal(input);
      // 10% of 114000 = 11400
      expect(result.discount_amount).toBe(11400);
      expect(result.total_amount).toBe(102600);
    });

    it("handles customer-owned frame (frame price = 0)", () => {
      const input: CalculateTotalInput = {
        ...baseInput,
        customerOwnFrame: true,
        formData: { ...baseInput.formData, frame_price: 0 },
      };
      const result = calculateTotal(input);
      // subtotal = 0 + 25210.08 + 12605.04 = 37815.12
      expect(result.subtotal).toBe(37815.12);
    });
  });

  describe("mapFrameToFormData", () => {
    it("maps frame fields to form data shape", () => {
      const frame: FrameData = {
        id: "f1",
        name: "Ray-Ban",
        frame_brand: "Ray-Ban",
        frame_model: "RB2140",
        frame_color: "Black",
        frame_size: "54",
        sku: "RB-001",
        price: 100000,
        price_includes_tax: true,
      };
      const result = mapFrameToFormData(frame);
      expect(result.frame_product_id).toBe("f1");
      expect(result.frame_name).toBe("Ray-Ban");
      expect(result.frame_price).toBe(100000);
      expect(result.frame_cost).toBe(100000);
    });
  });

  describe("inheritFamilyProperties", () => {
    it("returns material index from family lens_material", () => {
      const result = inheritFamilyProperties({
        lens_material: "polycarbonate",
      });
      expect(result.lens_index).toBe(1.59);
    });

    it("resets treatments when family is selected", () => {
      const result = inheritFamilyProperties({ lens_type: "progressive" });
      expect(result.lens_treatments).toEqual([]);
      expect(result.treatments_cost).toBe(0);
    });

    it("returns empty for undefined family", () => {
      const result = inheritFamilyProperties(undefined);
      expect(result).toEqual({});
    });
  });

  describe("shouldCalculateLensPrice", () => {
    it("returns false for empty lensFamilyId", () => {
      expect(shouldCalculateLensPrice("", "none")).toBe(false);
    });

    it("returns false for two_separate solution", () => {
      expect(shouldCalculateLensPrice("some-id", "two_separate")).toBe(false);
    });

    it("returns false for non-UUID id", () => {
      expect(shouldCalculateLensPrice("not-a-uuid", "none")).toBe(false);
    });
  });

  describe("isTreatmentDisabled", () => {
    it("disables blocked treatments when lens family is set", () => {
      expect(isTreatmentDisabled("anti_reflective", true)).toBe(true);
      expect(isTreatmentDisabled("tint", true)).toBe(false);
    });

    it("does not disable when no lens family", () => {
      expect(isTreatmentDisabled("anti_reflective", false)).toBe(false);
    });
  });
});

// ─── Submit Handler ──────────────────────────────────────────────────────────

import {
  validateQuoteForm,
  buildNearFramePayload,
  buildQuotePayload,
  type NearFramePayload,
} from "../quoteSubmitHandler";

describe("quoteSubmitHandler", () => {
  const validFormData: QuoteFormData = {
    frame_name: "Test Frame",
    frame_brand: "",
    frame_model: "",
    frame_color: "",
    frame_size: "",
    frame_sku: "",
    frame_price: 50000,
    frame_price_includes_tax: false,
    customer_own_frame: false,
    lens_family_id: "family-1",
    lens_type: "optical",
    lens_material: "",
    lens_index: null,
    lens_treatments: [],
    lens_tint_color: "",
    lens_tint_percentage: 0,
    lens_sourcing_type: "surfaced",
    frame_cost: 0,
    lens_cost: 30000,
    treatments_cost: 0,
    labor_cost: 15000,
    subtotal: 87815.12,
    tax_amount: 26184.88,
    discount_amount: 0,
    discount_percentage: 0,
    total_amount: 114000,
    notes: "",
    customer_notes: "",
    expiration_days: 30,
    presbyopia_solution: "none",
    far_lens_family_id: "",
    near_lens_family_id: "",
    far_lens_cost: 0,
    near_lens_cost: 0,
    contact_lens_family_id: "",
    contact_lens_rx_sphere_od: null,
    contact_lens_rx_cylinder_od: null,
    contact_lens_rx_axis_od: null,
    contact_lens_rx_add_od: null,
    contact_lens_rx_base_curve_od: null,
    contact_lens_rx_diameter_od: null,
    contact_lens_rx_sphere_os: null,
    contact_lens_rx_cylinder_os: null,
    contact_lens_rx_axis_os: null,
    contact_lens_rx_add_os: null,
    contact_lens_rx_base_curve_os: null,
    contact_lens_rx_diameter_os: null,
    contact_lens_quantity: 1,
    contact_lens_cost: 0,
    contact_lens_price: 0,
    near_frame_product_id: "",
    near_frame_name: "",
    near_frame_brand: "",
    near_frame_model: "",
    near_frame_color: "",
    near_frame_size: "",
    near_frame_sku: "",
    near_frame_price: 0,
    near_frame_price_includes_tax: false,
    near_frame_cost: 0,
  };

  describe("validateQuoteForm", () => {
    it("passes with customer, prescription, and lens configured", () => {
      const result = validateQuoteForm(
        { id: "c1" },
        { id: "p1" },
        validFormData,
        "optical",
        "none",
        "",
        "",
      );
      expect(result.valid).toBe(true);
    });

    it("fails without customer", () => {
      const result = validateQuoteForm(
        null,
        { id: "p1" },
        validFormData,
        "optical",
        "none",
        "",
        "",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("cliente");
    });

    it("fails without prescription", () => {
      const result = validateQuoteForm(
        { id: "c1" },
        null,
        validFormData,
        "optical",
        "none",
        "",
        "",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("receta");
    });

    it("fails when optical lens has no family or cost", () => {
      const noLensData = { ...validFormData, lens_family_id: "", lens_cost: 0 };
      const result = validateQuoteForm(
        { id: "c1" },
        { id: "p1" },
        noLensData,
        "optical",
        "none",
        "",
        "",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("lentes");
    });

    it("fails when contact lens has no family or cost", () => {
      const contactData = {
        ...validFormData,
        contact_lens_family_id: "",
        contact_lens_cost: 0,
      };
      const result = validateQuoteForm(
        { id: "c1" },
        { id: "p1" },
        contactData,
        "contact",
        "none",
        "",
        "",
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain("contacto");
    });

    it("passes for two_separate with families selected", () => {
      const result = validateQuoteForm(
        { id: "c1" },
        { id: "p1" },
        validFormData,
        "optical",
        "two_separate",
        "far-family",
        "near-family",
      );
      expect(result.valid).toBe(true);
    });
  });

  describe("buildNearFramePayload", () => {
    it("returns null payload for non-two_separate", () => {
      const payload = buildNearFramePayload("none", validFormData, null, false);
      expect(payload.near_frame_product_id).toBeNull();
      expect(payload.near_frame_price).toBe(0);
    });

    it("builds full near frame data for two_separate", () => {
      const nearFrame = { id: "nf1", name: "Near Frame", price: 25000 };
      const formData = { ...validFormData, near_frame_name: "Custom Near" };
      const payload = buildNearFramePayload(
        "two_separate",
        formData,
        nearFrame,
        false,
      );
      expect(payload.near_frame_product_id).toBe("nf1");
      expect(payload.near_frame_name).toBe("Custom Near");
    });
  });

  describe("buildQuotePayload", () => {
    it("builds valid payload with all required fields", () => {
      const nearPayload: NearFramePayload = {
        near_frame_product_id: null,
        near_frame_name: null,
        near_frame_brand: null,
        near_frame_model: null,
        near_frame_color: null,
        near_frame_size: null,
        near_frame_sku: null,
        near_frame_price: 0,
        near_frame_price_includes_tax: false,
        near_frame_cost: 0,
        customer_own_near_frame: false,
      };

      const payload = buildQuotePayload(
        validFormData,
        { id: "c1" },
        {
          id: "p1",
          od_sphere: -2.0,
          od_cylinder: -0.75,
          od_axis: 180,
          od_add: null,
          os_sphere: -1.5,
          os_cylinder: -0.5,
          os_axis: 175,
          os_add: null,
        },
        { id: "f1" },
        nearPayload,
        "optical",
        "none",
        "",
        "",
        0,
        0,
        false,
        "branch-1",
      );

      expect(payload.customer_id).toBe("c1");
      expect(payload.prescription_id).toBe("p1");
      expect(payload.frame_product_id).toBe("f1");
      expect(payload.status).toBe("draft");
      expect(payload.valid_until).toBeDefined();
      expect(payload.notes).toBe("");
    });
  });
});
