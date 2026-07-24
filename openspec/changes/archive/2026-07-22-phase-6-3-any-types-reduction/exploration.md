## Exploration: Phase 6.3 — `any` Type Reduction

### Current State

The Opttius codebase has **185 lines** containing `any`-related patterns across **31 files** (excluding tests, generated types, node_modules). Using conservative estimates (~1.4 `any` references per line), this maps to approximately **260 individual `any` usages**, consistent with the target of ~263.

The codebase already uses `unknown` in 740+ locations — so the migration path toward `unknown` is well-established. The AI module is the dominant contributor (119 occurrences, 64%), followed by API routes and services.

### Categorization

| Pattern                                 | Count | %   | Description                                                                                           | Key Files                                                                                                                               |
| --------------------------------------- | ----- | --- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **A — Supabase query builder `as any`** | ~33   | 18% | `(supabase.from("products") as any).select(...)`, `(q as any).eq(...)`, `supabase = rawClient as any` | adminProductService, adminQuoteService, dashboardAnalyticsService, customersService, processSaleBusinessLookups                         |
| **B — AI tool destructure `: any`**     | ~25   | 14% | `const { data, error }: any = await supabase...`                                                      | analytics.ts, categories.ts, customers.ts, products.ts, support.ts                                                                      |
| **C — Callback param `: any`**          | ~40   | 22% | `.filter((o: any) => ...)`, `.map((msg: any) => ...)`                                                 | diagnoseSystem.ts, analytics.ts, customers.ts, indexer.ts, long-term.ts                                                                 |
| **D — Function signature `any[]`**      | ~15   | 8%  | `filterIssuesBySeverity(issues: any[], ...)`                                                          | diagnoseSystem.ts                                                                                                                       |
| **E — `@ts-expect-error` dynamic LLM**  | ~30   | 16% | Annotated suppressions for LLM response processing                                                    | analytics.ts, customers.ts, categories.ts, support.ts, organizational.ts                                                                |
| **F — Form zodResolver `as any`**       | ~4    | 2%  | `resolver: zodResolver(schema) as any`                                                                | AddressTab.tsx, support/page.tsx                                                                                                        |
| **G — eslint-disable no-explicit-any**  | ~9    | 5%  | `// eslint-disable-next-line @typescript-eslint/no-explicit-any`                                      | AppointmentsContent, ContactLensMatricesList, QuoteTreatmentsTab, TicketDetailContent, TicketMessageForm, useFormProtection, AddressTab |
| **H — Remaining `as any` casts**        | ~20   | 11% | `(order as any)?.property`, `(data as any)`, `itemsArr as any`                                        | session-movements/route.ts, products.ts, support.ts                                                                                     |

### Module Breakdown

| Module                                                    | Occurrences | %   | Files                                                  | Complexity  |
| --------------------------------------------------------- | ----------- | --- | ------------------------------------------------------ | ----------- |
| **AI module** (src/lib/ai/)                               | 119         | 64% | 8 tools + 3 memory + 1 utils                           | Medium-High |
| **API routes** (src/app/api/)                             | 25          | 14% | 5 files (cash-register, customers, pos)                | Medium      |
| **Services** (src/lib/api/services/)                      | 19          | 10% | 3 files (adminProduct, adminQuote, dashboardAnalytics) | Medium      |
| **Admin Components** (src/components/admin/ + app/admin/) | 6           | 3%  | 5 files                                                | Low-Medium  |
| **Hooks** (src/hooks/)                                    | 2           | 1%  | useFormProtection.ts                                   | Low         |
| **Profile components**                                    | 1           | <1% | AddressTab.tsx                                         | Low         |
| **Other**                                                 | 4           | 2%  | closure-service.ts (comment), validation.ts (JSDoc)    | Low         |

#### AI Module Detail

