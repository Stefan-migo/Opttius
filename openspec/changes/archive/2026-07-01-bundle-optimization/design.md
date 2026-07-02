# Design: Bundle Optimization

## Technical Approach

Two stacked PRs to main, each independently revertible. **PR1** removes framer-motion (~3.4MB dep, ~200KB gzip) by converting BlurText's `motion.span` animations to pure CSS `@keyframes` + IntersectionObserver class toggle. **PR2** defers recharts (~7MB) by replacing static imports in 3 parent consumers with `next/dynamic({ ssr: false })` + Skeleton fallbacks. Zero visual changes.

## Architecture Decisions

| Decision | Choice | Alternatives | Rationale |
|----------|--------|-------------|-----------|
| Animation engine | CSS `@keyframes` | Web Animations API, keep framer-motion | Zero JS runtime; animation is simple 3-step blur reveal (10px→5px→0px). IntersectionObserver already exists — just toggles a CSS class. Default easing is identity `(t) => t` → maps to CSS `linear`. GPU composited. |
| Recharts loading strategy | Dynamic at parent level | Wrapper files per chart, keep static | Fewest files changed (3 parents vs 6+ wrappers). Pattern already established — `AdminDashboardContent` already uses `next/dynamic` for `CreateAppointmentForm`. Chart components keep `"use client"` — dynamic import only defers their chunk. |
| Dead-code handling | Remove anyway | Leave unused import | BlurText is not imported anywhere, but removing framer-motion import ensures tree-shaking is definitive and prevents accidental re-inclusion. |

## Data Flow

```
Before:  Server renders chart components → recharts JS in initial SSR bundle (~300KB gzip)
After:   Server renders Skeleton → recharts chunk deferred to browser (lazy hydration)
```

## File Changes

### PR 1 — framer-motion → CSS (~40 net lines)

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/BlurText.tsx` | Modify | Remove `motion.span`, `motion.create`, `Transition` type import. Add CSS `@keyframes` via `<style>` tag or CSS module. Stagger delay via CSS custom property `--anim-delay`. `onAnimationComplete` → native `onAnimationEnd` on last span. |

### PR 2 — recharts dynamic import (~60 net lines)

| File | Action | Description |
|------|--------|-------------|
| `src/app/admin/_components/AdminDashboardContent.tsx` | Modify | `import DashboardCharts` → `next/dynamic(() => import("./DashboardCharts"), { ssr: false })` + Skeleton fallback |
| `src/components/admin/saas-support/SupportMetrics.tsx` | Modify | Replace 3 static Enhanced* imports with `next/dynamic` wrappers + Skeleton fallback |
| `src/app/admin/analytics/_components/AnalyticsContent.tsx` | Modify | Replace 5 static Enhanced* imports with `next/dynamic` wrappers + Skeleton fallback |

(No chart source files are modified — they remain `"use client"` with direct recharts imports.)

## Animation Detail

```css
@keyframes blurReveal-top {
  0%   { filter: blur(10px); opacity: 0; transform: translateY(-50px); }
  50%  { filter: blur(5px);  opacity: 0.5; transform: translateY(5px); }
  100% { filter: blur(0px);  opacity: 1; transform: translateY(0); }
}
```

Each `<span>` gets `animation: blurReveal-{dir} 0.7s linear both; animation-delay: var(--delay, 0ms)`. IntersectionObserver toggles an `.animate` class on the wrapper. `animation-fill-mode: both` holds the `from` state until delay expires.

The `easing` prop defaults to identity `(t) => t` → `linear`. No caller passes a custom easing (verified: BlurText has zero imports across the codebase). The `EasingFunction` type is simplified to `"linear"` since custom cubic-beziers are YAGNI.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Build | Bundle integrity | `npm run build` passes (no type/lint errors) |
| Visual | BlurText animation | Manual verification (component is unused, but export must work) |
| Rendering | Charts appear correctly | Navigate to Dashboard, Support Metrics, Analytics pages — charts render with Skeleton then hydrate |
| Bundle | Dependency removal | Verify recharts/framer-motion are gone from the main JS chunk |

## Migration

None — pure refactor, no data migration, no API changes. Each PR is under 60 net lines. Rollback: `git revert <pr-commit>`.

## Delivery Order

1. **PR1** (framer-motion → CSS) — no dependency, safe to land first
2. **PR2** (recharts dynamic) — no dependency on PR1, can land in any order
