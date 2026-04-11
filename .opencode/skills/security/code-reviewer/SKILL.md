---
name: code-reviewer
description: Expert guide for conducting thorough code reviews on the Opttius codebase. Use when reviewing pull requests, performing static analysis, checking code quality, ensuring best practices, or mentoring developers. Covers TypeScript, Next.js, Supabase, and React best practices.
---

# Code Reviewer Guide for Opttius

Comprehensive code review guidelines for the Opttius codebase.

## Cuándo Usar Este Skill

- Revisar pull requests
- Realizar análisis estático de código
- Verificar calidad y best practices
- Mentoring de desarrolladores
- Prevenir bugs antes de producción

## Checklist de Code Review

### Arquitectura y Diseño

- [ ] El código sigue los patrones establecidos del proyecto
- [ ] No hay duplicación de lógica existente
- [ ] Las abstracciones son apropiadas (ni sobre ni sub-ingeniería)
- [ ] El código es testeable
- [ ] Cambios son backward-compatible

### TypeScript

- [ ] Tipos explícitos en funciones públicas
- [ ] No hay `any` sin justificación
- [ ] Interfaces bien nombradas
- [ ] Generic types cuando aplica
- [ ] Types en vez de enums para constants?

### Next.js / React

- [ ] Componentes Server vs Client apropiadamente separados
- [ ] Hooks usados correctamente
- [ ] No hay hydration mismatches
- [ ] Metadata apropiada en pages
- [ ] Error boundaries donde corresponde

### Supabase

- [ ] Queries usan RPCs o query builder (no SQL strings)
- [ ] RLS policies creadas/actualizadas si aplica
- [ ] organization_id y branch_id validados
- [ ] Índices agregados para queries nuevas
- [ ] Transactions usadas para operaciones multi-paso

### Seguridad

- [ ] Input validation con Zod
- [ ] No hay secrets hardcodeados
- [ ] Authorization checks en todas las APIs
- [ ] Output encoding apropiado
- [ ] SQL injection prevented

### Performance

- [ ] No N+1 queries
- [ ] Lazy loading donde corresponde
- [ ] Memoización si hay cálculos costosos
- [ ] Imágenes optimizadas
- [ ] Code splitting apropiado

### Testing

- [ ] Tests para lógica de negocio compleja
- [ ] Tests para edge cases
- [ ] Coverage razonable (aunque no 100% es esperado)
- [ ] Tests no flaky

### UX/UI (si aplica)

- [ ] Feedback visual para estados de loading
- [ ] Manejo de errores para usuario
- [ ] Accesibilidad (labels, aria)
- [ ] Responsive donde aplica

## Comment Labels

### severity/

- `severity/must-fix` - Bug o security issue
- `severity/should-fix` - Mejora importante
- `severity/nitpick` - Estilo menor

### type/

- `type/bug` - Bug identificado
- `type/design` - Tema de diseño
- `type/question` - Pregunta sobre el código
- `type/suggestion` - Mejora sugerida
- `type/praise` - Algo bien hecho!

## Ejemplo de Review

````markdown
## Review: PR #123 - Agregar exportación a CSV

**Revisor:** [Nombre]
**Fecha:** 2026-03-28
**Overall:** ✅ Approve con comments

### Comments

1. **severity/must-fix** - `src/lib/exports.ts:45`
   El archivo no cierra el stream en caso de error.

   ```typescript
   // Current (problem)
   const stream = createWriteStream(path);
   // Si lanza aquí, stream queda abierto

   // Suggested
   const stream = createWriteStream(path);
   try {
     // write...
   } finally {
     stream.close();
   }
   ```
````

2. **severity/nitpick** - `src/components/ExportButton.tsx:12`
   Nit: Podrías usar `useCallback` para evitar re-renders.

### Resumen

Buen PR! Solo un must-fix de resource handling.

````

## Patrones a Verificar en Opttius

### Multi-tenant

```typescript
// ✅ Correcto: Verificar acceso antes de operar
const workOrder = await validateBranchAccess(user.id, branchId);
if (!workOrder) return createApiErrorResponse(403);

// ❌ Incorrecto: Asunción de acceso
const workOrder = await db.workOrder.findFirst({ where: { id } });
````

### API Responses

```typescript
// ✅ Correcto: Usar helpers
return createApiSuccessResponse(data);
return createApiErrorResponse(400, "Mensaje de error");

// ❌ Incorrecto: Raw objects
return res.status(200).json({ success: true, data });
```

### Zod Validation

```typescript
// ✅ Correcto: Schema compartido
const UpdateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});
const data = UpdateProductSchema.parse(body);

// ❌ Incorrecto: Validación inline
const data = {
  name: body.name, // sin validación
  price: Number(body.price), // puede ser NaN
};
```

## Tools de Análisis

```bash
# ESLint
npm run lint

# Type check
npm run type-check

# Build test
npm run build

# Security lint
npm run lint:security
```

## Documentación Relacionada

- Skill `security-audit` - Seguridad detallada
- Skill `database-optical-supabase` - Supabase patterns
- Skill `testing-optical-supabase` - Testing guidelines
