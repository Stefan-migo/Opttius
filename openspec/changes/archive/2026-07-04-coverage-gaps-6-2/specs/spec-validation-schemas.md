# Delta: Validation Schemas — Expand Unit Test Coverage

**Change**: coverage-gaps-6-2 / add-unit-tests-validation-quotes-work-orders
**Type**: Expanded test coverage on existing schemas (no production changes).

Targets: `quotes.ts` (149 lines, 38% branch → 80%), `work-orders.ts` (128 lines, 34% branch → 80%).

---

## Test Target: `quotes.ts`

**File**: `src/__tests__/unit/lib/validation/schemas/quotes.test.ts`

### MODIFIED: `createQuoteSchema` — Expand coverage

Existing tests (18 cases) cover: valid quote, missing/invalid customer_id, presbyopia_solution enum, status enum, currency, far_lens_cost preprocessor, contact_lens axis, lens_treatments, lens_index.

#### ADDED Scenarios

##### Price preprocessors (all 5 paths)

| Field | Preprocessor Behavior | Test |
|-------|----------------------|------|
| `near_lens_cost` | string→number, null→null, empty→null | Parse string `"30000"` → 30000; null → null; `""` → null; negative → reject |
| `far_lens_cost` (missing branch) | NaN string → null | Parse `"invalid"` → null (not reject — preprocessor catches NaN) |
| `contact_lens_quantity` | null→1 (default) | Omit → `1`; provide `2` → `2` |
| `contact_lens_cost` | null→0 | Omit → `0`; provide `50000` → `50000` |
| `contact_lens_price` | null→0 | Omit → `0`; provide `100000` → `100000` |

##### Boolean defaults

| Field | Default | Test |
|-------|---------|------|
| `customer_own_frame` | `false` | Omit → `false`; set `true` → `true` |
| `customer_own_near_frame` | `false` | Omit → `false`; set `true` → `true` |
| `near_frame_price_includes_tax` | `false` | Omit → `false`; set `true` → `true` |

##### Enum boundary (presbyopia_solution)

- All 5 values already tested. Add explicit test for each default: `presbyopia_solution` omitted → defaults to `"none"`.

##### Numeric boundaries

| Field | Boundary | Test |
|-------|----------|------|
| `lens_tint_percentage` | 0–100 | Accept `0`, `50`, `100`; reject `-1`, `101` |
| `discount_percentage` | 0–100 | Accept `0`, `50`, `100`; reject `-1`, `101` |
| `contact_lens_rx_axis_od/os` | 0–180 int | Accept `0`, `90`, `180`; reject `-1`, `200`, `90.5` |
| `frame_cost`, `lens_cost`, `treatments_cost`, `labor_cost`, `subtotal`, `tax_amount`, `discount_amount`, `total_amount` | non-negative | Accept `0`, `50000`; reject `-1` |

##### String maxLength boundaries

| Field | Max | Test |
|-------|-----|------|
| `frame_name`, `notes`, `customer_notes`, `terms_and_conditions` | 255 or 5000 | Accept boundary length string; reject overflow |
| `currency` | 10 | Accept `"CLP"`; reject `"VERYLONGCURRENCY"` |

##### Optional UUIDs — null/undefined

- `prescription_id`, `frame_product_id`, `lens_family_id`, `near_lens_family_id`, `contact_lens_family_id`, `far_lens_family_id`, `branch_id`, `field_operation_id` MUST accept null, undefined, and valid UUID.

##### Edge: string→number coercion failure

- `far_lens_cost: "abc"` → preprocessor catches NaN → returns null (not a validation error, field becomes null).

##### Contact lens Rx fields

- All `contact_lens_rx_*` fields accept numbers and null.

---

## Test Target: `work-orders.ts`

**File**: `src/__tests__/unit/lib/validation/schemas/work-orders.test.ts`

### MODIFIED: `createWorkOrderSchema` — Expand coverage

Existing tests (22 cases) cover: valid, missing/invalid customer_id, missing frame_name/lens_type/lens_material/total_amount, string→number coercion on total_amount, negative total_amount, presbyopia_solution enum, status enum, payment_status enum, far_lens_cost preprocessor, currency, lens_index, lens_treatments.

#### ADDED Scenarios

##### Preprocessors (missing branches)

| Field | Preprocessor Behavior | Test |
|-------|----------------------|------|
| `near_lens_cost` | string→number, null→null, empty→null | Parse string `"20000"` → 20000; null → null; `""` → null; negative → reject |
| `far_lens_cost` NaN branch | string like `"abc"` → null | preprocessor catches NaN → returns null |

##### Required fields (min length on strings)

| Field | Constraint | Test |
|-------|-----------|------|
| `frame_name` | `min(1)` | Omitted → error (required); whitespace-only → error after trim |
| `lens_type` | `min(1)` | Omitted → error |
| `lens_material` | `min(1)` | Omitted → error |

##### Boolean default

- `customer_own_frame` omitted → `false`; set `true` → `true`

##### Enum coverage — payment_status

- All 4 values: `"pending"`, `"partial"`, `"paid"`, `"refunded"` — accept each.
- Invalid value → reject.

##### Numeric boundaries

| Field | Boundary | Test |
|-------|----------|------|
| `lens_tint_percentage` | 0–100 | Accept `0`, `100`; reject `-1`, `101` |
| `deposit_amount` | non-negative | Accept `0`, `50000`; reject `-1` |
| `balance_amount` | positive (priceSchema) | Accept positive; reject `0` or negative |

##### Optional UUIDs — null/undefined

- `prescription_id`, `quote_id`, `frame_product_id`, `lens_family_id`, `far_lens_family_id`, `near_lens_family_id`, `pos_order_id`, `assigned_to`, `branch_id` MUST accept null, undefined, and valid UUID.

##### String maxLength boundaries

- `frame_name`, `frame_brand`, `frame_model`, `frame_sku`, `frame_serial_number`, `lens_type`, `lens_material`, `lab_name`, `lab_contact`, `lab_order_number`, `payment_method`, `internal_notes`, `customer_notes` — accept boundary; rejected if overflow.

##### total_amount edge (priceSchema preprocessor)

- `total_amount: ""` → preprocessor returns `undefined` → required_error thrown.
- `total_amount: "invalid"` → preprocessor returns `undefined` → required_error thrown.

##### status and presbyopia_solution defaults

- Status omitted → defaults to `"quote"`.
- Presbyopia_solution omitted → defaults to `"none"`.

---

## Acceptance Criteria

- [ ] `npx vitest run src/__tests__/unit/lib/validation/schemas/quotes.test.ts` — passes + ≥80% branch coverage
- [ ] `npx vitest run src/__tests__/unit/lib/validation/schemas/work-orders.test.ts` — passes + ≥80% branch coverage
- [ ] `npm run test:unit` — no regressions
