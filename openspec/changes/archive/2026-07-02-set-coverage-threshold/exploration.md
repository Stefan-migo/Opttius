## Exploration: Set Coverage Threshold

### Current State

#### Current Coverage Numbers (from `npm run test:coverage` on 2026-07-02)

| Metric | Value |
|--------|-------|
| Lines | **59.93%** |
| Branches | **49.23%** |
| Functions | **54.45%** |
| Statements | **58.77%** |

All tests pass (2574 tests across 156 files, 0 failures).

#### Current Vitest Coverage Config (`vitest.config.ts`)

```ts
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html", "lcov"],
  exclude: [
    "node_modules/",
    "src/__tests__/",
    "**/*.d.ts",
    "**/*.config.*",
    "**/mockData/**",
    "**/types/**",
  ],
},
```

No `thresholds` block exists — coverage is gathered but **never enforced**.

#### OpenSpec Config

```yaml
verify:
  coverage_threshold: 0  # explicitly 0 (not enforced)
```

#### CI/CD Coverage Status

- **CI workflow** (`.github/workflows/ci.yml`): runs `npm run test:ci` = `vitest run --reporter=verbose` — no `--coverage` flag, no coverage enforcement
- **PR checks** (`.github/workflows/pr-checks.yml`): lint + type-check only, no tests run
- **Husky pre-commit** (`.husky/pre-commit`): lint-staged + gitleaks, no test/coverage checks
- **Coverage is entirely opt-in** — only enforced when running `npm run test:coverage` locally

#### Engram History

Prior audit (memory #438, 2026-06-30) confirms:
- `coverage_threshold: 0` was intentional — not enforced
- Multiple modules had zero coverage at audit time (security, redis, rate-limiting middleware, supabase utils, etc.)
- Some of those gaps have since been partially filled

### Low Coverage Hotspots

These modules would cause a threshold failure if thresholds were set above their current coverage:

| Module | Lines | Branches | Functions | Risk Level |
|--------|-------|----------|-----------|------------|
| `src/lib/security/` | 1.1% | 0% | 0% | 🔴 Critical |
| `src/lib/redis/` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/rate-limiting/middleware.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/saas/change-audit.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/validation/index.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/utils/supabase/` | 13.79% | 15% | 10% | 🔴 Critical |
| `src/lib/saas/tier-validator.ts` | 13.25% | 9.09% | 11.11% | 🔴 Critical |
| `src/lib/api/services/cargoService.ts` | 24% | 20% | 25% | 🟠 High |
| `src/lib/notifications/appointment.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/notifications/contact.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/notifications/marketing.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/notifications/prescription.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/notifications/quote.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/notifications/work-order.ts` | 0% | 0% | 0% | 🔴 Critical |
| `src/lib/utils/rut.ts` | 34.42% | 32.5% | 50% | 🟠 High |
| `src/lib/validation/schemas/quotes.ts` | 38.46% | 31.25% | 20% | 🟠 High |
| `src/lib/email/templates/prescriptions.ts` | 39.02% | 19.38% | 66.66% | 🟠 High |
| `src/lib/email/templates/welcome.ts` | 30.76% | 18.42% | 50% | 🟠 High |

Total `src/lib/` files with zero coverage (d.ts excluded): ~20 files.

### Approach Options

#### A: Set Global Thresholds and Enforce Immediately

Set thresholds in `vitest.config.ts` at ~50% lines / 40% branches / 45% functions. Enforce in CI by adding `--coverage` to `test:ci`.

| Pros | Cons | Effort |
|------|------|--------|
| Immediate enforcement, catches regressions | **CI will break** immediately — many modules below these thresholds | Low (config change only) |

#### B: Set Global Thresholds as Warnings First, Enforce Later

Set thresholds with `thresholdAutoUpdate` or set low initial values (e.g., 30% lines / 25% branches) to pass, then raise iteratively.

| Pros | Cons | Effort |
|------|------|--------|
| Won't break CI, gives time to improve coverage | Weak initial thresholds don't prevent regression | Low (config change) |
| Teams can raise thresholds as coverage improves | False sense of security at low thresholds | |

#### C: Set Thresholds Per-Module (Granular)

Use vitest `thresholds` per-file or per-directory patterns: high for utils/services, low for page routes, zero for security/redis (known gaps).

| Pros | Cons | Effort |
|------|------|--------|
| Accurate — doesn't penalize known uncovered modules | Complex config, hard to maintain | Medium |
| High bar for shared libraries (utils, validation) | Per-file thresholds in vitest config are limited | |

#### D: Enforce Coverage in CI Only (Optional)

Add `--coverage` with `--coverage.thresholds` as CLI flags to the CI `test:ci` script, keeping local config unchanged.

| Pros | Cons | Effort |
|------|------|--------|
| CI enforces, local dev stays fast | Conflicts with `vitest.config.ts` thresholds | Low |
| Consistent across team | Duplicate config (CLI + config file) | |

### Recommended Thresholds

Based on current numbers, a **realistic and non-breaking** initial threshold set:

| Metric | Current | Suggested Threshold | Buffer |
|--------|---------|--------------------|--------|
| Lines | 59.93% | **50%** | 9.93% |
| Branches | 49.23% | **40%** | 9.23% |
| Functions | 54.45% | **45%** | 9.45% |
| Statements | 58.77% | **50%** | 8.77% |

These thresholds:
- ✅ **Pass** with current coverage levels
- ✅ Leave ~9% buffer against regressions
- ❌ Would not trigger any alerts until coverage drops significantly
- ⚠️ Would still allow new code to be added without coverage in critical areas (security, redis, rate-limiting)

A **stretch goal** would be 55% lines / 45% branches / 50% functions — these would still pass today but leave only ~4-5% buffer.

### Risks

1. **Setting thresholds too high (>55% lines) will break immediately** — global coverage includes many zero-coverage modules
2. **Adding `--coverage` to CI will increase CI runtime** (coverage instrumentation is slower), and the `v8` provider may fail in the GitHub Actions ubuntu environment if native binaries aren't available
3. **Per-module thresholds increase config complexity** — vitest's per-directory `thresholds` require manual exclusion lists
4. **Coverage is a lagging indicator** — high % doesn't mean high quality; mock-heavy tests inflate coverage
5. **Enforcement without awareness** — if devs don't know thresholds are set, PRs may fail unexpectedly
6. **Exclusion gaps** — `src/__tests__/`, `mockData/`, `types/` are excluded. New directories won't be excluded automatically

### Ready for Proposal

**Yes.** The data is clear:
- Current coverage: ~50-60% across metrics
- No coverage enforcement exists anywhere (CI, config, husky)
- Approach **B** (low thresholds first, then raise) is the safest path — set at 50/40/45/50 to pass today, then raise iteratively as coverage improves
- Recommend **NOT** adding `--coverage` to CI yet — start with local enforcement, then add CI in a follow-up change after coverage stabilizes
