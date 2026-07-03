# Proposal: cleanup-deprecated-dead-code

## Intent

Delete ~700-800 lines of dead code confirmed unused across the codebase. The `@deprecated` markers on these items are stale — the referenced replacements never materialized, and production code never migrated to them. Cleaning them removes noise, reduces bundle size, and eliminates false signals for future refactors.

## Scope

### In Scope (12 deletions)
- **3 AI components** — `InsightDetailDialog`, `InsightCard` (+ its test), `GenerateInsightsButton`
- **1 shim export** — `SmartContextWidget` re-export from `AgentBubbleContainer.tsx`
- **3 quote service functions** — `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem` (+ their tests + barrel re-exports)
- **1 product import function** — `importProductsJson`
- **1 support resolver** — `resolveTicketByNumber`
- **5 POS type aliases** — legacy `Product`, `CartItem`, `Customer`, `Quote`, `PaymentMethod`
- **2 stale inline comments** — `// @deprecated` annotations in `usage-logger.ts` that reference still-active tables

### Out of Scope
- 20 deprecated-but-used items (AI agent files, API routes) — deprecation is forward-looking for a DB migration, markers must stay
- Any behavioral changes, refactoring, or migration of callers
- Anything beyond pure deletion of the 12 confirmed-unused items

## Capabilities

<!-- Pure deletion — no new or modified spec-level behavior -->
### New Capabilities
None

### Modified Capabilities
None

## Approach

**Approach A — Delete only safe-to-delete items.** Each item was verified unused via grep across the entire codebase. Deletions are purely additive-removal: delete files, remove exports, clean re-exports, remove test files. No callers to update because no callers exist.

### Deletion map

| Action | Target |
|--------|--------|
| Delete file | `src/components/ai/InsightDetailDialog.tsx` |
| Delete file | `src/components/ai/InsightCard.tsx` |
| Delete file | `src/components/ai/GenerateInsightsButton.tsx` |
| Delete file | `src/__tests__/unit/components/ai/InsightCard.test.tsx` |
| Delete file | `src/__tests__/unit/lib/api/services/quoteService.test.ts` |
| Remove export | `src/components/ai/AgentBubbleContainer.tsx` — `SmartContextWidget` |
| Remove exports | `src/lib/api/services/quoteService.ts` — `addQuoteItem`, `updateQuoteItem`, `removeQuoteItem`, `QuoteItem` type |
| Remove export | `src/lib/api/services/productService.ts` — `importProductsJson` |
| Remove export | `src/lib/ai/tools/resolvers.ts` — `resolveTicketByNumber` |
| Remove line | `src/lib/api/services/index.ts` — re-exports of deleted quote functions |
| Remove 5 type aliases | `src/app/admin/pos/types.ts` — `Product`, `CartItem`, `Customer`, `Quote`, `PaymentMethod` |
| Clean comments | `src/lib/ai/usage-logger.ts` — 2 stale `@deprecated` inline annotations |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ai/` | Removed | 3 unused components + 1 shim export |
| `src/lib/api/services/quoteService.ts` | Removed | 3 dead flat-model functions + `QuoteItem` type |
| `src/lib/api/services/productService.ts` | Removed | `importProductsJson` |
| `src/lib/ai/tools/resolvers.ts` | Removed | `resolveTicketByNumber` |
| `src/lib/api/services/index.ts` | Modified | Remove 3 re-exports |
| `src/app/admin/pos/types.ts` | Modified | Remove 5 backward-compat type aliases |
| `src/lib/ai/usage-logger.ts` | Modified | Remove 2 stale inline comments |
| `src/__tests__/` | Removed | 2 test files for deleted code |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dynamic import references deleted code | Very Low | Grep confirmed zero references across all files |
| Deleted function imported via barrel by surprise consumer | Very Low | Barrel re-exports also removed in same change |
| Test coverage drops | Very Low | Tests were self-referential — code had no callers |

## Rollback Plan

Each deletion is an additive removal. Revert via `git checkout` of each deleted file/line. The change can be reverted as a single commit.

## Dependencies

None. No external dependencies, no schema changes, no config changes.

## Success Criteria

- [ ] All 12 items confirmed deleted and not present in `git diff`
- [ ] Project builds without errors (`npm run build`)
- [ ] All remaining tests pass (`npm test`)
- [ ] No grep hits remain for any deleted export name in non-test source files
- [ ] 20 deprecated-but-used items remain untouched