| File                                      | Occurrences | Primary Pattern                                             |
| ----------------------------------------- | ----------- | ----------------------------------------------------------- |
| `src/lib/ai/tools/diagnoseSystem.ts`      | 22          | Callback `: any` + function signature `any[]`               |
| `src/lib/ai/tools/analytics.ts`           | 22          | Callback `: any` + `@ts-expect-error` + `as any`            |
| `src/lib/ai/tools/customers.ts`           | 21          | Destructure `: any` + `@ts-expect-error` + callback `: any` |
| `src/lib/ai/tools/categories.ts`          | 13          | Destructure `: any` + `@ts-expect-error` + `as any`         |
| `src/lib/ai/tools/support.ts`             | 10          | Destructure `: any` + `@ts-expect-error`                    |
| `src/lib/ai/tools/products.ts`            | 9           | Destructure `: any` + `as any` + `@ts-expect-error`         |
| `src/lib/ai/tools/analyzeBusinessFlow.ts` | 4           | `@ts-expect-error` + callback `: any`                       |
| `src/lib/ai/tools/customerWhatsApp.ts`    | 4           | `as any[]` casts                                            |
| `src/lib/ai/tools/workOrders.ts`          | 2           | `as any[]` + `@ts-expect-error`                             |
| `src/lib/ai/memory/indexer.ts`            | 4           | Callback `: any` in builder methods                         |
| `src/lib/ai/memory/long-term.ts`          | 4           | Destructure + callback `: any`                              |
| `src/lib/ai/memory/organizational.ts`     | 3           | `@ts-expect-error` dynamic LLM                              |
| `src/lib/ai/utils/validation.ts`          | 1           | `const sanitized: any`                                      |

### Quick Wins (~100 occurrences, ~55%)

1. **Replace `: any` with `: unknown` in non-operational contexts** (~15 occurrences): Variable declarations like `const insertData: any = {...}` → `const insertData: Record<string, unknown> = {...}`. Trivial, no runtime impact.

2. **Type Supabase query builder variables** (~33 occurrences): Replace `let query: any` with typed query builder using TypeScript inference. Use `as unknown as PostgrestFilterBuilder<...>` pattern which already exists in the codebase. Also `supabase = rawClient as any`.

3. **Replace eslint-disable with real types** (~9 occurrences): Each suppression has a clear fix — `useForm<FormData>` instead of `useForm<any>`, proper interfaces for generic props.

4. **Replace `Record<string, any>` with `Record<string, unknown>`** (~2 occurrences): `TreatmentPricesMap` and `sanitized` object in `validation.ts`.

5. **Type callback parameters with real types** (~40 occurrences): `.filter((o: any) => ...)` where the source array can be typed. Use `unknown` with type narrowing where genuinely dynamic.

### Hard Cases (~85 occurrences, ~45%)

1. **`@ts-expect-error: Dynamic LLM response shape`** (~30 occurrences): Genuinely dynamic — LLM output is not statically typed. **Mitigation**: Replace with Zod.parse with fallback, or keep `@ts-expect-error` with `unknown` + runtime type guards.

2. **AI tool analysis pipeline types** (~35 occurrences): `diagnoseSystem.ts` and `analytics.ts` process heterogeneous analysis results with union-like but dynamic shapes. Need careful type design — analyzing what properties are actually accessed across all call sites.

3. **`as any` for Deep Supabase relationship queries** (~12 occurrences): `session-movements/route.ts` processes polymorphic Supabase joins. `(order as any)?.sii_business_name` — needs proper relationship type definitions from generated types.

4. **Process-sale business lookup casts** (~6 occurrences): `itemsArr as any` across multiple function boundaries. Complex nested type from POS form. Needs type alignment across validation module boundary.

### Recommendation

**Batch strategy: 3 batches**

1. **Batch A — Quick Wins** (~100 occurrences, low risk, estimate: 1-2 hours):
   - Replace all `: any` that can become `: unknown` (variable declarations)
   - Fix all eslint-disable suppressions (9 files)
   - Replace `Record<string, any>` with `Record<string, unknown>`
   - Type callback params where source array typing is obvious
   - Fix hook-level any (useFormProtection.ts)
   - **Scope**: ~15 files, ~100 line changes

2. **Batch B — Supabase query types** (~45 occurrences, medium risk, estimate: 2-3 hours):
   - Replace `let query: any` with typed query builder patterns
   - Replace `: any` on Supabase destructuring in services and AI tools
   - Fix `supabase = rawClient as any` patterns
   - Add proper PostgrestFilterBuilder generics
   - **Scope**: ~10 files, ~45 line changes

3. **Batch C — LLM/AI dynamic shapes** (~40 occurrences, higher risk, estimate: 2-3 hours):
   - Add Zod schemas for LLM response validation
   - Type AI analysis pipeline with proper discriminated unions
   - Fix deep Supabase relationship `as any` casts
   - **Scope**: ~8 files, ~40 line changes

**Total estimated effort**: 5-8 hours across 31 files, ~185 line changes.

**Delivery strategy**: Single PR (~185 lines) — well within the 400-line review budget.

### Ready for Proposal

Yes
