import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQuoteForm } from "../hooks/useQuoteForm";
import * as branchHook from "@/hooks/useBranch";
import * as taxConfig from "@/lib/utils/tax-config";

// Mock dependencies
vi.mock("@/hooks/useBranch");
vi.mock("@/lib/utils/tax-config");

const mockUseBranch = branchHook.useBranch as any;
const mockGetTaxPercentage = taxConfig.getTaxPercentage as any;

describe("useQuoteForm", () => {
  beforeEach(() => {
    mockUseBranch.mockReturnValue({
      currentBranchId: "test-branch-123",
    });

    mockGetTaxPercentage.mockResolvedValue(19.0);

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should initialize with default form data", () => {
    const { result } = renderHook(() => useQuoteForm());

    expect(result.current.formData).toEqual({
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
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.saving).toBe(false);
    expect(result.current.presbyopiaSolution).toBe("none");
    expect(result.current.lensType).toBe("optical");
    expect(result.current.discountType).toBe("amount");
  });

  it("should update individual fields correctly", () => {
    const { result } = renderHook(() => useQuoteForm());

    act(() => {
      result.current.updateField("frame_name", "Test Frame");
    });

    expect(result.current.formData.frame_name).toBe("Test Frame");
  });

  it("should update multiple fields at once", () => {
    const { result } = renderHook(() => useQuoteForm());

    act(() => {
      result.current.updateFields({
        frame_name: "Test Frame",
        frame_price: 10000,
        lens_cost: 5000,
      });
    });

    expect(result.current.formData.frame_name).toBe("Test Frame");
    expect(result.current.formData.frame_price).toBe(10000);
    expect(result.current.formData.lens_cost).toBe(5000);
  });

  it("should reset form to default values", () => {
    const { result } = renderHook(() => useQuoteForm());

    // Modify some fields first
    act(() => {
      result.current.updateFields({
        frame_name: "Modified Frame",
        lens_cost: 7500,
      });
    });

    // Reset the form
    act(() => {
      result.current.resetForm();
    });

    expect(result.current.formData.frame_name).toBe("");
    expect(result.current.formData.lens_cost).toBe(0);
    expect(result.current.presbyopiaSolution).toBe("none");
    expect(result.current.lensType).toBe("optical");
  });
});

// Mock timers for debounce testing
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});
