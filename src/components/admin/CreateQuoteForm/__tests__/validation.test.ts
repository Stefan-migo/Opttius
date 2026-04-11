import { beforeEach, describe, expect, it, vi } from "vitest";

import { PresbyopiaSolution, QuoteFormData } from "../types/quote.types";
import { QuoteFormValidator } from "../utils/validation";

// Mock the translation function
vi.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        "quotes.select_customer": "Debe seleccionar un cliente",
        "quotes.select_prescription": "Debe seleccionar una receta",
        "quotes.enter_frame_name_or_select":
          "Debe ingresar el nombre del marco o seleccionar uno existente",
        "quotes.enter_frame_name_when_customer_bring":
          "Debe ingresar el nombre del marco cuando el cliente lo trae",
        "quotes.select_lens_family_or_enter_cost":
          "Debe seleccionar una familia de lentes o ingresar el costo manualmente",
        "quotes.select_contact_lens_family":
          "Debe seleccionar una familia de lentes de contacto",
        "quotes.frame_price_negative":
          "El precio del marco no puede ser negativo",
        "quotes.lens_cost_negative": "El costo del lente no puede ser negativo",
        "quotes.discount_percentage_range":
          "El porcentaje de descuento debe estar entre 0 y 100",
        "quotes.discount_amount_negative":
          "El monto de descuento no puede ser negativo",
        "quotes.expiration_days_range":
          "La validez debe estar entre 1 y 365 días",
        "quotes.enter_near_frame_name":
          "Debe ingresar el nombre del marco para visión de cerca",
        "quotes.select_far_lens_family":
          "Debe seleccionar una familia de lentes para visión de lejos",
        "quotes.select_near_lens_family":
          "Debe seleccionar una familia de lentes para visión de cerca",
      };
      return translations[key] || key;
    },
  }),
}));

