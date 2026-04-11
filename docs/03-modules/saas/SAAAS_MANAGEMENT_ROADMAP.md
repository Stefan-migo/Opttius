# Roadmap: SaaS Management Engine - Implementación

**Fecha de creación:** 2026-04-01  
**Última actualización:** 2026-04-01  
**Status:** En Progreso

---

## Resumen

El SaaS Management Engine está implementado en ~90%. Este documento detalla el plan para completar el 10% restante.

**Progress:**

- ✅ SaaS-1: Webhooks - 100% (ya existente, docs creadas)
- ✅ SaaS-2: Auditoría - 100%
- ✅ SaaS-3: Rate Limiting - 100% (ya implementado)
- ✅ SaaS-4: OpenAPI - 0% (pendiente)

---

## Sprint 1 (Items SaaS-1 y SaaS-2)

### 1. [SaaS-1] Webhooks para Eventos de Suscripción

**Status:** ⏳ Pendiente  
**Prioridad:** P1 - High  
**Estimación:** 2 días

**Descripción:** El webhook de Mercado Pago ya existe pero necesita mejoras parahandle subscription events específicamente.

**Trabajo necesario:**

- [ ] **1.1** Revisar y mejorar el webhook de Mercado Pago existente:
  - Ya soporta `subscription_preapproval` y `preapproval`
  - Necesita agregar manejo de eventos de suscripción cancelados/pausados
- [ ] **1.2** Documentar endpoints de webhook existentes:
  - `/api/webhooks/mercadopago` - ✅ Ya existe
  - `/api/webhooks/paypal` - ✅ Ya existe
  - `/api/webhooks/flow` - ✅ Ya existe
  - `/api/webhooks/nowpayments` - ✅ Ya existe

- [ ] **1.3** Crear documentación de webhooks:
  - Tipos de eventos soportados
  - Cómo configurar en dashboard de cada gateway
  - Ejemplos de payloads

**Referencias:**

- Webhook MP: `src/app/api/webhooks/mercadopago/route.ts`
- PaymentService: `src/lib/payments/services/payment-service.ts`

---

### 2. [SaaS-2] Auditoría Completa de Acciones Root

**Status:** ⏳ Pendiente  
**Prioridad:** P2 - Medium  
**Estimación:** 1 día

**Descripción:** Registrar todas las acciones realizadas por usuarios root/dev en una tabla de auditoría.

**Trabajo necesario:**

- [ ] **2.1** Crear migración para tabla `saas_audit_log`:

  ```sql
  CREATE TABLE public.saas_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES admin_users(id),
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX idx_saas_audit_log_user_id ON saas_audit_log(user_id);
  CREATE INDEX idx_saas_audit_log_target ON saas_audit_log(target_type, target_id);
  ```

- [ ] **2.2** Crear función helper para registrar auditoría:
  - `src/lib/saas/audit-log.ts`

- [ ] **2.3** Integrar en endpoints:
  - `POST /api/admin/saas-management/organizations/[id]/actions`
  - `POST /api/admin/saas-management/subscriptions/[id]/actions`
  - `PATCH /api/admin/saas-management/tiers`
  - `DELETE /api/admin/saas-management/organizations/[id]`

- [ ] **2.4** Crear UI de visualización (opcional):
  - `/admin/saas-management/audit` page

---

## Sprint 2 (Items SaaS-3 y SaaS-4)

### 3. [SaaS-3] Rate Limiting en Endpoints Sensibles

**Status:** ⏳ Pendiente  
**Prioridad:** P2 - Medium  
**Estimación:** 1 día

**Descripción:** Implementar rate limiting para prevenir ataques y abuso de APIs.

**Trabajo necesario:**

- [ ] **3.1** Investigar solución existente:
  - Revisar si ya hay rate limiting implementado
  - Ver `src/lib/api/rate-limit.ts` o similar

- [ ] **3.2** Implementar middleware si no existe:
  - Usar `upstash/ratelimit` o implementar custom

- [ ] **3.3** Proteger endpoints:
  - `/api/admin/saas-management/organizations` (POST) - Max 10/min
  - `/api/admin/saas-management/users` (POST) - Max 20/min
  - `/api/admin/saas-management/*/actions` - Max 30/min
  - `/api/admin/saas-management/*/delete` - Max 5/min

---

### 4. [SaaS-4] Documentación OpenAPI para APIs SaaS

**Status:** ⏳ Pendiente  
**Prioridad:** P3 - Low  
**Estimación:** 2 días

**Descripción:** Generar documentación OpenAPI/Swagger para las APIs de SaaS Management.

**Trabajo necesario:**

- [ ] **4.1** Instalar dependencias:
  - `swagger-jsdoc` o `@apidevtools/swagger-cli`
  - `scalar` para UI

- [ ] **4.2** Configurar generación automática:
  - Agregar JSDoc a las rutas existentes
  - Generar `openapi.json`

- [ ] **4.3** Crear endpoint de documentación:
  - `/api/docs` para UI

---

## Notas de Implementación

### Dependencias Existentes

- El webhook de Mercado Pago ya maneja suscripciones parcialmente
- La tabla `webhook_events` ya existe para idempotencia
- El PaymentService ya tiene `applyPaymentSuccessToOrganization`

### Decisions Pendientes

1. ¿Usar Upstash Rate Limit o implementar custom?
2. ¿Generar OpenAPI manually o usar swagger-jsdoc?
3. ¿Crear UI de auditoría o solo API?

---

## Referencias

- Documentación principal: `docs/03-modules/saas/SAAS_MANAGEMENT_SYSTEM.md`
- Tier System: `docs/03-modules/saas/TIERS_SYSTEM.md`
- Código: `src/lib/saas/`
- APIs: `src/app/api/admin/saas-management/`
- Webhooks: `src/app/api/webhooks/`
