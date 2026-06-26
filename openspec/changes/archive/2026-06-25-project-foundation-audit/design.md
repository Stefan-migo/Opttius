# Design: Project Foundation Audit

## Technical Approach

Incremental 5-phase codebase restructuring. No behavior changes. Each phase ships independently as its own PR with characterization test guard.

| Phase | Strategy                                                               | Safety Gate                                                |
| ----- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| 0     | Fix 96 failing tests (env, imports, snapshots)                         | `npm run test:run` passes 100%                             |
| 1     | Extract cohesive modules from megafiles one boundary at a time         | Characterization test before extraction + full suite after |
| 2     | Consolidate dual service dirs, deduplicate, break import cycles        | All existing tests pass, `npm run build` passes            |
| 3     | Prune stale docs, update architecture docs, remove orphaned agent dirs | Manual review                                              |
| 4     | Tune SDD config, establish engram capture discipline                   | >=5 architecture memory entries                            |

## Architecture Decisions

### Decision: Characterization-test-first extraction

**Choice**: Write a `*.char.test.ts` before touching any megafile that covers every exported function/component entry point via black-box calls. Extract → re-export for backward compat → run char test + full suite → remove re-export once consumers migrate.
**Alternatives considered**: Blind extraction (risky — no safety net), rewrite-from-scratch (scope creep, violates no-behavior-change rule), incremental with only type-checking (misses runtime regressions).
**Rationale**: Cheapest safety net that catches regressions. A characterization test costs ~50 lines, runs in <1s, and documents the implicit contract. Given 96 tests already failing, we cannot trust the existing suite to catch extraction bugs.

### Decision: `lib/api/services/` as the canonical service directory

**Choice**: `lib/api/services/` is the canonical services directory. Migrate `lib/services/` content into it.
**Alternatives considered**: `lib/services/` as target (fewer files but fewer consumers), merge into a new `lib/services/core/` (added indirection, YAGNI), keep both (perpetuates confusion).
**Rationale**: `lib/api/services/` has 14 files vs `lib/services/` has 4. The 14 are real domain services (agreement, appointment, customer, pos, quote, product). The 4 are cross-cutting (error, notification). Let the majority convention win.

### Decision: Keep `brain/`, delete `.agent/`, `.qoder/`, `.mcp/`, `.atl/`

