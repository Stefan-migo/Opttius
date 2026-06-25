/**
 * posCartBuilder — Pure cart composition for the Optical Sale form.
 *
 * Takes component state in, returns CartItem[] out.
 * Stateless — no React hooks, no side effects.
 */

import type {
  POSProduct,
  Treatment,
  OrderFormData,
  ExternalPrescriptionData,
} from "./POSAdvancedSale.types";

export interface CartItem {
  product: POSProduct;
  quantity: number;
  unitPrice: number;
  metadata?: Record<string, unknown>;
}

export interface CartBuilderInput {
  orderFormData: OrderFormData;
  selectedFrame: POSProduct | null;
  selectedNearFrame: POSProduct | null;
  customerOwnNearFrame: boolean;
  lensFamilies: readonly { id: string; name: string; lens_type: string }[];
  treatments: Treatment[];
  currentLensPrice: number;
  treatmentsPrice: number;
  contactLensConfig: {
    family_id: string;
    family_name: string;
    family_brand: string;
    price: number;
    prescription: Record<string, unknown>;
    quantity: number;
    inStock: boolean;
  } | null;
  useExternalPrescription: boolean;
  externalPrescriptionData: ExternalPrescriptionData;
}

/**
 * Build cart items from current sale form state.
 * Pure function — no side effects.
 */
