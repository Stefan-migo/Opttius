# Tasks: Bundle Optimization

## Source Documents

- **Proposal**: `openspec/changes/bundle-optimization/proposal.md` | Engram `sdd/bundle-optimization/proposal` (#671)
- **Design**: `openspec/changes/bundle-optimization/design.md` | Engram `sdd/bundle-optimization/design` (#672)

## Goal

Reduce JS bundle size by ~700KB (gzip) via two independent stacked PRs:
1. Remove framer-motion dependency (~3.4MB, ~200KB gzip)
2. Defer recharts (~7MB) via `next/dynamic({ ssr: false })` at parent consumers

Zero visual changes. Pure performance refactor.

## Delivery Strategy

| Property | Value |
|----------|-------|
| Strategy | Stacked-to-main |
| PR order | Any (no interdependency) |
| Budget | 400 lines per PR |
| Branch | Each PR branches from `main` independently |

Both PRs target `main` directly with no shared branch — they can land in any order and each is independently revertible.

---

## PR 1 — framer-motion → CSS  (~45 net lines)

**Goal**: Remove the entire `framer-motion` dependency by replacing `BlurText.tsx`'s `motion.span` animations with CSS `@keyframes` + IntersectionObserver class toggle.

**Files changed**: 2 (`BlurText.tsx`, `package.json`)

**Est. additions**: ~55
**Est. deletions**: ~10
**Est. net**: ~45

### T1.1 — Rewrite BlurText.tsx to CSS `@keyframes`

**Files**: `src/components/ui/BlurText.tsx`

**Changes**:
- Remove `import { motion, Transition } from "framer-motion"`
- Define CSS `@keyframes blurReveal-top` and `blurReveal-bottom` as a `<style>` tag in the component (or a CSS module) with three steps: `10px blur → 5px blur → 0px blur` + translateY opacity
- Each `<span>` gets `animation: blurReveal-{dir} 0.7s linear both` with `animation-delay` set via CSS custom property `--anim-delay`
- IntersectionObserver toggles an `.animate` class on the wrapper `motion.create(as)` → plain HTML element
- `animation-fill-mode: both` holds the `from` state until delay expires
- Replace `onAnimationComplete` (framer-motion) with native `onAnimationEnd` on the last `<span>`
- `easing` prop simplifies from `EasingFunction` type to `"linear"` string (no caller passes custom easing — verified: BlurText has zero external callers in the codebase)
- Keep existing `willChange`, `display: inline-block`, font style inheritance on spans

**Exit criteria**:
- [x] No `framer-motion` imports in `BlurText.tsx`
- [x] Component renders `<span>` elements with correct stagger animation on scroll into view
- [x] `onAnimationEnd` fires after last span animation completes
- [x] TypeScript compiles without errors

**Verification**: `npm run build` + manual visual check of animation on a page that renders BlurText (or Storybook if available)

### T1.2 — Remove framer-motion from package.json

**Files**: `package.json`

**Changes**: Delete `"framer-motion": "^11.18.2"` dependency line.

**Exit criteria**:
- [x] `npm install` succeeds (no broken imports)
- [x] `npm run build` passes

**Verification**: part of T1.3

### T1.3 — Verify build integrity

**Changes**: Run full build pipeline.

**Steps**:
1. `npm install` (clean install without framer-motion)
2. `npm run lint` — no new warnings
3. `npm run build` — succeeds
4. Verify `BlurText.tsx` export is usable (re-import in a test page if desired)

**Exit criteria**:
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] framer-motion no longer in `node_modules`

---

## PR 2 — recharts dynamic imports  (~70 net lines)

**Goal**: Defer recharts chunk (~7MB) from SSR bundle to client-only lazy hydration by wrapping chart consumers in `next/dynamic({ ssr: false })` + Skeleton fallbacks.

**Files changed**: 3 (`AdminDashboardContent.tsx`, `SupportMetrics.tsx`, `AnalyticsContent.tsx`)

**Est. additions**: ~75
**Est. deletions**: ~5
**Est. net**: ~70

**Pattern used in all files**:
```tsx
import dynamic from "next/dynamic";

const DynamicComponent = dynamic(
  () => import("./path/to/Component"),
  {
    loading: () => <Skeleton className="..." />,
    ssr: false,
  },
);
```

Chart source files (`Enhanced*.tsx`, `DashboardCharts.tsx`) are NOT modified — they already have `"use client"` and import recharts directly. Dynamic wrapping at the parent level creates separate chunks that only hydrate on the client.

### T2.1 — Dynamic import DashboardCharts in AdminDashboardContent

**Files**: `src/app/admin/_components/AdminDashboardContent.tsx`

**Changes**:
- Replace `import DashboardCharts from "./DashboardCharts"` with `next/dynamic` wrapper:
  ```tsx
  const DashboardCharts = dynamic(
    () => import("./DashboardCharts"),
    {
      loading: () => <Skeleton className="h-[380px] w-full rounded-xl" />,
      ssr: false,
    }
  );
  ```
- Keep `import type { DashboardData } from "./types"` as static (types only, no runtime cost)
- Pattern already exists in the same file for `CreateAppointmentForm` — replicate same approach

**Exit criteria**:
- [x] Dashboard page loads with Skeleton placeholder for chart section
- [x] Charts hydrate and render after client-side JavaScript loads
- [x] No visible regression in chart appearance or interactivity

### T2.2 — Dynamic import Enhanced* charts in SupportMetrics

**Files**: `src/components/admin/saas-support/SupportMetrics.tsx`

**Changes**:
- Replace 3 static imports:
  - `import { EnhancedBarChart } from "@/components/admin/charts/EnhancedBarChart"`
  - `import { EnhancedColumnChart } from "@/components/admin/charts/EnhancedColumnChart"`
  - `import { EnhancedPieChart } from "@/components/admin/charts/EnhancedPieChart"`
- With 3 `next/dynamic` wrappers:
  ```tsx
  const EnhancedBarChart = dynamic(
    () => import("@/components/admin/charts/EnhancedBarChart").then(m => m.EnhancedBarChart),
    { loading: () => <Skeleton className="h-[300px] w-full" />, ssr: false }
  );
  // ... same for EnhancedColumnChart, EnhancedPieChart
  ```
- Or consolidate into a single barrel wrapper if all three are used at the same logical depth (use judgment — the simple per-component dynamic is clearer)
- If `Enhanced*` are named exports, use `.then(m => m.EnhancedBarChart)` pattern

**Exit criteria**:
- [x] Support Metrics page loads with Skeleton placeholders in chart areas
- [x] All 3 chart types (bar, column, pie) hydrate correctly
- [x] No type errors (handle named-export resolution correctly)

### T2.3 — Dynamic import Enhanced* charts in AnalyticsContent

**Files**: `src/app/admin/analytics/_components/AnalyticsContent.tsx`

**Changes**:
- Replace 5 static imports:
  - `EnhancedAreaChart`
  - `EnhancedBarChart`
  - `EnhancedColumnChart`
  - `EnhancedLineChart`
  - `EnhancedPieChart`
- With 5 `next/dynamic` wrappers (same pattern as T2.2)
- These are used across multiple `<TabsContent>` panels — each chart type lazy-loads independently when its tab is mounted

**Exit criteria**:
- [x] Analytics page loads with Skeleton placeholders in chart regions
- [x] All 5 chart types hydrate correctly across tab switches
- [x] No hydration mismatch warnings in console

### T2.4 — Verify build and chart rendering

**Changes**: Run full build + manual verification on 3 pages.

**Steps**:
1. `npm run build` — succeeds
2. `npm run lint` — no new warnings
3. Navigate to Dashboard → charts section shows Skeleton then renders
4. Navigate to Admin > Soporte → Support Metrics charts render
5. Navigate to Admin > Analytics → all tab panels render charts
6. Check browser DevTools Network tab: recharts.js appears as a separate chunk, NOT in the main JS bundle

**Exit criteria**:
- [x] `npm run build` passes
- [x] `npm run lint` passes
- [x] All 3 pages render charts visually identical to before
- [x] recharts chunk deferred (confirm via DevTools)

---

## Dependencies

No tasks depend on each other across PRs. Within each PR, tasks must execute sequentially:

```
PR 1: T1.1 → T1.2 → T1.3
PR 2: T2.1 (parallel with T2.2, T2.3) → T2.4
```

T2.1, T2.2, T2.3 are independent and can be implemented in any order. T2.4 requires all 3 to be complete.

---

## Review Workload Forecast

| PR | Net Lines | Budget | Risk |
|----|-----------|--------|------|
| PR 1 (framer → CSS) | ~45 | 400 | Low |
| PR 2 (recharts dynamic) | ~70 | 400 | Low |

**Decision needed before apply**: No
**Chained PRs recommended**: Yes (already split as two stacked PRs)
**400-line budget risk**: Low — both PRs combined are under the 400-line budget for a single PR, but the split is semantically correct (different dependencies, different revert scope).

---

## Rollback

Each PR is independently revertible:

```bash
git revert <pr-1-merge-commit>   # Restores framer-motion
git revert <pr-2-merge-commit>   # Restores static recharts imports
```

No shared state between PRs — reverting one does not affect the other.
