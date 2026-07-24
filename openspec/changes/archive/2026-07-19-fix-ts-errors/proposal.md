# Proposal: fix-ts-errors

## Intent

Eliminate all 2,569 TypeScript errors across the codebase. The project currently suppresses them via `typescript: { ignoreBuildErrors: true }` in `next.config.js` — this is Phase 1.3 of the production-readiness roadmap. Zero runtime behavior changes.

## Scope

### In Scope

- Fix all 7 error categories (infrastructure, catch blocks, Supabase responses, `{}` empty object types, `never` types, assignment errors, misc)
- Remove `ignoreBuildErrors` from `next.config.js`
- Split work into 5 chained PRs, each ≤400 changed lines, autonomously verifiable

### Out of Scope

- Runtime behavior changes (pure type-safety refactor only)
- Adding new type definitions or extracted types to shared locations (fix inline where possible)
- Rewriting logic or improving code quality beyond type correctness

## Capabilities

### New Capabilities

- None — pure refactor, no new behavior

### Modified Capabilities

- `ci-pipeline`: Remove `typescript: { ignoreBuildErrors: true }` — `npm run type-check` and `npm run build` will now enforce TS correctness. No spec-level requirement change (type-check was already a required step; this makes it honest).

## Approach

5 stacked PRs → `main`, each ≤400 lines, each verifiable via `npm run type-check` _before and after_ to prove net-zero regression:

| PR  | Category                 | Est. Lines | Key Files                                                              |
| --- | ------------------------ | ---------- | ---------------------------------------------------------------------- |
| 1   | Infrastructure           | 80–120     | Supabase client generics, jest-dom setup, vitest globals tsconfig      |
| 2   | Catch block narrowing    | 150–250    | `instanceof Error` guards across ~400 unique locations                 |
| 3   | Supabase response typing | 200–300    | `.select<TableType>()`, `.rpc<ReturnType>()` generics                  |
| 4   | `{}` + `never` types     | 200–300    | Replace `{}` with proper types, fix reduce inference                   |
| 5   | Assignment + misc        | 100–200    | Remaining unknown narrowing, Zod/RHF fixes, remove `ignoreBuildErrors` |

## Affected Areas

| Area                         | Impact   | Description                                      |
| ---------------------------- | -------- | ------------------------------------------------ |
| `src/**/*.ts(x)`             | Modified | Type annotations, generics, and narrowing guards |
| `next.config.js`             | Modified | Remove `ignoreBuildErrors: true`                 |
| `tsconfig.json`              | Modified | Potentially add vitest globals types             |
| `src/lib/supabase/server.ts` | Modified | Add `Database` generic to service role client    |

## Risks

| Risk                               | Likelihood | Mitigation                                                                                           |
| ---------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| Stacked PR merge conflicts         | Medium     | Each PR targets `main`; coordinate to avoid overlapping changes — define clear file ownership per PR |
| Missed error in catch-all bucket   | Low        | `type-check` before/after on each PR catches regressions                                             |
| Incorrect type narrows hiding bugs | Low        | No runtime behavior changes — type assertions don't alter execution                                  |

## Rollback Plan

Per-PR: revert individual PR. Full: restore `ignoreBuildErrors: true` in `next.config.js`. The old commit is accessible via git revert.

## Dependencies

- None — pure TypeScript changes, no new packages

## Success Criteria

- [ ] `npm run type-check` reports 0 errors (eliminates all 2,569)
- [ ] `npm run build` passes with `ignoreBuildErrors` removed
- [ ] All 5 PRs merged and verified independently
