# Proposal: Add Unit Tests — API Services

## Intent

9 API services (~2,100 lines) in `src/lib/api/services/` have zero test coverage: B2B agreements, user-facing notifications, product management with complex filtering, and contact lens modules. Every deploy risks regressions in core optical business flows.

## Scope

### In Scope
- **P0 (3 files):** `notificationService.ts` (355), `agreementService.ts` (478), `products/service.ts` (571)
- **P1 (5 files):** `contactLensInventoryService.ts` (143), `contactLensEncargoService.ts` (154), `contactLensFamilyService.ts` (101), `contactLensMatrixService.ts` (86), `lensFamilyService.ts` (96)
- **P2 (1 file):** `quoteSettingsService.ts` (117)

### Out of Scope
- 7 services already tested (appointment, customer, product, quote, order, pos, error — ✅ done in prior changes)
- Integration/E2E tests
- Middleware, billing, error files (archived in Fase 5 change #1)
- Source file modifications (test-only change)

## Capabilities

### New Capabilities
None — test-only change, no spec-level behavior changes.

### Modified Capabilities
None — no existing specs are modified.

## Approach

Co-located tests in `src/__tests__/unit/lib/api/services/` mirroring source paths. Reuse 3 established mock patterns:

1. **notificationService** → mock `sonner` (pure delegation, no ApiClient)
2. **ApiClient services** (6 files: agreement, 4 contactLens, lensFamily, quoteSettings) → reuse `__aptMockClient__` pattern from `appointmentService.test.ts`
3. **contactLensEncargoService** → mock `global.fetch` (raw fetch)
4. **products/service.ts** → mock Supabase chain from `root-middleware.test.ts`

Build order (easy → hard): notification → 6 ApiClient services → contactLensEncargo → contactLensInventory → products/service.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__tests__/unit/lib/api/services/` | New | Tests for 8 standalone service files |
| `src/__tests__/unit/lib/api/services/products/` | New | Test for ProductsService class |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Supabase chain mock complexity (products/service) | Med | Reuse proven pattern from `root-middleware.test.ts` |
| ProductsService refactoring mid-change | Low | Read source first; test the public API, not internals |
| Regressions from test-writing | Low | Read-only — source files untouched |

## Rollback Plan

`git revert` the commit. No DB migrations, config changes, or runtime impact.

## Dependencies

- vitest + existing test infrastructure (`setup.ts`, mock factories)
- Source files (read-only, no modifications)
- No external services or DB

## Success Criteria

- [ ] All 9 untested services have co-located test files with test cases
- [ ] Each P0 file ≥ 70% line coverage
- [ ] `npx vitest run` passes with zero regressions across entire suite
- [ ] All tests follow project conventions (`vi.mock`, `vi.clearAllMocks`, Arrange/Act/Assert)
