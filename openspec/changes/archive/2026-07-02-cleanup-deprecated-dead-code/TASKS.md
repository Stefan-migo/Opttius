# Tasks: cleanup-deprecated-dead-code

Pure deletion of 12 dead-code items confirmed unused across the codebase.

## Review Workload Forecast

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,043 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Delivery strategy | force-chained |
| Chain strategy | stacked-to-main |

**Note**: User estimate was ~700-800 lines. Verified actual is ~1,043 — InsightCard.tsx alone is 385 lines.

### Suggested Work Units (3 stacked PRs)

| Unit | Goal | Likely PR | Lines | Base |
|------|------|-----------|-------|------|
| 1 | Delete InsightCard.tsx + AgentBubble shim | PR 1 | ~398 | main |
| 2 | Delete InsightDetailDialog, GenerateInsightsButton, InsightCard.test | PR 2 | ~379 | main |
| 3 | Delete quote/resolver/POS functions, re-exports, tests, stale comments | PR 3 | ~266 | main |

Each PR merges to `main` independently. No cross-dependency between units — order only matters to keep each diff ≤ 400 lines.

## Phase 1: PR 1 — InsightCard + AgentBubble shim (~398 lines)

- [x] 1.1 Delete file `src/components/ai/InsightCard.tsx` (385 lines)
- [x] 1.2 Edit `src/components/ai/AgentBubbleContainer.tsx` — remove `SmartContextWidget` export + JSDoc (lines 23-35, ~13 lines)

## Phase 2: PR 2 — Remaining AI files (~379 lines)

- [x] 2.1 Delete file `src/components/ai/InsightDetailDialog.tsx` (149 lines)
- [x] 2.2 Delete file `src/components/ai/GenerateInsightsButton.tsx` (94 lines)
- [x] 2.3 Delete file `src/__tests__/unit/components/ai/InsightCard.test.tsx` (136 lines)

## Phase 3: PR 3 — Deprecated functions, types, re-exports, tests, comments (~266 lines)

- [x] 3.1 Edit `src/lib/api/services/quoteService.ts` — remove `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem` functions + entries from `quoteService` object (lines 338-396, 409-411; keep `QuoteItem` interface — used by `QuoteWithItems`)
- [x] 3.2 Edit `src/lib/api/services/index.ts` — remove function re-exports `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem` (lines 90, 98, 101)
- [x] 3.3 Edit `src/lib/api/services/productService.ts` — remove `importProductsJson` function (lines 438-503, ~65 lines)
- [x] 3.4 Edit `src/lib/ai/tools/resolvers.ts` — remove `resolveTicketByNumber` function (lines 82-114, ~33 lines)
- [x] 3.5 Edit `src/app/admin/pos/types.ts` — remove 5 deprecated type aliases (lines 73-101, ~29 lines)
- [x] 3.6 Edit `src/__tests__/unit/lib/api/services/quoteService.test.ts` — remove imports of 3 deleted functions (lines 63-65), remove test blocks (lines 369-423), remove 3 assertions from service-object test (lines 437-439); keep `mockQuoteItem` — used by `getQuote` test
- [x] 3.7 Edit `src/lib/ai/usage-logger.ts` — remove 2 stale inline `@deprecated` comments (lines 75, 90)
