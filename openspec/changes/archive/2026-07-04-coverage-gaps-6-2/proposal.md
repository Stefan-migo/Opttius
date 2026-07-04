# Proposal: coverage-gaps-6-2

## Intent

Cerrar gaps de cobertura unitaria en módulos críticos de infraestructura y validación. `src/utils/supabase/` tiene 0 tests salvo `webhook.ts`; `quotes.ts` y `work-orders.ts` tienen tests iniciales pero cubren solo 38% y 34% (branch coverage). Sin estos tests, regresiones silenciosas en clientes de DB y schemas de validación llegan a producción.

## Scope

### In Scope
- **Change 1 — `add-unit-tests-supabase-utils`**: Tests unitarios para `client.ts`, `server.ts`, `cron.ts`. Excluye `service-role.ts` (re-export puro de `./server`).
- **Change 2 — `add-unit-tests-validation-quotes-work-orders`**: Expandir tests existentes de `quotes.ts` (38%→80% branch) y `work-orders.ts` (34%→80% branch).

### Out of Scope
- Otros schemas de validación (`customers`, `products`, `pos`, `agreements`, `lenses`) — cubiertos o postergados.
- Tests de integración o E2E.
- Refactor de producción — solo tests.

## Capabilities

None — pure test coverage. No behavioral or spec-level changes.

## Approach

**Pattern** (ya probado en `webhook.test.ts`): `vi.mock("@supabase/supabase-js")` + `vi.stubEnv` para tests de supabase utils. Schemas: `schema.safeParse()` con validPayload + spread, siguiendo `appointments.test.ts`.

**Coverage target:** 80% branch en quotes.ts y work-orders.ts. Agregar casos faltantes: edge/null en cada preprocess/refine, todos los enum values, string→number coercion, boundary conditions en campos numéricos.

**server.ts complexity:** `createClient()` llama `await cookies()` (Next.js 15+ async API). Se mockea `vi.mock("next/headers", () => ({ cookies: vi.fn() }))`. `createClientFromRequest` se testea con `NextRequest` mockeado vía `Request` + headers.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/__tests__/unit/supabase/client.test.ts` | New | Tests para createClient() browser |
| `src/__tests__/unit/supabase/server.test.ts` | New | Tests para createClient, createClientFromRequest, createServiceRoleClient |
| `src/__tests__/unit/supabase/cron.test.ts` | New | Tests para createCronClient (env check + throw) |
| `src/__tests__/unit/lib/validation/schemas/quotes.test.ts` | Modified | Expandir de ~20 a ~35 casos (+coverage branches) |
| `src/__tests__/unit/lib/validation/schemas/work-orders.test.ts` | Modified | Expandir de ~22 a ~35 casos (+coverage branches) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `cookies()` async mocking in Next.js 15 | Med | `vi.mock("next/headers")` con retorno de Promise. Pattern validado en comunidad vitest |
| `createClientFromRequest` usa `NextRequest` type | Bajo | Usar `new Request()` + mock de headers; el type check se resuelve con `as unknown as NextRequest` |
| Los tests actuales no miden branch coverage real | Bajo | Correr `npx vitest run --coverage src/__tests__/unit/lib/validation/schemas/` para medir baseline |

## Rollback Plan

Eliminar los 3 test files nuevos + revertir cambios en los 2 existentes. Ningún código de producción modificado — reversión instantánea.

## Dependencies

- Vitest + @vitest/coverage-v8 ya configurados
- `webhook.test.ts` existe como patrón de referencia
- `test-validation-schemas` change (proposal-only, tests ya creados parcialmente)

## Success Criteria

- [ ] `npx vitest run src/__tests__/unit/supabase/` — 3 test files, todos pasando
- [ ] `npx vitest run src/__tests__/unit/lib/validation/schemas/quotes.test.ts` — branch coverage ≥80%
- [ ] `npx vitest run src/__tests__/unit/lib/validation/schemas/work-orders.test.ts` — branch coverage ≥80%
- [ ] `npm run test:unit` — sin regresiones en tests existentes
