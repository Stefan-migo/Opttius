# Proposal: Bundle Optimization

## Intent

Reduce JS bundle size by ~700KB (gzip) by eliminating framer-motion and deferring recharts to dynamic imports. Pure performance refactor — zero visual changes.

## Scope

### In Scope

- Replace framer-motion in `BlurText.tsx` with CSS `@keyframes` + IntersectionObserver
- Dynamic import (`next/dynamic` with `ssr: false`) for all 6 components importing recharts
- Loading fallback for every dynamic import
- Lint/type-check/storybook passes — no visual regressions

### Out of Scope

- Replacing recharts with a lighter library (e.g., nivo, visx)
- CSS animation framework extraction
- Bundle analysis CI check

## Capabilities

> Pure refactor — no spec-level behavior changes.

### New Capabilities

None.

### Modified Capabilities

None.

## Approach

| Step | What | Why |
|------|------|-----|
| 1 | `BlurText.tsx`: replace `motion.span` + `Transition` with `useAnimateKeyframes()` (CSS `@keyframes`) | Remove 3.4MB framer-motion dependency entirely |
| 2 | `DashboardCharts.tsx`, `Enhanced*Chart.tsx`: wrap in `next/dynamic({ ssr: false })` + `<Skeleton>` fallback | recharts (7MB) only ships to browser, not to SSR |
| 3 | Parent consumers (`AdminDashboardContent`, `SupportMetrics`, `AnalyticsContent`) use dynamic wrappers | Defer chart loading until client hydration |
| 4 | Remove unused dependency entries from `package.json` if framer-motion becomes unreferenced | Keep deps clean |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/components/ui/BlurText.tsx` | Modified | Replace framer-motion with CSS `@keyframes` |
| `src/components/admin/charts/Enhanced*.tsx` (5 files) | Modified | Wrap exports in dynamic + loading fallback |
| `src/app/admin/_components/DashboardCharts.tsx` | Modified | Dynamic import + fallback |
| `src/app/admin/_components/AdminDashboardContent.tsx` | Modified | Import DashboardCharts via dynamic |
| `src/components/admin/saas-support/SupportMetrics.tsx` | Modified | Import Enhanced* charts via dynamic |
| `src/app/admin/analytics/_components/AnalyticsContent.tsx` | Modified | Import Enhanced* charts via dynamic |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Hydration mismatch from `ssr: false` | Low | All chart components already have `"use client"` and fetch client-side data |
| BlurText animation timing differs with CSS | Low | Use same easing (`cubic-bezier` approximation) and delay logic; manual visual comparison on landing page |
| Tree-shaking misses recharts sub-components | Low | Dynamic import loads the entire module anyway — same bundle, just deferred. No regression risk |

## Rollback Plan

Revert the individual PRs in reverse order:
1. `git revert <recharts-dynamic-commit>` restores inline imports
2. `git revert <framer-css-commit>` restores framer-motion animations

Each revert is <20 lines. Total rollback time: under 5 minutes.

## Dependencies

None — `next/dynamic` is built-in. CSS `@keyframes` requires no dependencies.

## Success Criteria

- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no warnings
- [ ] recharts no longer appears in SSR HTML output
- [ ] framer-motion removed from `node_modules` (or tree-shaken)
- [ ] BlurText animation visually identical on landing hero section

## Delivery Strategy

**Stacked-to-main** — two independent PRs to main:

| PR | Content | Est. Lines | Risk |
|----|---------|------------|------|
| PR1 | framer-motion → CSS in `BlurText.tsx` | ~40 lines | Low |
| PR2 | Dynamic imports for all recharts consumers | ~80 lines | Low |
