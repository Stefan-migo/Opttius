# Proposal: Phase 6.4 — Split Fauna Grande

## Intent

361 source files >300 lines (165,238 lines total) — continuación de Phase 6.1 (god files >700, completado). Target: 361 → <250 files >300 lines, zero files >500 lines, eliminar todos los eslint-disable max-lines.

Puro refactor estructural — cero cambios de comportamiento.

## In Scope

- P1: God files >700 (9 archivos)
- P2: eslint-disable max-lines debt (13 archivos)
- P3: 500-700 lines (~40 archivos)
- P4: 300-500 lines (~300 archivos)

## Out of Scope

- Tests (se encogen naturalmente al refactorizar source)
- src/types/supabase.generated.ts (generado)
- Config files, scripts/, migrations
- Cambios de comportamiento

## Approach

Extract + compose por file. Patrones de Phase 6.1:

- Components: extract tabs → \_components/, state → \_hooks/
- AI tools: schemas + tool array en parent, execute handlers → \_actions/
- Agent: split overloaded methods into sub-modules
- Services: extract responders → responders/
- Routes: split handlers → handlers/{operation}.ts

## Estimated PRs

~55 chained PRs stacked-to-main, cada uno <400 líneas. P1/P2 first (menor riesgo de conflicto).

## Success Criteria

- [ ] 9 god files >700 split to <300
- [ ] 13 eslint-disable max-lines removed
- [ ] Files >300 lines: 361 → <250
- [ ] Zero source files >500 lines
- [ ] build + lint + test pasan sin regresiones
- [ ] APIs, exports, routes unchanged
