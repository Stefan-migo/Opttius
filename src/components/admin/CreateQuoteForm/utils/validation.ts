import { QuoteFormData } from "../types/quote.types";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class QuoteFormValidator {
  static validate(
    formData: QuoteFormData,
    selectedCustomer: any,
    selectedPrescription: any,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Customer validation
    if (!selectedCustomer) {
      errors.push({
        field: "customer",
        message: "Debe seleccionar un cliente",
      });
    }

    // Prescription validation
    if (!selectedPrescription) {
      errors.push({
        field: "prescription",
        message: "Debe seleccionar una receta",
      });
    }

    // Frame validation
    if (!formData.customer_own_frame && !formData.frame_name) {
      errors.push({
        field: "frame_name",
        message:
          "Debe ingresar el nombre del marco o seleccionar uno existente",
      });
    }

    // Lens validation
    if (
      formData.lens_type === "optical" &&
      !formData.lens_family_id &&
      !formData.lens_cost
    ) {
      errors.push({
        field: "lens_cost",
        message:
          "Debe seleccionar una familia de lentes o ingresar el costo manualmente",
      });
    }

    // Contact lens validation
    if (formData.lens_type === "contact" && !formData.contact_lens_family_id) {
      errors.push({
        field: "contact_lens_family_id",
        message: "Debe seleccionar una familia de lentes de contacto",
      });
    }

    // Price validations
    if (formData.frame_price < 0) {
      errors.push({
        field: "frame_price",
        message: "El precio del marco no puede ser negativo",
      });
    }

    if (formData.lens_cost < 0) {
      errors.push({
        field: "lens_cost",
        message: "El costo del lente no puede ser negativo",
      });
    }

    // Discount validation
    if (
      formData.discount_percentage < 0 ||
      formData.discount_percentage > 100
    ) {
      errors.push({
        field: "discount_percentage",
        message: "El porcentaje de descuento debe estar entre 0 y 100",
      });
    }

    if (formData.discount_amount < 0) {
      errors.push({
        field: "discount_amount",
        message: "El monto de descuento no puede ser negativo",
      });
    }

    // Expiration validation
    if (formData.expiration_days < 1 || formData.expiration_days > 365) {
      errors.push({
        field: "expiration_days",
        message: "La validez debe estar entre 1 y 365 días",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateCustomerOwnFrame(formData: QuoteFormData): ValidationResult {
    const errors: ValidationError[] = [];

    if (formData.customer_own_frame) {
      if (!formData.frame_name?.trim()) {
        errors.push({
          field: "frame_name",
          message:
            "Debe ingresar el nombre del marco cuando el cliente lo trae",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static validateTwoSeparateLenses(formData: QuoteFormData): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate near frame for two separate solution
    if (formData.presbyopia_solution === "two_separate") {
      if (!formData.customer_own_near_frame && !formData.near_frame_name) {
        errors.push({
          field: "near_frame_name",
          message: "Debe ingresar el nombre del marco para visión de cerca",
        });
      }

      if (!formData.far_lens_family_id) {
        errors.push({
          field: "far_lens_family_id",
          message:
            "Debe seleccionar una familia de lentes para visión de lejos",
        });
      }

      if (!formData.near_lens_family_id) {
        errors.push({
          field: "near_lens_family_id",
          message:
            "Debe seleccionar una familia de lentes para visión de cerca",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static getErrorMessage(
    errors: ValidationError[],
    field: string,
  ): string | undefined {
    const error = errors.find((e) => e.field === field);
    return error?.message;
  }

  static hasError(errors: ValidationError[], field: string): boolean {
    return errors.some((e) => e.field === field);
  }
}

// Validation hook
export function useQuoteValidation() {
  const validate = (
    formData: QuoteFormData,
    selectedCustomer: any,
    selectedPrescription: any,
  ) => {
    return QuoteFormValidator.validate(
      formData,
      selectedCustomer,
      selectedPrescription,
    );
  };

  const validateField = (
    field: string,
    value: any,
    formData: QuoteFormData,
  ) => {
    const tempData = { ...formData, [field]: value };
    const result = QuoteFormValidator.validate(tempData, {}, {});
    return QuoteFormValidator.getErrorMessage(result.errors, field);
  };

  return {
    validate,
    validateField,
  };
}
