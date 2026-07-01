# Tasks: Eliminate Duplicate Zod Helpers

## Review Workload Forecast

| Field                   | Value                            |
| ----------------------- | -------------------------------- |
| Estimated changed lines | ~5 (2 modified, 1 replaced file) |
| 400-line budget risk    | Low                              |
| Chained PRs recommended | No                               |
| Suggested split         | Single PR                        |
| Delivery strategy       | single-pr                        |

```text
Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: Low
```

### Suggested Work Units

| Unit | Goal                                             | Likely PR | Notes                                 |
| ---- | ------------------------------------------------ | --------- | ------------------------------------- |
| 1    | Fix canonical import + barrel duplicate + verify | PR 1      | Single atomic change, no dependencies |

## Phase 1: Core Changes

- [ ] 1.1 **Update canonical import** — In `src/lib/validation/zod-helpers.ts`, change line 4 from `import { ValidationError } from "./errors"` to `import { ValidationError } from "@/lib/api/errors"`. This preserves `instanceof` identity for the 23 consumers that catch `ValidationError` from `@/lib/api/errors`.
- [ ] 1.2 **Barrel the duplicate** — Replace entire content of `src/lib/api/validation/zod-helpers.ts` with: `export * from "@/lib/validation/zod-helpers";`. The 49 existing imports continue resolving through the barrel.

## Phase 2: Verification

- [ ] 2.1 **Type-check** — Run `npm run type-check` (or `npx tsc --noEmit`). Must pass with zero errors.
- [ ] 2.2 **Unit tests** — Run `npm run test:unit`. Existing tests that exercise zod-helpers must still pass.
- [ ] 2.3 **Confirm barrel resolution** — Grep `src/lib/api/validation/zod-helpers.ts` to confirm it's now a single re-export line, not the old 373-line file. Spot-check one consumer import (e.g., `src/lib/api/validation/index.ts` or any route handler) to verify the barrel resolves.
