# Proposal: Phase 6.3 — `any` Type Reduction

## Intent

185 `any` occurrences across 31 files undermine type safety and block strict-mode adoption. ~64% concentrated in the AI module (`src/lib/ai/`). ~55% are mechanical quick wins (`: any` → `: unknown`, `as any` → `as Type`). The rest need Zod schemas or explicit `@ts-expect-error` with reasons for genuinely dynamic shapes.

## Scope

### In Scope

- Eliminate all 185 `any` occurrences — target <10 intentional escapes
- Mechanical replacements: `: any` → `: unknown`, `as any` → `as Type` (~100)
- AI module: Zod schemas where feasible, `@ts-expect-error` with reasons where not (~60)
- Remaining hard cases: webhook payloads, dynamic LLM shapes (~25)

### Out of Scope

- No runtime behavior changes — type-only refactor
- No migration to `strict: true` in tsconfig
- No spec-level capability changes

## Capabilities

### New Capabilities

None — pure type-fix refactor. No spec-level behavior changes.

### Modified Capabilities

None — no requirements are changing.

## Approach

3-batch single-PR strategy (~185 lines, within 400-line budget):

1. **Batch 1 — Quick Wins** (~100 changes): `: any` → `: unknown` in internal function signatures. Replace trivially known `as any` with `as Type`. Mechanical, low-risk.
2. **Batch 2 — AI Module** (~60 changes): Zod schemas for LLM tool I/O. `@ts-expect-error // LLM response shape is dynamic` where Zod can't model it.
3. **Batch 3 — Edge Cases** (~25 changes): Webhook payloads, `JSON.parse` on unknown external shapes, remaining loose ends.

All batches are independent and individually revertable.

## Affected Areas

| Area                     | Impact   | Changes                                   |
| ------------------------ | -------- | ----------------------------------------- |
| `src/lib/ai/*`           | Modified | ~118 (tools, response types, agent state) |
| `src/app/api/*`          | Modified | ~22 (webhooks, request handlers)          |
| `src/lib/api/services/*` | Modified | ~18 (Supabase query results)              |
| `src/components/admin/*` | Modified | ~15 (dynamic data, prop drilling)         |
| `src/hooks/*` + other    | Modified | ~12                                       |

## Risks

| Risk                                             | Likelihood | Mitigation                                           |
| ------------------------------------------------ | ---------- | ---------------------------------------------------- |
| Overly loose `unknown` cascades to runtime `any` | Low        | `unknown` forces cast before use — safer than `any`  |
| AI LLM shapes too dynamic for Zod                | Medium     | Fall back to `@ts-expect-error` with explicit reason |
| Batch 2 changes break AI tool calls              | Low        | Per-batch CI passes must confirm                     |

## Rollback Plan

Per-batch revert: each batch is a self-contained commit. `git revert <commit-sha>` per batch. Full rollback = `git revert <merge-commit>`.

## Dependencies

None. Pure type-fix refactor. No new packages, no schema changes.

## Success Criteria

- [ ] `npx tsc --noEmit` shows ≤10 `any` escapes — all with documented reasons
- [ ] Existing tests pass (`npm run test:run`)
- [ ] No runtime regressions from type-only changes
- [ ] Each batch commit independently passes CI type-check