describe("QuoteFormValidator", () => {
  let validFormData: QuoteFormData;
  let validCustomer: unknown;
  let validPrescription: unknown;

  beforeEach(() => {
    validFormData = {
      frame_name: "Test Frame",
      frame_brand: "Test Brand",
      frame_model: "Test Model",
      frame_color: "Black",
      frame_size: "Medium",
      frame_sku: "TF-001",
      frame_price: 10000,
      frame_price_includes_tax: false,
      customer_own_frame: false,
      lens_family_id: "test-family-123",
      lens_type: "optical",
      lens_material: "polycarbonate",
      lens_index: 1.59,
      lens_treatments: [],
      lens_tint_color: "",
      lens_tint_percentage: 0,
      frame_cost: 8000,
      lens_cost: 5000,
      treatments_cost: 0,
      labor_cost: 1500,
      subtotal: 14500,
      tax_amount: 2755,
      discount_amount: 0,
      discount_percentage: 0,
      total_amount: 17255,
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
      customer_own_near_frame: false,
    };

    validCustomer = {
      id: "customer-123",
      first_name: "John",
      last_name: "Doe",
    };
    validPrescription = {
      id: "prescription-123",
      prescription_type: "distance",
    };
  });

  describe("validate", () => {
    it("should pass validation for valid form data", () => {
      const result = QuoteFormValidator.validate(
        validFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when customer is missing", () => {
      const result = QuoteFormValidator.validate(
        validFormData,
        null,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "customer",
        message: "Debe seleccionar un cliente",
      });
    });

    it("should fail validation when prescription is missing", () => {
      const result = QuoteFormValidator.validate(
        validFormData,
        validCustomer,
        null,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "prescription",
        message: "Debe seleccionar una receta",
      });
    });

    it("should fail validation when frame name is missing and not customer owned", () => {
      const invalidFormData = {
        ...validFormData,
        frame_name: "",
        customer_own_frame: false,
      };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "frame_name",
        message:
          "Debe ingresar el nombre del marco o seleccionar uno existente",
      });
    });

    it("should pass validation when frame is customer owned but name is provided", () => {
      const formData = {
        ...validFormData,
        customer_own_frame: true,
        frame_name: "Customer Frame",
      };
      const result = QuoteFormValidator.validate(
        formData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(true);
    });

    it("should fail validation when optical lens has no family or cost", () => {
      const invalidFormData = {
        ...validFormData,
        lens_type: "optical",
        lens_family_id: "",
        lens_cost: 0,
      };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "lens_cost",
        message:
          "Debe seleccionar una familia de lentes o ingresar el costo manualmente",
      });
    });

    it("should fail validation when contact lens has no family", () => {
      const invalidFormData = {
        ...validFormData,
        lens_type: "contact",
        contact_lens_family_id: "",
      };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "contact_lens_family_id",
        message: "Debe seleccionar una familia de lentes de contacto",
      });
    });

    it("should fail validation for negative frame price", () => {
      const invalidFormData = { ...validFormData, frame_price: -1000 };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "frame_price",
        message: "El precio del marco no puede ser negativo",
      });
    });

    it("should fail validation for negative lens cost", () => {
      const invalidFormData = { ...validFormData, lens_cost: -500 };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "lens_cost",
        message: "El costo del lente no puede ser negativo",
      });
    });

    it("should fail validation for invalid discount percentage", () => {
      const invalidFormData = { ...validFormData, discount_percentage: 150 };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "discount_percentage",
        message: "El porcentaje de descuento debe estar entre 0 y 100",
      });
    });

    it("should fail validation for negative discount amount", () => {
      const invalidFormData = { ...validFormData, discount_amount: -1000 };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "discount_amount",
        message: "El monto de descuento no puede ser negativo",
      });
    });

    it("should fail validation for invalid expiration days", () => {
      const invalidFormData = { ...validFormData, expiration_days: 500 };
      const result = QuoteFormValidator.validate(
        invalidFormData,
        validCustomer,
        validPrescription,
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "expiration_days",
        message: "La validez debe estar entre 1 y 365 días",
      });
    });
  });

  describe("validateCustomerOwnFrame", () => {
    it("should pass validation when customer owns frame and name is provided", () => {
      const formData = {
        ...validFormData,
        customer_own_frame: true,
        frame_name: "Customer Frame",
      };
      const result = QuoteFormValidator.validateCustomerOwnFrame(formData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation when customer owns frame but name is missing", () => {
      const formData = {
        ...validFormData,
        customer_own_frame: true,
        frame_name: "",
      };
      const result = QuoteFormValidator.validateCustomerOwnFrame(formData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContainEqual({
        field: "frame_name",
        message: "Debe ingresar el nombre del marco cuando el cliente lo trae",
      });
    });

    it("should pass validation when customer does not own frame", () => {
      const formData = { ...validFormData, customer_own_frame: false };
      const result = QuoteFormValidator.validateCustomerOwnFrame(formData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("validateTwoSeparateLenses", () => {
    it("should validate two separate lenses requirement", () => {
      const formData = {
        ...validFormData,
        presbyopia_solution: "two_separate" as PresbyopiaSolution,
        customer_own_near_frame: false,
        near_frame_name: "",
        far_lens_family_id: "",
        near_lens_family_id: "",
      };

      const result = QuoteFormValidator.validateTwoSeparateLenses(formData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toEqual([
        {
          field: "near_frame_name",
          message: "Debe ingresar el nombre del marco para visión de cerca",
        },
        {
          field: "far_lens_family_id",
          message:
            "Debe seleccionar una familia de lentes para visión de lejos",
        },
        {
          field: "near_lens_family_id",
          message:
            "Debe seleccionar una familia de lentes para visión de cerca",
        },
      ]);
    });

    it("should pass validation when all two separate lens requirements are met", () => {
      const formData = {
        ...validFormData,
        presbyopia_solution: "two_separate" as PresbyopiaSolution,
        near_frame_name: "Near Frame",
        far_lens_family_id: "far-family-123",
        near_lens_family_id: "near-family-123",
      };

      const result = QuoteFormValidator.validateTwoSeparateLenses(formData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("helper methods", () => {
    it("should get error message for specific field", () => {
      const errors = [
        { field: "frame_name", message: "Frame name required" },
        { field: "lens_cost", message: "Lens cost required" },
      ];

      const message = QuoteFormValidator.getErrorMessage(errors, "frame_name");
      expect(message).toBe("Frame name required");

      const noMessage = QuoteFormValidator.getErrorMessage(
        errors,
        "nonexistent",
      );
      expect(noMessage).toBeUndefined();
    });

    it("should check if field has error", () => {
      const errors = [{ field: "frame_name", message: "Frame name required" }];

      expect(QuoteFormValidator.hasError(errors, "frame_name")).toBe(true);
      expect(QuoteFormValidator.hasError(errors, "lens_cost")).toBe(false);
    });
  });
});
