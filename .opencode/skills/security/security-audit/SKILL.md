---
name: security-audit
description: Expert guide for security auditing of Opttius SaaS application. Use when performing security reviews, vulnerability assessments, OWASP Top 10 checks, penetration testing, or implementing security best practices for Next.js, Supabase, and multi-tenant applications.
---

# Security Audit Guide for Opttius

Comprehensive security auditing for the Opttius optical SaaS platform.

## Cuándo Usar Este Skill

- Realizar auditoría de seguridad completa
- Revisar vulnerabilidades OWASP Top 10
- Verificar políticas RLS en Supabase
- Revisar autenticación y autorización
- Validar protección de datos sensibles
- Investigar incidentes de seguridad

## OWASP Top 10 - Aplicación Opttius

### 1. Broken Access Control (A01:2021)

**Patrones de riesgo en Opttius:**

- Falta de validación de `organization_id` en APIs
- Endpoints que omiten `x-branch-id` header
- Asunción de que RLS es suficiente sin validación adicional

**Cómo verificar:**

```typescript
// Checklist de acceso
- [ ] Todas las APIs verifican ownership del recurso
- [ ] admin_branch_access se valida correctamente
- [ ] Super admins tienen acceso controlado
- [ ] No hay bypass de RLS con service role
```

**Casos críticos en Opttius:**

- `src/app/api/admin/work-orders/[id]/deliver/route.ts` - Ya corregido (bug 404)
- APIs que usan `addBranchFilter` sin validar acceso primero
- Funciones RPC con SECURITY DEFINER

### 2. Cryptographic Failures (A02:2021)

**Revisar:**

- Almacenamiento de secrets en `.env.local`
- Tokens de API en logs o errores
- Credenciales en Git history
- SSL/TLS en todas las conexiones

```bash
# Verificar secrets en git
git log --p --grep="API_KEY" --since="30 days"
gitleaks detect --source . --report-format json

# Verificar .env no commiteado
cat .gitignore | grep env
```

### 3. Injection (A03:2021)

**Patrones SQL en Supabase:**

```sql
-- VULNERABLE: Concatenación directa
SELECT * FROM orders WHERE id = '${userInput}';

-- SEGURO: Usar parámetros
SELECT * FROM orders WHERE id = $1;
```

**Verificar:**

- [ ] Todas las queries usan RPC o query builder
- [ ] No hay SQL dinámico sin sanitizar
- [ ] Input validation con Zod en todas las APIs

### 4. Insecure Design (A04:2021)

**Revisar arquitectura:**

- Rate limiting implementado?
- Manejo de errores no filtra stack traces
- Tests de seguridad en CI?

### 5. Security Misconfiguration (A05:2021)

**Checklist:**

- [ ] RLS habilitado en TODAS las tablas public
- [ ] Policies separadas por operación (SELECT/INSERT/UPDATE/DELETE)
- [ ] No hay tablas sin RLS
- [ ] CORS configurado correctamente
- [ ] Headers de seguridad (CSP, X-Frame-Options, etc.)

```sql
-- Verificar RLS
SELECT tablename FROM pg_tables WHERE schemaname = 'public'
AND relrowsecurity = false;
```

### 6. Vulnerable Components (A06:2021)

```bash
# Verificar dependencias vulnerables
npm audit
npx retire.js

# Revisar packages con vulnerabilidades conocidas
npm list --depth=0
```

### 7. Auth Failures (A07:2021)

**Verificar:**

- [ ] Tokens JWT firmados correctamente
- [ ] Refresh tokens con expiración razonable
- [ ] Passwords con hash seguro (bcrypt)
- [ ] MFA disponible para admins?
- [ ] Rate limiting en login

### 8. Data Integrity Failures (A08:2021)

**Revisar:**

- Integridad de datos en Supabase
- Validación en triggers
- Constraints en la base de datos
- Backup y recovery

### 9. Logging & Monitoring (A09:2021)

**Verificar:**

- [ ] Sentry configurado para producción
- [ ] Logs no contienen PII
- [ ] Alertas de seguridad configuradas
- [ ] Failed login attempts monitoreados

### 10. SSRF (A10:2021)

**Verificar requests externos:**

```typescript
// VULNERABLE
fetch(userProvidedUrl);

// SEGURO
const url = new URL(userProvidedUrl);
if (url.hostname !== "expected.com") throw new Error("Invalid URL");
```

## RLS Security Audit

### Tablas Críticas (siempre verificar RLS)

```sql
-- Tablas que DEBEN tener RLS
-- Organizations, branches, customers, orders,
-- lab_work_orders, admin_users, product_branch_stock
```

### Políticas por Tabla

| Tabla       | SELECT     | INSERT     | UPDATE     | DELETE     |
| ----------- | ---------- | ---------- | ---------- | ---------- |
| customers   | org+branch | org+branch | org+branch | admin solo |
| orders      | branch     | branch     | branch     | admin solo |
| admin_users | org        | root       | root       | root       |
| products    | org        | org        | org        | org        |

## Commands de Verificación

```bash
# Lint de seguridad
npm run lint:security

# Test de seguridad
npm run test:security

# Verificar configuración Supabase
cat supabase/config.toml

# Dump de políticas RLS
psql $DATABASE_URL -c "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname = 'public';"
```

## Reporte de Vulnerabilidades

Estructura del reporte:

```markdown
## Vulnerabilidad: [Nombre]

**Severidad:** Critical | High | Medium | Low
**OWASP:** [Categoría]
**Ubicación:** [Archivo, línea]
**Descripción:** [Explicación]
**Impacto:** [Qué pasa si se explota]
**Recomendación:** [Cómo corregir]
**PoC:** [Proof of concept si aplica]
```

## Documentación Relacionada

- Skill `database-optical-supabase` - RLS policies
- Skill `supabase-auth` - Autenticación
- `docs/AI_SYSTEM.md` - Sistema de IA
- `docs/AUTH_SYSTEM.md` - Sistema de auth