**Choice**: Preserve the Obsidian wiki (`brain/`) as team knowledge base. Delete all orphaned agent-era configuration directories.
**Alternatives considered**: Archive all dirs under `docs/archive/` (adds noise to docs/), migrate useful content from agent dirs into brain/ (scope creep), keep everything (dead weight).
**Rationale**: `brain/` is actively maintained Obsidian content. `.agent/` is defunct Gentle AI protocol docs (replaced by `.opencode/`). `.qoder/` is Cline/Cody-era plans and repo wiki. `.mcp/` is Claude Desktop configs (local machine config, doesn't belong in repo). `.atl/` is a skill registry index for a defunct agent manager. None have runtime impact — they're pure developer environment cruft.

### Decision: Integration tests use env-var guard, not `.env.test`

**Choice**: Integration tests that require a real Supabase instance will use an early-return guard (`beforeAll` check + `describe.skip`) rather than a separate `.env.test` file with mock values.
**Alternatives considered**: `.env.test` with mock Supabase values (fragile — mocks drift from real API), `test.skip` per test (tedious), `.env.test.example` committed with docs (lowest effort, still manual).
**Rationale**: The integration test setup (`test-setup.ts`) already has `isMultiTenancyAvailable()` — it just doesn't gate the suite. We wrap the entire `describe` block with a conditional skip + clear log message. This is more honest than mock env vars that silently skip tests and prevents the "CI green but broken" trap.

## Phase 0: Test Stabilization

### Failure categories (from exploration)

| Category           | Files                                      | Fix                                                                                             |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Missing env vars   | `integration/api/*.test.ts`                | Wrap `describe` in `isMultiTenancyAvailable()` guard, log instructions for local Supabase setup |
| Stale snapshots    | Snapshot `.snap` files                     | `npx vitest run --update`                                                                       |
| Import path errors | ~5 test files with wrong relative imports  | Fix imports to match actual module locations                                                    |
| AI provider config | `unit/lib/ai/providers/openrouter.test.ts` | Guard or mock; depends on optional API key                                                      |

### Test config design

```
src/__tests__/
├── setup.ts                  ← Provides env mocks for unit tests (exists, works)
├── integration/
│   ├── helpers/
│   │   └── test-setup.ts     ← Already has isMultiTenancyAvailable() (exists)
│   └── api/
│       └── *.test.ts         ← Add env-var guard, do NOT change test logic
```

The guard pattern:

```typescript
// Add to each integration describe block
const isAvailable = await isMultiTenancyAvailable();
if (!isAvailable) {
  console.warn("⚠️  Skipping integration tests — SUPABASE_SERVICE_ROLE_KEY not set");
}

describe.runIf(isAvailable)("Payments API", ...);
```

## Phase 1: Megafile Extraction Pattern

### Extraction Ladder (applied per megafile)

```
1. Characterize   → write *.char.test.ts covering public API
2. Identify       → find cohesive boundaries (types, constants, pricing, cart, data)
3. Extract        → move boundary to new file, re-export from original
4. Verify         → run char test + npm run test:run
5. Inline & remove → once all consumers use new path, delete re-export
6. Repeat         → next boundary within same megafile
```

### Concrete example: POSAdvancedSale (3122 lines)

Current structure (one file):

```
POSAdvancedSale.tsx
 ├── 5 interfaces (POSProduct, OrderFormData, ExternalPrescriptionData, Treatment, POSAdvancedSaleProps)
 ├── 2 constants (DEFAULT_LENS_FAMILIES, DEFAULT_TREATMENTS)
 ├── ~25 state variables (frame, lens, prescription, discount, form, contact lens)
 ├── Data loading (loadSettings, loadPrescriptions, searchFrames, searchNearFrames)
 ├── Pricing logic (suggestLensFamily, lensPrice, totalPrice, discountAmount, updateTreatmentPrice)
 ├── Cart composition (handleAddToCart — builds items array from state)
 ├── Quote creation (handleCreateQuote)
 └── JSX render (4 tabs: customer, frame, lenses, pricing)
```

Extraction plan (5 extractions, sequential):

```
Extraction #1: Types
  Extract → posAdvancedSale.types.ts (all interfaces + props type)
  Re-export from POSAdvancedSale.tsx
  Gate: char test reads all types via import

Extraction #2: Constants
  Extract → posAdvancedSale.constants.ts (DEFAULT_LENS_FAMILIES, DEFAULT_TREATMENTS)
  Re-export from POSAdvancedSale.tsx
  Gate: char test checks values match

Extraction #3: Business logic — pricing
  Extract → posPricingUtils.ts
  - suggestLensFamily, lensPriceValue, nearLensPriceValue
  - totalPrice, discountAmount, updateTreatmentPrice
  - filteredTreatments
  Pure functions, no React hooks. Takes state in, returns value out.
  Gate: unit test over each function with known inputs

Extraction #4: Business logic — cart builder
  Extract → posCartBuilder.ts
  - handleAddToCart (pure: reads state, returns items array)
  Pure function: (state) → CartItem[]
  Gate: unit test generating known cart from known state

Extraction #5: Business logic — data loading
  Extract → posDataLoader.ts
  - loadSettings, loadPrescriptions, searchFrames, searchNearFrames
  - handleCreateQuote
  These remain hook-based (useEffect, useCallback) — co-locate in a single file
  Gate: char test with mocked Supabase client
```

File plan after extraction (in `src/app/admin/pos/components/`):

```
POSAdvancedSale.tsx          ← Reduced to ~1200 lines (imports + state + JSX + orchestration)
POSAdvancedSale.types.ts      ← All interfaces (~100 lines)
POSAdvancedSale.constants.ts  ← Default values (~50 lines)
posPricingUtils.ts            ← Pure pricing functions (~200 lines)
posCartBuilder.ts             ← Pure cart composition (~250 lines)
posDataLoader.ts              ← Data loading hooks (~300 lines)
```

### Next megafile targets (after POSAdvancedSale)

| Rank | File                       | Lines | Strategy                                                                           |
| ---- | -------------------------- | ----- | ---------------------------------------------------------------------------------- |
| 2    | `CreateQuoteForm.tsx`      | 2847  | Extract: types → constants → lens matrix → pricing → submit handler                |
| 3    | `cash-register/page.tsx`   | 2624  | Extract: types → payment methods → cash operations → print logic                   |
| 4    | `process-sale/route.ts`    | 2448  | API route — extract: validation → payment processing → response builder            |
| 5    | `zod-schemas.ts` (lib/api) | 2199  | Investigate overlap with `lib/validation/zod-schemas.ts` (1764 lines), deduplicate |

### Other cleanup opportunities

- `page.backup-refactored.tsx` (6928 lines) — delete once POS extraction is stable. This is a backup from a prior refactoring attempt.
- `core.ts.backup` in `lib/ai/agent/` — delete.
- Two zod-schemas files (`lib/api/validation/` + `lib/validation/`) — likely duplicated. Consolidate.

## Phase 2: Service Unification

### Service directory inventory

```
lib/api/services/    (14 files, canonical)     lib/services/    (4 files)
├── agreementService.ts                        ├── errorService.ts
├── appointmentService.ts                      ├── notificationService.ts
├── contactLensEncargoService.ts               ├── index.ts
├── contactLensFamilyService.ts                └── products/
├── contactLensInventoryService.ts                 └── index.ts
├── contactLensMatrixService.ts
├── customerService.ts
├── index.ts (barrel exports)
├── lensFamilyService.ts
├── orderService.ts
├── posService.ts
├── productService.ts
├── quoteService.ts
└── quoteSettingsService.ts
```

### Consolidation plan

1. **Move** `lib/services/errorService.ts` → `lib/api/services/errorService.ts`
2. **Move** `lib/services/notificationService.ts` → `lib/api/services/notificationService.ts`
3. **Move** `lib/services/products/` → `lib/api/services/products/`
4. **Update** all `@/lib/services/` imports to `@/lib/api/services/` (grep for consumers)
5. **Delete** `lib/services/index.ts`, `lib/services/` directory
6. **Verify**: `npm run test:run`, `npm run build`

### Import cycles

2 detected in exploration. Fix pattern:

```
A ←→ B  →  extract shared dependency C
```

Both A and B import from C instead of from each other. C is the commonly-needed subset.

## Phase 3: Documentation Architecture

### Keep / Archive / Delete

```
docs/                     ← KEEP — update architecture docs to reflect current state
brain/                    ← KEEP — active Obsidian team wiki
openspec/                 ← KEEP — active SDD artifacts
README.md                 ← KEEP — update
CONTRIBUTING.md           ← KEEP — update if exists

.agent/                   ← DELETE — defunct Gentle AI protocol docs
.qoder/                   ← DELETE — Cline/Cody-era plans and wiki
.mcp/                     ← DELETE — Claude Desktop local config
.atl/                     ← DELETE — defunct Gentle AI skill registry
```

### README convention per module

Files >300 lines SHOULD have a file-level JSDoc comment:

```typescript
/**
 * POSAdvancedSale — "Venta Óptica" / "Crear Orden Completa" form.
 *
 * Responsibilities:
 * - Customer selection / quick-create
 * - Frame search and selection (distance + near)
 * - Lens family selection with presbyopia support
 * - Treatment upselling
 * - Cart item composition on "Add to Cart"
 *
 * State: Self-contained via useState (no external store).
 * Consumers: POSPageContent integrates via onAddToCart callback.
 *
 * Dependencies: productService (search), quoteService (createQuote), settingsService
 */
```

## Phase 4: Professionalization

### Orphaned directory cleanup

| Dir       | Action | Rationale                                                                  |
| --------- | ------ | -------------------------------------------------------------------------- |
| `.agent/` | Delete | Gentle AI protocol — replaced by `.opencode/`                              |
| `.qoder/` | Delete | Cline/Cody-era plans, repowiki, skills — agent tool moved on               |
| `.mcp/`   | Delete | Claude Desktop config — belongs in local `~/.config/`, not in repo         |
| `.atl/`   | Delete | Gentle AI skill registry index — registry now lives in `.opencode/skills/` |
| `brain/`  | Keep   | Obsidian team wiki — actively maintained knowledge base                    |

### Engram save triggers

Establish these rules for architecture decision capture:

| Trigger             | When to call `mem_save`                                               |
| ------------------- | --------------------------------------------------------------------- |
| Service extraction  | After each extraction, log what was moved and why                     |
| Import cycle fix    | After each cycle resolution, document the cycle + fix                 |
| Test category fixed | After each failure category is resolved, log the fix pattern          |
| Phase complete      | At end of each phase, summary of files changed + verification results |
| Directory deleted   | Before deleting, archive the decision and confirm no runtime impact   |

### SDD config tuning

Current `openspec/config.yaml` is already well-configured. Recommendation:

- `rules.apply.tdd: true` — already set ✓
- `testing.strict_tdd: true` — already set ✓
- Add `rules.archive: - "Warn before merging destructive deltas"` for dir deletions

## Data Flow

### Phase 1 extraction flow (per megafile)

```
megafile.tsx  ──char test──→  [extract boundary A]
                                    │
                             boundary A.ts  ←── re-exported from megafile.tsx
                                    │
                            consumers migrate imports
                                    │
                             re-export removed
                                    │
                             ──repeat for B──→
```

### Phase 2 service consolidation flow

```
lib/services/errorService.ts  ──move──→  lib/api/services/errorService.ts
lib/services/notificationService.ts ──move──→ lib/api/services/notificationService.ts
lib/services/products/ ──move──→ lib/api/services/products/

Update imports:
  @/lib/services/*  ──→  @/lib/api/services/*

Delete: lib/services/
Verify: npm run test:run + npm run build
```

## File Changes (complete)

| Phase | File                                                        | Action | Description                                        |
| ----- | ----------------------------------------------------------- | ------ | -------------------------------------------------- |
| 0     | `src/__tests__/integration/api/payments.test.ts`            | Modify | Add `describe.runIf()` env guard                   |
| 0     | `src/__tests__/integration/api/*.test.ts`                   | Modify | Add env-var guards to all integration tests        |
| 0     | `src/__tests__/unit/lib/ai/providers/openrouter.test.ts`    | Modify | Guard or mock AI provider key                      |
| 0     | (snapshot files)                                            | Update | `--update` flag, no manual changes                 |
| 1     | `src/app/admin/pos/components/POSAdvancedSale.types.ts`     | Create | Extracted interfaces                               |
| 1     | `src/app/admin/pos/components/POSAdvancedSale.constants.ts` | Create | Extracted default values                           |
| 1     | `src/app/admin/pos/components/posPricingUtils.ts`           | Create | Extracted pricing logic                            |
| 1     | `src/app/admin/pos/components/posCartBuilder.ts`            | Create | Extracted cart composition                         |
| 1     | `src/app/admin/pos/components/posDataLoader.ts`             | Create | Extracted data loading hooks                       |
| 1     | `src/app/admin/pos/components/POSAdvancedSale.tsx`          | Modify | Remove extracted code, keep re-exports + JSX       |
| 1     | `src/app/admin/pos/page.backup-refactored.tsx`              | Delete | Stale backup                                       |
| 1     | `src/lib/ai/agent/core.ts.backup`                           | Delete | Stale backup                                       |
| 1     | `src/app/admin/pos/components/POSAdvancedSale.char.test.ts` | Create | Characterization test                              |
| 2     | (imports across codebase)                                   | Modify | Update `@/lib/services/*` → `@/lib/api/services/*` |
| 2     | `src/lib/services/*` (4 files)                              | Move   | Move to `lib/api/services/`                        |
| 2     | `src/lib/services/`                                         | Delete | Empty directory                                    |
| 3     | `.agent/` directory (2 files)                               | Delete | Orphaned agent era                                 |
| 3     | `.qoder/` directory                                         | Delete | Orphaned agent era                                 |
| 3     | `.mcp/` directory                                           | Delete | Orphaned agent era                                 |
| 3     | `.atl/` directory                                           | Delete | Orphaned agent era                                 |
| 3     | `README.md`                                                 | Modify | Update project description                         |
| 4     | `openspec/config.yaml`                                      | Modify | Tune archive rules                                 |
| —     | `.env.test.example`                                         | Create | Document integration test requirements             |

## Testing Strategy

| Layer            | What                                  | Approach                                                           |
| ---------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Characterization | Each extracted megafile boundary      | Black-box `*.char.test.ts` — call public API, assert known outputs |
| Unit             | Fixed test failures                   | Only fix env/import/snapshot, never change test logic              |
| Full suite       | Regression after each extraction      | `npm run test:run` must pass (all phases)                          |
| Build            | Import correctness after service move | `npm run build` must pass (Phase 2 gate)                           |

## Migration / Rollout

Per-phase PRs, each independently revertible:

- **Phase 0 PR**: revert → tests go back to 96 failures, prod untouched.
- **Phase 1 PR**: revert → original megafile is preserved until extraction complete. Re-exports mean consumers never break.
- **Phase 2 PR**: revert → old imports still compile (TypeScript), old files recoverable from git.
- **Phase 3 PR**: revert → deleted dirs recoverable from git.
- **Phase 4 PR**: revert → no runtime impact.

No database migrations, no feature flags, no data migration.

## Open Questions

- [ ] Two zod-schemas files (`lib/api/validation/zod-schemas.ts` vs `lib/validation/zod-schemas.ts`) — same or different? Phase 1 investigation.
- [ ] AI module test (`openrouter.test.ts`) — does it fail because of missing API key or import error?
- [ ] `page.backup-refactored.tsx` (6928 lines) — confirm no consumer imports it before deletion.
- [ ] Snapshot tests: how many? Confirming `npx vitest run --update` is sufficient.
