# Proposal: Eliminate Duplicate Zod Helpers

## Intent

Two identical 373-line `zod-helpers.ts` files exist — one at `src/lib/validation/zod-helpers.ts` (canonical) and one at `src/lib/api/validation/zod-helpers.ts` (duplicate). The only difference is the import path for `ValidationError`. This is C9 in the 2026-06-30 audit: a bug waiting to happen when one gets updated and the other doesn't. Remove the duplicate while preserving all existing consumer behavior.

## Scope

### In Scope

- Fix the canonical `src/lib/validation/zod-helpers.ts` to import `ValidationError` from `@/lib/api/errors` (preserving error class identity for consumers that use `instanceof`)
- Convert `src/lib/api/validation/zod-helpers.ts` to a barrel re-export of `@/lib/validation/zod-helpers`
- Verify the build compiles

### Out of Scope

- No functional changes to the helpers themselves
- No touching the 49 files that import from `@/lib/api/validation/zod-helpers`
- No deletion of `src/lib/validation/errors.ts` (unused after this change, but cleanup deferred)

## Capabilities

> This is a pure refactor — no spec-level behavior changes.

**New Capabilities:** None

**Modified Capabilities:** None

## Current State

| Path                                    | Lines | Role                                                                                     |
| --------------------------------------- | ----- | ---------------------------------------------------------------------------------------- |
| `src/lib/validation/zod-helpers.ts`     | 373   | Canonical — imports `ValidationError` from `./errors` (simple `Error` subclass, 9 lines) |
| `src/lib/api/validation/zod-helpers.ts` | 373   | Duplicate — imports `ValidationError` from `../errors` (`APIError` subclass, 186 lines)  |
| `src/lib/api/errors.ts`                 | 186   | Full error hierarchy — `ValidationError extends APIError extends Error`                  |
| `src/lib/validation/errors.ts`          | 9     | Simple `ValidationError extends Error`                                                   |

**Imports by path:**

- `@/lib/api/validation/zod-helpers` → **49 files** (route handlers, services)
- `@/lib/validation/zod-helpers` → **0 files** (only referenced in docs/roadmap)
- `ValidationError` from `@/lib/api/errors` → **23 files** catch it via `instanceof`

## Approach

**Two-file change, zero consumer edits.**

1. **Fix canonical import** — Change `src/lib/validation/zod-helpers.ts` line 4 from `import { ValidationError } from "./errors"` to `import { ValidationError } from "@/lib/api/errors"`. This preserves error class identity: the helpers throw the same `ValidationError extends APIError` class that consumers catch via `instanceof` from `@/lib/api/errors`.

2. **Barrel duplicate** — Replace the entire content of `src/lib/api/validation/zod-helpers.ts` with a single re-export: `export * from "@/lib/validation/zod-helpers"`. This keeps all 49 existing imports working without changes.

3. **Verify** — Run `npm run build` and `npm run type-check`.

### Why barrel instead of updating 49 imports

Ponytail principle: 1 file changed vs 50. The barrel adds zero runtime overhead (bundler resolves it at compile time) and is the standard Next.js pattern for backward-compatible moves.

### Why the import fix is necessary

The duplicate file imports `ValidationError` from `@/lib/api/errors` (the `APIError` subclass), while the canonical file imports from `./errors` (a standalone `Error` subclass). If we simply redirect imports to the canonical file without fixing this, 23 consumers that do `error instanceof ValidationError` (where `ValidationError` comes from `@/lib/api/errors`) will silently fail to catch errors thrown by the helpers. The types match structurally but `instanceof` fails across different classes with identical shape.

## Affected Areas

| Area                                    | Impact   | Description                                                   |
| --------------------------------------- | -------- | ------------------------------------------------------------- |
| `src/lib/validation/zod-helpers.ts:4`   | Modified | Change `./errors` → `@/lib/api/errors`                        |
| `src/lib/api/validation/zod-helpers.ts` | Replaced | Full content → `export * from "@/lib/validation/zod-helpers"` |

## Risks

| Risk                                                                                      | Likelihood | Mitigation                                                                                      |
| ----------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| Instanceof breakage from different `ValidationError` class                                | Med        | Explicitly addressed by fixing the canonical import — class identity preserved                  |
| Circular dependency via `@/lib/api/errors` ← `zod-helpers`                                | Low        | `@/lib/api/errors` has zero imports from validation; confirmed safe                             |
| Barrel export doesn't re-export `ValidationError` (the `export { ValidationError }` line) | Low        | The canonical file has `export { ValidationError }` at line 6 — barrel passthrough works        |
| Regression in 49 route handlers                                                           | Low        | No behavioral change — same functions, same exports, same module resolution when barrel is used |

## Rollback Plan

1. Revert the two changed files with `git checkout HEAD -- src/lib/validation/zod-helpers.ts src/lib/api/validation/zod-helpers.ts`
2. No data migration needed (pure code change)

## Dependencies

None.

## Success Criteria

- [ ] `npm run build` passes with zero errors
- [ ] `npm run type-check` passes
- [ ] All 49 imports of `@/lib/api/validation/zod-helpers` still resolve
- [ ] The barrel file is the new single line at `src/lib/api/validation/zod-helpers.ts`
- [ ] No files other than the two target files are modified
