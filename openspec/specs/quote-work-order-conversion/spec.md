# Spec: quote-work-order-conversion

## Context

`POST /api/admin/quotes/[id]/convert` passes `quote.lens_type` / `quote.lens_material` raw into `lab_work_orders`, where both columns are `NOT NULL` with a CHECK constraint allowing only optical lens types. Frame-only and contact-lens quotes carry NULL or the literal `'Lentes de contacto'`, so convert 500s. `process_pos_sale` already tolerates missing lens data via `COALESCE`; this spec makes convert consistent with that reference contract.

## ADDED Requirements

### Requirement: Convert defaults for missing lens and frame data

When creating a work order from a quote, the convert route MUST default absent optical values: `lens_type` to `'single_vision'`, `lens_material` to `'cr39'`, and `frame_name` to `'Marco'` (mirroring the `COALESCE` behavior of `process_pos_sale`). Convert MUST NOT fail with a NOT NULL or CHECK violation for frame-only quotes.

#### Scenario: Frame-only quote converts successfully

- GIVEN a quote with `customer_id`, `frame_product_id`, `frame_name`, `frame_price`, `total_amount` and no lens fields
- WHEN POST /api/admin/quotes/[id]/convert is called
- THEN a work order is created and `work_order_number` is returned
- AND `lens_type` is `'single_vision'` and `lens_material` is `'cr39'`

#### Scenario: Missing frame name falls back to Marco

- GIVEN a quote with no `frame_name`
- WHEN the quote is converted
- THEN the work order's `frame_name` is `'Marco'`

### Requirement: Lens quote preserves lens data

For quotes that carry lens data, convert MUST preserve `lens_type` and `lens_material` unchanged; the defaults apply only when the values are absent.

#### Scenario: Lens quote keeps its lens type and material

- GIVEN a quote with `lens_type: 'progressive'` and `lens_material: 'polycarbonate'`
- WHEN the quote is converted
- THEN the work order records `lens_type: 'progressive'` and `lens_material: 'polycarbonate'`

### Requirement: Contact-lens literal mapping

If a quote's `lens_type` is the literal `'Lentes de contacto'`, convert MUST map it to `'single_vision'` to satisfy the `lab_work_orders_lens_type_check` constraint and MUST preserve all `contact_lens_*` fields on the work order.

#### Scenario: Contact-lens literal is mapped and contact fields preserved

- GIVEN a quote with `lens_type: 'Lentes de contacto'` and `contact_lens_rx_sphere_od` set
- WHEN the quote is converted
- THEN the work order's `lens_type` is `'single_vision'`
- AND `contact_lens_rx_sphere_od` is preserved

### Requirement: Contact-lens line items produce no work orders (recorded decision)

Contact-lens line items do NOT produce work orders (direct delivery per the POS skill and load-to-pos `buildItems.ts`). Work-order production for contact-lens-only quotes is OUT OF SCOPE for this change — recorded decision, deferred as a future item. The literal mapping requirement applies defensively to frame/lens quotes that carry the literal and to mixed quotes that are converted; the fix MUST NOT regress the direct-delivery flow (load-to-pos).

#### Scenario: Contact-lens-only quote conversion is documented out of scope

- GIVEN a quote whose only optical content is a contact lens (`contact_lens_family_id` set, no frame/lens items)
- THEN work-order production for such quotes is a future item, not part of this change
- AND load-to-pos direct delivery for contact-lens items remains unchanged
