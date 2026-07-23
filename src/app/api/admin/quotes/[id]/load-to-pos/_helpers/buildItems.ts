export function buildFrameItem(quote: Record<string, unknown>) {
  const hasFrameData = quote.frame_product_id || quote.frame_name ||
    (quote.frame_brand && quote.frame_model) || quote.frame_price !== null;

  if (!hasFrameData) return null;

  if (quote.customer_own_frame) {
    return {
      type: "product", id: `frame-customer-own-${quote.id}`,
      name: quote.frame_name || "Marco del cliente", price: 0,
      sku: "FRAME-CUSTOMER-OWN", quantity: 1, customer_own_frame: true,
      frame_brand: quote.frame_brand, frame_model: quote.frame_model,
      frame_color: quote.frame_color, frame_size: quote.frame_size,
    };
  }

  const framePrice = (quote.frame_price as number) > 0
    ? quote.frame_price : (quote.frame_product as Record<string, unknown>)?.price as number > 0
      ? (quote.frame_product as Record<string, unknown>)?.price : 0;
  const frameId = quote.frame_product_id || `frame-manual-${quote.id}`;

  return {
    type: "product", id: frameId,
    name: quote.frame_name || (quote.frame_product as Record<string, unknown>)?.name ||
      (quote.frame_brand && quote.frame_model ? `${quote.frame_brand} ${quote.frame_model}` : "Marco"),
    price: framePrice, sku: quote.frame_sku || (quote.frame_product as Record<string, unknown>)?.sku || "FRAME",
    barcode: (quote.frame_product as Record<string, unknown>)?.barcode,
    featured_image: (quote.frame_product as Record<string, unknown>)?.featured_image,
    inventory_quantity: (quote.frame_product as Record<string, unknown>)?.inventory_quantity || 0,
    quantity: 1,
    frame_brand: quote.frame_brand, frame_model: quote.frame_model,
    frame_color: quote.frame_color, frame_size: quote.frame_size, customer_own_frame: false,
  };
}

export function buildNearFrameItem(quote: Record<string, unknown>) {
  const isTwoSeparate = quote.presbyopia_solution === "two_separate";
  if (!isTwoSeparate) return null;

  const hasData = quote.near_frame_product_id || quote.near_frame_name ||
    (quote.near_frame_brand && quote.near_frame_model) ||
    ((quote.near_frame_price as number) !== null && (quote.near_frame_price as number) > 0);
  if (!hasData) return null;

  if (quote.customer_own_near_frame) {
    return {
      type: "product", id: `near-frame-customer-own-${quote.id}`,
      name: quote.near_frame_name || "Marco de cerca del cliente", price: 0,
      sku: "NEAR-FRAME-CUSTOMER-OWN", quantity: 1, inventory_quantity: 999,
      customer_own_frame: true, customer_own_near_frame: true,
      frame_brand: quote.near_frame_brand, frame_model: quote.near_frame_model,
      frame_color: quote.near_frame_color, frame_size: quote.near_frame_size, is_near_frame: true,
    };
  }

  const price = (quote.near_frame_price as number) > 0 ? quote.near_frame_price : (quote.near_frame_cost || 0);
  return {
    type: "product", id: quote.near_frame_product_id || `near-frame-manual-${quote.id}`,
    name: quote.near_frame_name || (quote.near_frame_brand && quote.near_frame_model
      ? `${quote.near_frame_brand} ${quote.near_frame_model} (Cerca)` : "Marco de Cerca"),
    price, sku: quote.near_frame_sku || "FRAME-NEAR", quantity: 1, inventory_quantity: 999,
    frame_brand: quote.near_frame_brand, frame_model: quote.near_frame_model,
    frame_color: quote.near_frame_color, frame_size: quote.near_frame_size,
    customer_own_frame: false, is_near_frame: true,
  };
}

