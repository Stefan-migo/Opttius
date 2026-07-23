# Design: Phase 6.2 — TypeScript Error Resolution

## Technical Approach

Reduce 3,583 TS errors (`tsc --noEmit`) to 0 without changing runtime behavior.
Fix by propagating **source types** rather than patching each error site — ~49% of errors are TS18046 (unknown cascade) and ~21% are TS2339 (property access on `{}`), both caused by untyped roots.

5 batches, ordered by descending impact. Each batch = one commit, independently revertible.

## Architecture Decisions

### Decision: Root-cause over per-site patching

| Option                                   | Tradeoff                                     |
| ---------------------------------------- | -------------------------------------------- |
| Fix each error site individually         | ~3,500 edits, high cascade risk, misses root |
| Fix the source type (prop, param, state) | ~500 root edits, cascades to zero errors     |

**Decision**: Root-cause approach — fix the `unknown`/`{}` source, let TS resolve all downstream accesses in one shot.

### Decision: Batch ordering

1. **Batch 1** — Top 10 files (~740 errors): manual file-by-file, establishes patterns
2. **Batch 2** — `unknown` params: grep-surgically tipar `supabase`, `body`, `request` params
3. **Batch 3** — `useState<T>` sin tipo: regex-add generics where TS inference fails
4. **Batch 4** — `JSON.parse` + query destructuring: `as Type` + `from<"table">`
5. **Batch 5** — Remaining mismatches (TS2345/2322/2769): puntual

**Decision**: Merge Batch 5 reservation for AI module — LLM responses have genuinely
dynamic shapes. Use `@ts-expect-error // LLM response shape is dynamic` there,
not `any`.

### Decision: No `tsconfig.json` changes

`strict: true` stays on. Batch 5 handles all remaining strict-mode mismatches.
After completion, flip `next.config.js` `ignoreBuildErrors: false`.

## Error Profile (live baseline)

| Code      | Count     | Root cause                     |
| --------- | --------- | ------------------------------ |
| TS18046   | 1,752     | Unknown source type → cascade  |
| TS2339    | 770       | `{}` inferred (no source type) |
| TS2345    | 230       | Argument type mismatch         |
| TS2571    | 182       | Object is `unknown`            |
| TS2322    | 96        | Assignment type mismatch       |
| TS2769    | 39        | No overload match              |
| TS2698    | 39        | Spread types                   |
| Others    | 515       | TS2304, TS2352, TS2582, etc.   |
| **Total** | **3,583** | 503 files                      |

## Fix Patterns by Error Code

| Error       | Pattern                                                               |
| ----------- | --------------------------------------------------------------------- |
| TS18046     | Tipar la fuente (prop, estado, query) — no el acceso                  |
| TS2339      | Idem — `{}` viene de `useState({})` sin generic o query sin tipar     |
| TS2571      | Idem — `Object is unknown`                                            |
| TS2345/2322 | Corregir tipo destino o `as` si es seguro                             |
| TS2769      | Tipos generados desactualizados (supabase.generated.ts ya regenerado) |
| TS2582/2304 | Test files — agregar `/// <reference types="vitest" />`               |

## File Changes

| Area                            | Action                                             | Est. files |
| ------------------------------- | -------------------------------------------------- | ---------- |
| `src/lib/api/services/*`        | Modify — tipar supabase client + query types       | ~15        |
| `src/app/admin/cash-register/*` | Modify — tipar `orders: unknown[]` → interfaz real | ~5         |
| `src/app/admin/*`               | Modify — tipar props de estado y request body      | ~40        |
| `src/components/admin/*`        | Modify — tipar `useState<T>` y props               | ~30        |
| `src/lib/ai/*`                  | Modify — `@ts-expect-error` en LLM responses       | ~5         |
| `src/app/api/*`                 | Modify — tipar request body y params               | ~20        |
| Test files                      | Modify — agregar reference types                   | ~10        |
| Other                           | Modify — remanentes batch 5                        | ~50        |

Total: ~175 files modified. Not all 503 — root-cause approach collapses clusters.

## Testing Strategy

| Layer      | What                   | How                        |
| ---------- | ---------------------- | -------------------------- |
| Type check | `npx tsc --noEmit` = 0 | After each batch           |
| Regression | Existing tests pass    | `npm run test:run`         |
| Runtime    | No behavioral change   | No new functionality added |

## Risks

| Risk                                | Mitigation                                                   |
| ----------------------------------- | ------------------------------------------------------------ |
| AI module LLM responses are dynamic | Batch 5 — `@ts-expect-error` with justification, never `any` |
| Generated types drift               | `supabase.generated.ts` regenerated before Batch 1           |
| CI type-check timeout               | First time from 3,583→0 may take longer; set timeout 120s    |
| Test vitest types missing           | `/// <reference types="vitest" />` in test files (TS2582)    |

## Migration / Rollout

No migration required. Per-batch revert strategy:

```
git revert <batch-commit> -m 1  # revert batch n
```

Full rollback: `git revert <merge-commit>` after all batches merged.

## Open Questions

- None. Strategy is validated against live `tsc` output (3,583 actual vs 3,217 estimated errors — approach unchanged).
