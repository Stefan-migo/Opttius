/**
 * Tests for posCartBuilder.ts — pure cart composition.
 *
 * Coverage:
 *   - Empty input → empty array
 *   - Contact lenses → contact lens item (frame skipped via else-if)
 *   - Single frame (not own frame) → frame item
 *   - Two separate frames (presbyopia) → distance + near frame items
 *   - Customer own frame → no frame items
 *   - Vision lens (single) → lens item
 *   - Vision lens (two_separate) → distance + near lens items
 *   - Treatments selected → treatment item
 *   - Labor cost > 0 → labor item
 *   - Combined: frame + lens + treatments + labor
 */
import { describe, expect, it } from "vitest";
import { buildCartItems } from "../posCartBuilder";
import type { CartBuilderInput } from "../posCartBuilder";
import type { OrderFormData, Treatment } from "../POSAdvancedSale.types";

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeInput(overrides?: Partial<CartBuilderInput>): CartBuilderInput {
  return {
    orderFormData: {
      lens_family_id: null,
      lens_family_name: null,
      near_lens_family_id: null,
      near_lens_family_name: null,
      lens_type: "vision",
      lens_sourcing_type: "stock",
      presbyopia_solution: "single",
      treatment_ids: [],
      labor_cost: 0,
      frame_name: "",
      frame_sku: "",
      near_frame_name: "",
      near_frame_sku: "",
      customer_own_frame: false,
      notes: "",
    },
    selectedFrame: null,
    selectedNearFrame: null,
    customerOwnNearFrame: false,
    lensFamilies: [],
    treatments: [],
    currentLensPrice: 0,
    treatmentsPrice: 0,
    contactLensConfig: null,
    useExternalPrescription: false,
    externalPrescriptionData: {
      prescription_date: "",
      expiration_date: "",
      prescription_number: "",
      issued_by: "",
      issued_by_license: "",
      od_sphere: "",
      od_cylinder: "",
      od_axis: "",
      od_add: "",
      os_sphere: "",
      os_cylinder: "",
      os_axis: "",
      os_add: "",
      pd: "",
      near_pd: "",
      frame_pd: "",
      height_segmentation: "",
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("buildCartItems", () => {
  it("returns empty array when no items are configured", () => {
    const items = buildCartItems(makeInput());
    expect(items).toEqual([]);
  });

  describe("contact lenses", () => {
    it("adds a contact lens item when contactLensConfig is set and lens_type is contact", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            lens_type: "contact",
          },
          contactLensConfig: {
            family_id: "cl-1",
            family_name: "FreshLook",
            family_brand: "Alcon",
            price: 25000,
            prescription: { sphere: "-2.00" },
            quantity: 2,
            inStock: true,
          },
        }),
      );

      expect(items).toHaveLength(1);
      expect(items[0].product.name).toContain("FreshLook");
      expect(items[0].product.name).toContain("Alcon");
      expect(items[0].product.product_type).toBe("contact_lens");
      expect(items[0].unitPrice).toBe(25000);
      expect(items[0].quantity).toBe(1);
      expect(items[0].metadata?.isContactLens).toBe(true);
      expect(items[0].metadata?.contactLensFamilyId).toBe("cl-1");
      expect(items[0].metadata?.contactLensQuantity).toBe(2);
    });
  });

  describe("frame items", () => {
    it("adds a frame item when selectedFrame is set and not customer own", () => {
      const items = buildCartItems(
        makeInput({
          selectedFrame: {
            id: "frame-1",
            name: "Ray-Ban Aviator",
            price: 85000,
          },
        }),
      );

      expect(items).toHaveLength(1);
      expect(items[0].product.name).toBe("Ray-Ban Aviator");
      expect(items[0].unitPrice).toBe(85000);
      expect(items[0].metadata?.isFrame).toBe(true);
      expect(items[0].metadata?.frameType).toBe("single");
    });

    it("adds distance and near frame items for two_separate presbyopia", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            presbyopia_solution: "two_separate",
            frame_name: "Marco Pro",
          },
          selectedFrame: { id: "f-dist", name: "Frame Distancia", price: 90000 },
          selectedNearFrame: {
            id: "f-near",
            name: "Frame Cerca",
            price: 70000,
          },
          customerOwnNearFrame: false,
        }),
      );

      expect(items).toHaveLength(2);
      expect(items[0].product.name).toContain("(Lejos)");
      expect(items[0].unitPrice).toBe(90000);
      expect(items[0].metadata?.frameType).toBe("distance");
      expect(items[1].product.name).toContain("(Cerca)");
      expect(items[1].unitPrice).toBe(70000);
      expect(items[1].metadata?.frameType).toBe("near");
    });

    it("skips near frame when customerOwnNearFrame is true", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            presbyopia_solution: "two_separate",
          },
          selectedFrame: { id: "f-dist", name: "Frame Distancia", price: 90000 },
          selectedNearFrame: { id: "f-near", name: "Frame Cerca", price: 70000 },
          customerOwnNearFrame: true,
        }),
      );

      expect(items).toHaveLength(1);
      expect(items[0].metadata?.frameType).toBe("distance");
    });

    it("skips frame when customer_own_frame is true", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            customer_own_frame: true,
          },
          selectedFrame: { id: "frame-1", name: "Own Frame", price: 50000 },
        }),
      );

      expect(items).toHaveLength(0);
    });

    it("uses orderFormData.frame_name when provided", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            frame_name: "Custom Label",
          },
          selectedFrame: { id: "f-1", name: "Internal Name", price: 60000 },
        }),
      );

      expect(items[0].product.name).toBe("Custom Label");
    });
  });

  describe("lens items", () => {
    it("adds a lens item for vision lens_type with lens_family_id", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            lens_type: "vision",
            lens_family_id: "lf-1",
            lens_sourcing_type: "stock",
          },
          lensFamilies: [{ id: "lf-1", name: "Monofocal Básico", lens_type: "vision" }],
          currentLensPrice: 45000,
        }),
      );

      expect(items).toHaveLength(1);
      expect(items[0].product.name).toBe("Monofocal Básico");
      expect(items[0].unitPrice).toBe(45000);
      expect(items[0].metadata?.isLens).toBe(true);
      expect(items[0].metadata?.lensFamilyId).toBe("lf-1");
      expect(items[0].metadata?.lensVisionType).toBe("single");
    });

    it("skips lens item when lens_type is not vision", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            lens_type: "contact",
            lens_family_id: "lf-1",
          },
          currentLensPrice: 45000,
        }),
      );

      // Contact lenses use the contactLensConfig path, not the lens path
      const lensItems = items.filter((i) => i.metadata?.isLens);
      expect(lensItems).toHaveLength(0);
    });

    it("adds distance and near lens items for two_separate solution", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            lens_type: "vision",
            lens_family_id: "lf-5",
            lens_sourcing_type: "surfaced",
            presbyopia_solution: "two_separate",
            near_lens_family_id: "lf-1",
          },
          lensFamilies: [
            { id: "lf-5", name: "Progresivo Premium", lens_type: "vision" },
            { id: "lf-1", name: "Monofocal Básico", lens_type: "vision" },
          ],
          currentLensPrice: 80000,
        }),
      );

      expect(items).toHaveLength(2);
      // Distance lens
      expect(items[0].product.name).toContain("(Lejos)");
      expect(items[0].metadata?.lensVisionType).toBe("distance");
      expect(items[0].unitPrice).toBe(80000);
      // Near lens (70% of currentLensPrice)
      expect(items[1].product.name).toContain("(Cerca)");
      expect(items[1].metadata?.lensVisionType).toBe("near");
      expect(items[1].unitPrice).toBe(Math.round(80000 * 0.7));
    });

    it("includes externalPrescription in lens metadata when useExternalPrescription", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            lens_family_id: "lf-1",
          },
          lensFamilies: [{ id: "lf-1", name: "Monofocal", lens_type: "vision" }],
          currentLensPrice: 45000,
          useExternalPrescription: true,
        }),
      );

      expect(items[0].metadata?.externalPrescription).toBeTruthy();
      expect(items[0].metadata?.externalPrescription).toHaveProperty("prescription_number");
    });
  });

  describe("treatments", () => {
    it("adds a treatment item when treatment_ids has matches", () => {
      const treatments: Treatment[] = [
        { id: "t1", label: "Antirreflejo", value: "ar", cost: 15000, category: "coating" },
        { id: "t2", label: "Fotocromático", value: "photochromic", cost: 25000, category: "coating" },
      ];

      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            treatment_ids: ["t1", "t2"],
          },
          treatments,
          treatmentsPrice: 40000,
        }),
      );

      expect(items).toHaveLength(1);
      expect(items[0].product.name).toContain("Antirreflejo");
      expect(items[0].product.name).toContain("Fotocromático");
      expect(items[0].unitPrice).toBe(40000);
      expect(items[0].metadata?.isTreatment).toBe(true);
      expect(items[0].metadata?.treatmentIds).toEqual(["t1", "t2"]);
    });

    it("skips treatment item when no treatment IDs match", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            treatment_ids: ["nonexistent"],
          },
          treatments: [{ id: "t1", label: "AR", value: "ar", cost: 5000, category: "coating" }],
          treatmentsPrice: 5000,
        }),
      );

      expect(items).toHaveLength(0);
    });
  });

  describe("labor", () => {
    it("adds a labor item when labor_cost > 0", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            labor_cost: 15000,
          },
        }),
      );

      expect(items).toHaveLength(1);
      expect(items[0].product.name).toBe("Mano de Obra");
      expect(items[0].unitPrice).toBe(15000);
      expect(items[0].metadata?.isLabor).toBe(true);
    });

    it("skips labor item when labor_cost is 0", () => {
      const items = buildCartItems(
        makeInput({
          orderFormData: {
            ...makeInput().orderFormData,
            labor_cost: 0,
          },
        }),
      );

      const laborItems = items.filter((i) => i.metadata?.isLabor);
      expect(laborItems).toHaveLength(0);
    });
  });

  describe("combined scenario", () => {
    it("builds a complete cart with frame, lens, treatments, and labor", () => {
      const items = buildCartItems(
        makeInput({
          selectedFrame: { id: "f-1", name: "Oakley", price: 120000 },
          orderFormData: {
            ...makeInput().orderFormData,
            lens_family_id: "lf-2",
            lens_sourcing_type: "stock",
            treatment_ids: ["t1"],
            labor_cost: 10000,
          },
          lensFamilies: [{ id: "lf-2", name: "Antifatiga", lens_type: "vision" }],
          treatments: [{ id: "t1", label: "AR", value: "ar", cost: 12000, category: "coating" }],
          currentLensPrice: 60000,
          treatmentsPrice: 12000,
        }),
      );

      expect(items).toHaveLength(4);

      const frame = items.find((i) => i.metadata?.isFrame);
      expect(frame?.unitPrice).toBe(120000);

      const lens = items.find((i) => i.metadata?.isLens);
      expect(lens?.unitPrice).toBe(60000);

      const treatment = items.find((i) => i.metadata?.isTreatment);
      expect(treatment?.unitPrice).toBe(12000);

      const labor = items.find((i) => i.metadata?.isLabor);
      expect(labor?.unitPrice).toBe(10000);
    });
  });
});
