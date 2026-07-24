# TypeScript Error Resolution — Specification

## Purpose

Eliminar todos los errores de tipo TypeScript reportados por `tsc --noEmit` en modo `strict: true`. Este cambio NO introduce nueva funcionalidad ni modifica comportamiento existente — es una corrección de tipos por patrones.

## Requirements

### Functional Requirements

#### Batch 1 — Top 10 files con más errores

- MUST: Corregir los 10 archivos con mayor cantidad de errores TS18046, TS2339, TS2571
- MUST: Cada archivo debe quedar sin errores al finalizar el batch
- SHOULD: No cambiar lógica de negocio ni flujo de datos — solo firmas de tipo
- Scenario: GIVEN `npx tsc --noEmit` sobre el top-10 de archivos, WHEN se aplican correcciones de tipo, THEN cada archivo reporta 0 errores

#### Batch 2 — Parámetros `unknown` (supabase, request body)

- MUST: Tipar `supabase` como `SupabaseClient<Database>` en toda función de admin services que lo reciba como `unknown`
- MUST: Tipar `body` de request con interfaces explícitas (Zod o tipos inline)
- MUST: Tipar `request: NextRequest` donde falte
- Scenario: GIVEN una función admin service con `supabase: unknown`, WHEN se agrega tipo `SupabaseClient<Database>`, THEN TypeScript acepta member access (`supabase.from(...)`) sin TS2571
- Scenario: GIVEN un API route handler con `body: unknown`, WHEN se tipa la interfaz del body, THEN el handler accede a propiedades del body sin TS18046

#### Batch 3 — useState/useRef sin tipo genérico

- MUST: Agregar tipo genérico a `useState<T>()` donde `T` sea deducible del contexto
- MUST: Agregar tipo genérico a `useRef<T>()` donde `T` sea conocido
- SHOULD: Reutilizar tipos existentes de `@/types/` o tipos generados de Supabase
- Scenario: GIVEN `useState([])`, WHEN se agrega `useState<SomeType[]>([])`, THEN el estado tipado elimina TS2345 en operaciones subsecuentes
- Scenario: GIVEN `useRef(null)`, WHEN se agrega `useRef<HTMLDivElement>(null)`, THEN el ref es accesible sin TS2531

#### Batch 4 — JSON.parse y consultas Supabase sin tipo

- MUST: Tipar `JSON.parse()` con `as Type` donde se conozca la estructura del resultado
- MUST: Usar `supabase.from<"table_name">(...)` con tipos explícitos en toda consulta
- SHOULD: Destructurar queries con `const { data }: { data: Type | null } = await query`
- Scenario: GIVEN `JSON.parse(str)`, WHEN se conoce la estructura, THEN se agrega `as KnownType` y el resultado se usa sin TS18046
- Scenario: GIVEN `supabase.from("table").select("*")`, WHEN se agrega `supabase.from<"table">(...)`, THEN el resultado tiene tipo conocido

#### Batch 5 — Type mismatches reales (TS2345, TS2322, TS2769)

- MUST: Corregir todos los TS2345 (argument mismatch), TS2322 (assignment), TS2769 (overload) restantes
- MAY: Usar `@ts-expect-error` con comentario explícito solo cuando el tipo sea genuinamente dinámico (ej: LLM responses, datos externos sin schema)
- Scenario: GIVEN un argumento con tipo incorrecto, WHEN se alinea el tipo esperado con el real, THEN TS2345 se resuelve
- Scenario: GIVEN una función con overloads donde el argumento no matchea, WHEN se ajusta la firma o se usa type guard, THEN TS2769 se resuelve
- Scenario: GIVEN una respuesta LLM con shape dinámico, WHEN se usa `@ts-expect-error // LLM response shape is dynamic`, THEN el error se suprime con justificación

### Non-Functional Requirements

- MUST: `npx tsc --noEmit` debe producir 0 errores al finalizar Batch 5
- MUST: No romper funcionalidad existente — las correcciones son solo de tipo, sin cambiar runtime behavior
- MUST: No cambiar APIs públicas ni firmas de exportación de componentes/servicios
- SHOULD: Mantener `strict: true` en `tsconfig.json` (no relajar strict mode)
- SHOULD: No agregar `// @ts-ignore` — usar `@ts-expect-error` con comentario de razón si es inevitable
- Scenario: GIVEN `strict: true` en tsconfig, WHEN `npx tsc --noEmit`, THEN exit code 0
- Scenario: GIVEN `ignoreBuildErrors: true` activo en `next.config.js`, WHEN todos los batches están completos, THEN se puede desactivar `ignoreBuildErrors`
- Scenario: GIVEN código original sin cambios de lógica, WHEN solo se modificaron tipos, THEN `npm run test:run` no muestra nuevos failures