export function buildLensItems(quote: Record<string, unknown>) {
  const items: unknown[] = [];
  const isTwoSeparate = quote.presbyopia_solution === "two_separate";

  if (!quote.lens_type || quote.lens_type === "Lentes de contacto" || !quote.lens_material) {
    return items;
  }

  if (isTwoSeparate && quote.far_lens_family_id) {
    items.push({
      type: "lens_complete", id: `lens-far-${quote.id}`,
      name: `Lente Lejos ${quote.lens_type} ${quote.lens_material}`,
      price: quote.far_lens_cost || 0, quantity: 1,
      lens_family_id: quote.far_lens_family_id, lens_type: quote.lens_type,
      lens_material: quote.lens_material, lens_index: quote.lens_index,
      lens_treatments: quote.lens_treatments || [], lens_tint_color: quote.lens_tint_color,
      lens_tint_percentage: quote.lens_tint_percentage, treatments_cost: 0, labor_cost: 0,
      prescription_id: quote.prescription_id, is_far_lens: true,
    });
  }
  if (isTwoSeparate && quote.near_lens_family_id) {
    items.push({
      type: "lens_complete", id: `lens-near-${quote.id}`,
      name: `Lente Cerca ${quote.lens_type} ${quote.lens_material}`,
      price: quote.near_lens_cost || 0, quantity: 1,
      lens_family_id: quote.near_lens_family_id, lens_type: quote.lens_type || "reading",
      lens_material: quote.lens_material, lens_index: quote.lens_index,
      lens_treatments: quote.lens_treatments || [], lens_tint_color: quote.lens_tint_color,
      lens_tint_percentage: quote.lens_tint_percentage, treatments_cost: 0, labor_cost: 0,
      prescription_id: quote.prescription_id, is_near_lens: true,
    });
  }
  if (!isTwoSeparate) {
    items.push({
      type: "lens_complete", id: `lens-${quote.id}`,
      name: `Lente ${quote.lens_type} ${quote.lens_material}`,
      price: quote.lens_cost || 0, quantity: 1,
      lens_family_id: quote.lens_family_id, lens_type: quote.lens_type,
      lens_material: quote.lens_material, lens_index: quote.lens_index,
      lens_treatments: quote.lens_treatments || [], lens_tint_color: quote.lens_tint_color,
      lens_tint_percentage: quote.lens_tint_percentage,
      treatments_cost: quote.treatments_cost || 0, labor_cost: quote.labor_cost || 0,
      prescription_id: quote.prescription_id,
    });
  } else if (!quote.far_lens_family_id && !quote.near_lens_family_id) {
    items.push({
      type: "lens_complete", id: `lens-${quote.id}`,
      name: `Lente ${quote.lens_type} ${quote.lens_material}`,
      price: quote.lens_cost || 0, quantity: 1,
      lens_family_id: quote.lens_family_id, lens_type: quote.lens_type,
      lens_material: quote.lens_material, lens_index: quote.lens_index,
      lens_treatments: quote.lens_treatments || [], lens_tint_color: quote.lens_tint_color,
      lens_tint_percentage: quote.lens_tint_percentage,
      treatments_cost: quote.treatments_cost || 0, labor_cost: quote.labor_cost || 0,
      prescription_id: quote.prescription_id,
    });
  }
  return items;
}

export function buildContactLensItem(quote: Record<string, unknown>) {
  if (quote.lens_type !== "Lentes de contacto" && !quote.contact_lens_family_id) return null;
  return {
    type: "contact_lens", id: `contact-lens-${quote.id}`,
    name: `Lentes de Contacto${(quote.contact_lens_quantity as number) > 1 ? ` - ${quote.contact_lens_quantity} caja(s)` : ""}`,
    price: quote.contact_lens_price ?? quote.contact_lens_cost ?? 0, quantity: 1,
    contact_lens_family_id: quote.contact_lens_family_id,
    contact_lens_quantity: quote.contact_lens_quantity || 1,
    prescription_id: quote.prescription_id,
  };
}

export function buildTreatmentsLaborItems(quote: Record<string, unknown>) {
  const items: unknown[] = [];
  const isTwoSeparate = quote.presbyopia_solution === "two_separate";
  if (isTwoSeparate && (quote.treatments_cost as number) > 0) {
    items.push({
      type: "product", id: `treatments-two-separate-${quote.id}`,
      name: `Tratamientos: ${(quote.lens_treatments as string[])?.join(", ") || "Varios"}`,
      price: quote.treatments_cost || 0, sku: "TREATMENTS", quantity: 1, inventory_quantity: 999,
    });
  }
  if (isTwoSeparate && (quote.labor_cost as number) > 0) {
    items.push({
      type: "product", id: `labor-two-separate-${quote.id}`,
      name: "Mano de obra (montaje)", price: quote.labor_cost || 0,
      sku: "LABOR", quantity: 1, inventory_quantity: 999,
    });
  }
  return items;
}