export function buildCartItems(input: CartBuilderInput): CartItem[] {
  const {
    orderFormData,
    selectedFrame,
    selectedNearFrame,
    customerOwnNearFrame,
    lensFamilies,
    treatments,
    currentLensPrice,
    treatmentsPrice,
    contactLensConfig,
    useExternalPrescription,
    externalPrescriptionData,
  } = input;

  const items: CartItem[] = [];
  const baseTimestamp = Date.now();

  // Add Contact Lens if configured
  if (contactLensConfig && orderFormData.lens_type === "contact") {
    items.push({
      product: {
        id: `contact-lens-${contactLensConfig.family_id}-${baseTimestamp}`,
        name: `${contactLensConfig.family_name} (${contactLensConfig.family_brand}) - ${contactLensConfig.quantity} caja(s)`,
        sku: `CL-${contactLensConfig.family_id.slice(0, 8)}`,
        price: contactLensConfig.price,
        price_includes_tax: true,
        product_type: "contact_lens",
      },
      quantity: 1,
      unitPrice: contactLensConfig.price,
      metadata: {
        isContactLens: true,
        contactLensFamilyId: contactLensConfig.family_id,
        contactLensFamilyName: contactLensConfig.family_name,
        contactLensBrand: contactLensConfig.family_brand,
        contactLensPrescription: contactLensConfig.prescription,
        contactLensQuantity: contactLensConfig.quantity,
        contactLensInStock: contactLensConfig.inStock,
      },
    });
  }

  // Add frame(s) if selected
  else if (selectedFrame && !orderFormData.customer_own_frame) {
    const frameName =
      orderFormData.presbyopia_solution === "two_separate"
        ? `${orderFormData.frame_name || selectedFrame.name} (Lejos)`
        : orderFormData.frame_name || selectedFrame.name;

    items.push({
      product: {
        ...selectedFrame,
        id: `${selectedFrame.id}-${baseTimestamp}`,
        name: frameName,
      },
      quantity: 1,
      unitPrice: selectedFrame.price || 0,
      metadata: {
        isFrame: true,
        frameProductId: selectedFrame.id,
        frameType:
          orderFormData.presbyopia_solution === "two_separate"
            ? "distance"
            : "single",
      },
    });

    // Add second frame for near vision
    if (
      orderFormData.presbyopia_solution === "two_separate" &&
      selectedNearFrame &&
      !customerOwnNearFrame
    ) {
      const nearFrameName = `${orderFormData.frame_name || selectedNearFrame.name} (Cerca)`;
      items.push({
        product: {
          ...selectedNearFrame,
          id: `${selectedNearFrame.id}-${baseTimestamp}-near`,
          name: nearFrameName,
        },
        quantity: 1,
        unitPrice: selectedNearFrame.price || 0,
        metadata: {
          isFrame: true,
          frameProductId: selectedNearFrame.id,
          frameType: "near",
        },
      });
    }
  }

  // Add lens product(s) — only for optical lenses (not contact lenses)
  if (orderFormData.lens_type === "vision" && orderFormData.lens_family_id) {
    const lensFamily = lensFamilies.find(
      (f) => f.id === orderFormData.lens_family_id,
    );
    const lensName = lensFamily ? `${lensFamily.name}` : "Lentes";

    items.push({
      product: {
        id: `lens-${orderFormData.lens_family_id}-${baseTimestamp}`,
        name:
          orderFormData.presbyopia_solution === "two_separate"
            ? `${lensName} (Lejos)`
            : lensName,
        sku: "LENS",
        price: currentLensPrice,
        price_includes_tax: true,
      },
      quantity: 1,
      unitPrice: currentLensPrice,
      metadata: {
        isLens: true,
        lensFamilyId: orderFormData.lens_family_id,
        lensType: orderFormData.lens_type,
        lensSourcingType: orderFormData.lens_sourcing_type,
        presbyopiaSolution: orderFormData.presbyopia_solution,
        lensVisionType:
          orderFormData.presbyopia_solution === "two_separate"
            ? "distance"
            : "single",
        externalPrescription: useExternalPrescription
          ? externalPrescriptionData
          : null,
      },
    });

    // Add near lens for two_separate solution
    if (
      orderFormData.presbyopia_solution === "two_separate" &&
      orderFormData.near_lens_family_id
    ) {
      const nearLensFamily = lensFamilies.find(
        (f) => f.id === orderFormData.near_lens_family_id,
      );
      const nearLensName = nearLensFamily
        ? `${nearLensFamily.name} - Lentes Ópticos`
        : "Lentes de Cerca";

      const nearLensPrice = nearLensFamily
        ? Math.round(currentLensPrice * 0.7)
        : currentLensPrice;

      items.push({
        product: {
          id: `lens-${orderFormData.near_lens_family_id}-${baseTimestamp}-near`,
          name: `${nearLensName} (Cerca)`,
          sku: "LENS",
          price: nearLensPrice,
          price_includes_tax: true,
        },
        quantity: 1,
        unitPrice: nearLensPrice,
        metadata: {
          isLens: true,
          lensFamilyId: orderFormData.near_lens_family_id,
          lensType: orderFormData.lens_type,
          presbyopiaSolution: orderFormData.presbyopia_solution,
          lensVisionType: "near",
          externalPrescription: useExternalPrescription
            ? externalPrescriptionData
            : null,
        },
      });
    }
  }

  // Add treatments
  if (orderFormData.treatment_ids.length > 0) {
    const selectedTreatments = orderFormData.treatment_ids
      .map((id) => treatments.find((t) => t.id === id))
      .filter(Boolean) as Treatment[];

    if (selectedTreatments.length > 0) {
      items.push({
        product: {
          id: `treatments-${baseTimestamp}`,
          name: `Tratamientos: ${selectedTreatments.map((t) => t.label).join(", ")}`,
          sku: "TREATMENTS",
          price: treatmentsPrice,
          price_includes_tax: true,
        },
        quantity: 1,
        unitPrice: treatmentsPrice,
        metadata: {
          isTreatment: true,
          treatmentIds: orderFormData.treatment_ids,
        },
      });
    }
  }

  // Add labor if any
  if (orderFormData.labor_cost > 0) {
    items.push({
      product: {
        id: `labor-${baseTimestamp}`,
        name: "Mano de Obra",
        sku: "LABOR",
        price: orderFormData.labor_cost,
        price_includes_tax: true,
      },
      quantity: 1,
      unitPrice: orderFormData.labor_cost,
      metadata: {
        isLabor: true,
      },
    });
  }

  return items;
}
