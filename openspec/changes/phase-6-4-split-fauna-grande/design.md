# Design: Phase 6.4 — Split Fauna Grande

## Technical Approach

Pure extract + compose across 361 files >300 lines. Each file splits into co-located sub-modules (`_components/`, `_hooks/`, `helpers/`) following Phase 6.1 patterns. Original file becomes a thin orchestrator. Zero behavioral changes — same public API, same props, same types.

7 god files >700 lines survived Phase 6.1 and are the top priority.

## Architecture Decisions

### Section Extraction for Components

| Option      | Tradeoff            | Decision                                    |
| ----------- | ------------------- | ------------------------------------------- |
| One PR/file | 361 PRs, impossible | Chained PRs per module (8), stacked-to-main |

### AI Tool Splitting

`products.ts` (802) bundles 8 tool definitions + Zod schemas + execute functions. Keep schemas + definition array in parent; extract each `execute` handler to `_actions/{actionName}.ts`.

### Form Section Extraction

Bounded sections (pricing, inventory, lens specs) already partially extracted. The remaining bulk is state/fetching — extract to `use{Entity}Form.ts` hook.

### Service/Gateway Splitting

`incident-response.ts` (723) → `responders/{category}.ts`. `mercadopago/gateway.ts` (717) → barrel over existing `gateway/` sub-modules.

## File Changes

### Priority 1 — 7 God Files (>700)

| File                                                                       | Lines | Strategy                                 |
| -------------------------------------------------------------------------- | ----- | ---------------------------------------- |
| `src/lib/ai/tools/products.ts`                                             | 802   | 8 execute handlers → `_actions/`         |
| `src/app/admin/field-operations/[id]/_components/FieldOpDetailContent.tsx` | 795   | Extract tabs to `_components/`           |
| `src/lib/ai/agent/agent.ts`                                                | 793   | Extract overloaded methods → sub-modules |
| `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx`      | 765   | Form state → `useEditProductForm.ts`     |
| `src/lib/security/incident-response.ts`                                    | 723   | Responders → `responders/`               |
| `src/lib/payments/mercadopago/gateway.ts`                                  | 717   | Barrel from `gateway/` sub-modules       |
| `src/lib/ai/tools/appointments.ts`                                         | 707   | Execute handlers → `_actions/`           |

### Priority 2 — 13 eslint-disable max-lines Files

Inspect each — some may have stale disables. Key candidates: `CashRegisterOrdersSection` (689 → dialogs), `QuotesContent` (680 → filters, rows, delete dialog), `POSPageContent` (643 → discount logic, keyboard hook), `behavioral-analytics` (639 → detection algorithms). Extract until the disable is removable.

### Priority 3 — Module-by-Module

| Module           | Files | Lines  | Strategy                                                              |
| ---------------- | :---: | :----: | --------------------------------------------------------------------- |
| **AI**           |  30   | 13,631 | Tool actions → `_actions/`, agent → sub-modules                       |
| **POS**          |  23   | 10,311 | Discount/keyboard → hooks, cash register dialogs → `_components/`     |
| **SaaS Mgmt**    |  31   | 12,872 | `SubscriptionDetailsContent` → `useSubDetails.ts`, extract info cards |
| **Products**     |  15   | 7,324  | Bulk route → handler files, edit product → form hook                  |
| **Quotes**       |  15   | 6,490  | Filter hook, table renderer, delete dialog                            |
| **Security**     |   9   | 4,550  | Each module → sub-modules by operation                                |
| **Payments**     |   6   | ~3,200 | MercadoPago gateway → barrel                                          |
| **Appointments** |   5   | ~2,100 | Settings page → section extraction                                    |

## Naming Conventions

| Source                   | Extracted To                                      |
| ------------------------ | ------------------------------------------------- |
| `*Content.tsx`           | `_components/*Tab.tsx`, `_components/*Dialog.tsx` |
| Tool file                | `_actions/{actionName}.ts`                        |
| `gateway.ts`             | Barrel from existing `gateway/` sub-modules       |
| `incident-response.ts`   | `responders/{category}.ts`                        |
| Component state/fetching | `_hooks/use{Entity}Form.ts`                       |
| Route handler            | `handlers/{operation}.ts`                         |

## Risk Mitigations

| Risk                      | Mitigation                                    |
| ------------------------- | --------------------------------------------- |
| Circular deps in AI tools | `_actions/*` are pure — no reverse imports    |
| Test imports break        | Tests import from barrels — keep them stable  |
| Merge conflicts           | Module-by-module PRs, POS+SaaS last           |
| Stale eslint-disable      | Remove only after confirming file under limit |

## Testing Strategy

`npm run build` (TS), `npm run lint` (verify removes), `npm run test` (zero new gaps). Per-PR visual smoke test.

## Chained PR Plan

```
PR 1 → AI Tools
PR 2 → Agent remaining split
PR 3 → Security
PR 4 → Payments
PR 5 → Products
PR 6 → POS
PR 7 → Quotes + Appointments
PR 8 → SaaS Management
```

Each targets `main`. Lowest conflict risk first (AI, isolated), highest last (POS, SaaS).

## Open Questions

- `FieldOpDetailContent.tsx` (795) — active development? May need to defer.
- Several 300-700 files already use extracted sub-components — verify post-split estimate.

## Rollback

No migration. Per PR: `git revert <merge-commit>`. No schema, flags, or config changes.
