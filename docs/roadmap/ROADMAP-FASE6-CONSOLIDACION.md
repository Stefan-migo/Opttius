# 🗺️ Opttius — Roadmap: Fase 6 — Consolidación

**Predecesor:** `AUDIT-TO-9-ROADMAP.md` (Fases 0-5, completado 2026-07-03)
**Score estimado post-F5:** 9.0/10
**Naturaleza:** Mejora continua — no hay más fases planificadas, este roadmap consolida los cabos sueltos.

---

## Resumen de Deuda Técnica Remanente

| Ítem | Magnitud | Riesgo | Esfuerzo |
|------|----------|--------|----------|
| God files >500 líneas | 129 archivos (9 megafauna >1000) | Alto | 3-4 sprints |
| Coverage gaps (supabase/utils) | 5 archivos, 0% | Alto | 1-2 días |
| Coverage gaps (validation) | quotes 38%, work-orders 34% | Medio | 1 día |
| Tests complejos diferidos | 3 bloques skipeados | Bajo | 2-3 horas |
| ESLint return types | ~8,200 funciones sin tipo explícito | Bajo | Automatable |
| @deprecated markers | 20 marcadores en uso activo | Bajo | Decisión |
| Tests suite actual | 2,629 pasando, 67 skipped | Sólido | Mantener |

---

## Fase 6.1 — God Files: Inventario y Refactor

### Megafauna (>1000 líneas) — Prioridad Crítica

| # | Archivo | Líneas | Módulo | Acción |
|---|---------|--------|--------|--------|
| 1 | `src/types/supabase.ts` | **8,530** | Types | Dividir por dominio (customers, orders, products, ai, etc.) |
| 2 | `src/app/admin/system/_components/SystemAdminContent.tsx` | 1,396 | Admin | Lazy-loaded tabs por sección |
| 3 | `src/app/admin/work-orders/[id]/_components/WorkOrderDetailContent.tsx` | 1,257 | Work Orders | Subcomponentes por sección (info, lab, payments, timeline) |
| 4 | `src/app/admin/analytics/_components/AnalyticsContent.tsx` | 1,227 | Analytics | Server shell + client islands por chart |
| 5 | `src/app/admin/appointments/_components/AppointmentsContent.tsx` | 1,190 | Appointments | Server shell + client islands |
| 6 | `src/app/api/admin/cash-register/close/route.ts` | 1,041 | Cash Register | Servicios extraídos, route como orquestador |
| 7 | `src/app/admin/saas-management/users/_components/UsersManagementContent.tsx` | 1,039 | SaaS | Tabs por sección |
| 8 | `src/app/admin/support/_components/OpticalInternalSupportContent.tsx` | 1,035 | Support | Subcomponentes por tipo de ticket |
| 9 | `src/app/admin/lens-matrices/_components/LensMatricesContent.tsx` | 1,006 | Lens Matrices | Server + client split |

### Fauna Grande (700-1000 líneas) — Prioridad Alta

| # | Archivo | Líneas | Módulo |
|---|---------|--------|--------|
| 10 | `src/app/admin/field-operations/[id]/_components/FieldOpDetailContent.tsx` | 999 | Field Ops |
| 11 | `src/app/admin/products/bulk/_components/BulkOperationsContent.tsx` | 978 | Products |
| 12 | `src/app/admin/quotes/settings/_components/QuoteSettingsContent.tsx` | 916 | Quotes |
| 13 | `src/__tests__/security/phase2-security.test.ts` | 874 | Tests (diferido) |
| 14 | `src/lib/ai/agent/agent.ts` | 824 | AI Agent |
| 15 | `src/app/api/admin/system/config/route.ts` | 817 | System |
| 16 | `src/components/admin/QuoteItemsCard.tsx` | 808 | Components |
| 17 | `src/components/admin/CreatePrescriptionForm.tsx` | 806 | Components |
| 18 | `src/app/admin/prescriptions/_components/PrescriptionsContent.tsx` | 801 | Prescriptions |
| 19 | `src/lib/ai/tools/products.ts` | 799 | AI Tools |
| 20 | `src/app/api/admin/orders/route.ts` | 796 | Orders |
| 21 | `src/components/admin/SEOManager.tsx` | 789 | Components |
| 22 | `src/app/admin/pos/POSPageContent.tsx` | 785 | POS |
| 23 | `src/app/admin/saas-management/subscriptions/_components/SubscriptionsContent.tsx` | 783 | SaaS |
| 24 | `src/components/admin/EmailTemplatesManager.tsx` | 778 | Components |
| 25 | `src/app/api/admin/pos/process-sale/processLegacyHandler.ts` | 776 | POS |
| 26 | `src/app/admin/saas-management/support/tickets/[id]/_components/TicketDetailContent.tsx` | 776 | SaaS |
| 27 | `src/app/api/admin/analytics/dashboard/route.ts` | 771 | Analytics |
| 28 | `src/app/admin/pos/components/ContactLensSelector.tsx` | 770 | POS |
| 29 | `src/app/admin/products/edit/[id]/_components/EditProductContent.tsx` | 765 | Products |
| 30 | `src/app/admin/branches/_components/BranchesContent.tsx` | 758 | Branches |
| 31 | `src/app/api/admin/appointments/route.ts` | 753 | Appointments |
| 32 | `src/components/admin/EmailTemplateEditor.tsx` | 748 | Components |
| 33 | `src/app/admin/work-orders/_components/WorkOrdersContent.tsx` | 746 | Work Orders |
| 34 | `src/app/admin/support/templates/_components/TemplatesContent.tsx` | 743 | Support |
| 35 | `src/app/api/admin/products/[id]/route.ts` | 736 | Products |
| 36 | `src/app/admin/pos/components/POSAdvancedSale.char.test.tsx` | 725 | POS (tests) |
| 37 | `src/lib/security/incident-response.ts` | 723 | Security |
| 38 | `src/app/api/admin/quotes/[id]/route.ts` | 721 | Quotes |
| 39 | `src/__tests__/unit/lib/api/services/agreementService.test.ts` | 719 | Tests |
| 40 | `src/lib/payments/mercadopago/gateway.ts` | 717 | Payments |
| 41 | `src/app/api/admin/products/productsCreateService.ts` | 715 | Products |
| 42 | `src/app/api/admin/quotes/route.ts` | 713 | Quotes |
| 43 | `src/app/admin/pos/components/POSAdvancedSaleCustomerTab.tsx` | 713 | POS |
| 44 | `src/app/admin/saas-management/support/_components/SupportContent.tsx` | 711 | SaaS |
| 45 | `src/lib/ai/tools/appointments.ts` | 707 | AI Tools |
| 46 | `src/app/admin/admin-users/_components/AdminUsersContent.tsx` | 706 | Admin |
| 47 | `src/app/admin/contact-lens-matrices/_components/ContactLensMatricesContent.tsx` | 702 | Lenses |
| 48 | `src/app/admin/contact-lens-families/_components/ContactLensFamiliesContent.tsx` | 702 | Lenses |
| 49 | `src/app/api/admin/appointments/[id]/route.ts` | 700 | Appointments |

### Fauna Media (500-700 líneas) — 80 archivos

Ver apéndice al final del documento.

### Estrategia de Refactor

1. **Cada archivo debe quedar <300 líneas** (ideal: 150-250)
2. **Server shell + Client island** para páginas admin
3. **Extraer servicios** de route handlers (route solo orquesta)
4. **Componentes atómicos** para UI grande
5. **Types por dominio** para supabase.ts (8,530 → ~15 archivos)

---

## Fase 6.2 — Coverage Gaps

### SDD: `add-unit-tests-supabase-utils`

**Qué:** Agregar tests a `src/utils/supabase/` (5 archivos, 0% coverage).

**Archivos:**
- `client.ts` — crear cliente browser
- `server.ts` — crear cliente server-side con cookies
- `service-role.ts` — crear cliente service_role
- `cron.ts` — crear cliente para cron jobs (ya tiene patrón)
- `webhook.ts` — crear cliente para webhooks (ya tiene patrón)

**Duración:** 1-2 días
**Dificultad:** Baja (helpers puros, sin lógica compleja)

### SDD: `add-unit-tests-validation-quotes-work-orders`

**Qué:** Subir cobertura de quotes.ts (38% → 80%) y work-orders.ts (34% → 80%).

**Archivos:**
- `src/lib/validation/schemas/quotes.ts`
- `src/lib/validation/schemas/work-orders.ts`

**Duración:** 1 día
**Dificultad:** Baja (Zod schemas — tests de parseo)

---

## Fase 6.3 — Tests Complejos Diferidos

### SDD: `fix-complex-skipped-blocks`

**Qué:** Arreglar los 3 bloques de tests complejos que quedaron skipeados.

| Bloque | Archivo | Problema | Estrategia |
|--------|---------|----------|------------|
| 1 | `analytics_tools.test.ts:30` | Mocks incompletos | Reescribir mocks para API actual |
| 2 | `phase2-security.test.ts:43` | 874 líneas, severity mapping desactualizado | Refactor test: extraer helpers, actualizar assertions |
| 3 | `flow.test.ts:46` | Route imports cambiaron a subpaths | Actualizar mocks + route assertions |

**Duración:** 2-3 horas
**Dificultad:** Media

---

## Fase 6.4 — ESLint Return Types

### SDD: `fix-explicit-function-return-types`

**Qué:** Resolver los ~8,200 warnings de `explicit-function-return-type`.

**Estrategia (Opción A — Automatizada):**
1. Un script con `ts-morph` que recorra todos los archivos `src/`
2. Para cada función/método sin tipo de retorno explícito, leer el tipo inferido por TypeScript y añadirlo
3. Ejecutar `eslint --fix` post-procesamiento
4. Verificar que el build siga intacto

**Riesgo:** Muy bajo — TypeScript ya infiere los tipos, solo los escribimos explícitamente. No cambia comportamiento.

**Alternativa si el script no es práctico:** Cambiar la regla en ESLint de `warn` a `off`. TypeScript 5.x infiere tipos impecablemente, el valor real de esta regla es discutible.

**Duración:** Horas (automatizado) o 5 min (off)
**Dificultad:** Baja

---

## Fase 6.5 — @deprecated Markers

### SDD: `resolve-deprecated-markers-phase2`

**Qué:** Decidir el destino de los 20 marcadores `@deprecated` restantes.

**Archivos:**

| Grupo | Archivos | Propuesta |
|-------|----------|-----------|
| AI Agent (8) | `agent.ts`, `core.ts`, `knowledge-context.ts`, `memory-init.ts`, `session.ts`, `memory/indexer.ts`, `memory/session.ts`, `tools/memory.ts` | **Sacar el @deprecated.** Estos archivos son el core activo del AI Agent — no van a ser reemplazados a corto plazo. |
| Chat APIs (4) | `chat/history/route.ts`, `chat/messages/route.ts`, `chat/route.ts`, `chat/sessions/route.ts` | **Sacar el @deprecated.** APIs activas. |
| WhatsApp (2) | `session-manager.ts`, `webhook-handler.ts` | **Sacar el @deprecated.** Módulo activo. |
| AI Tools (2) | `usage-logger.ts`, `ai/insights/route.ts` | **Sacar el @deprecated.** Activos. |
| Onboarding (1) | `activate-real-org/route.ts` | **Evaluar.** Ruta de onboarding, puede necesitar refactor. |
| Backup (1) | `backup-service.ts` | **Sacar el @deprecated.** Servicio activo. |
| AI Insights (1) | `ai/insights/route.ts` | **Sacar el @deprecated.** API activa. |
| WhatsApp Conversations (2) | `conversations/route.ts`, `conversations/[sessionId]/messages/route.ts` | **Sacar el @deprecated.** API activa. |

**Duración:** 1 hora
**Dificultad:** Muy baja (solo sacar annotations)

---

## Progresión Estimada

| Fase | Items | Score Esperado |
|------|-------|---------------|
| Hoy | — | 9.0 |
| + 6.1 God Files (top 10) | +2 en Calidad Código | 9.2 |
| + 6.2 Coverage Gaps | +2 en Tests | 9.4 |
| + 6.3 Tests Complejos | +0.5 en Tests | 9.5 |
| + 6.4 ESLint | +1 en Calidad Código | 9.6 |
| + 6.5 @deprecated | +0.5 en Organización | 9.7 |
| + 6.1 God Files (resto) | +3 en Calidad Código | 10.0 |

---

## Apéndice A: God Files 500-700 líneas (80 archivos)

> Incluidos aquí para tracking, pero no bloqueantes para las fases principales.

| Archivo | Líneas |
|---------|--------|
| src/app/admin/help/page.tsx | 699 |
| src/app/api/admin/products/bulk/route.ts | 692 |
| src/components/admin/CreateQuoteForm/__tests__/CreateQuoteForm.char.test.ts | 690 |
| src/app/admin/cash-register/CashRegisterOrdersSection.tsx | 689 |
| src/__tests__/unit/lib/api/services/products/service.test.ts | 683 |
| src/app/admin/quotes/_components/QuotesContent.tsx | 680 |
| src/components/admin/internal-orders/InternalOrderTrackingManager.tsx | 673 |
| src/__tests__/unit/lib/validation/schemas/lenses.test.ts | 667 |
| src/app/admin/appointments/settings/page.tsx | 661 |
| src/app/admin/saas-management/subscriptions/[id]/_components/SubscriptionDetailsContent.tsx | 659 |
| src/app/admin/support/tickets/new/page.tsx | 649 |
| src/app/api/admin/customers/[id]/route.ts | 646 |
| src/lib/security/behavioral-analytics.ts | 639 |
| src/app/admin/system/components/FormOptionsConfig.tsx | 639 |
| src/components/admin/CreateManualOrderForm.tsx | 633 |
| src/app/api/admin/products/import/route.ts | 633 |
| src/components/admin/NotificationSettings.tsx | 630 |
| src/components/admin/WebhookMonitor.tsx | 627 |
| src/app/api/admin/system/maintenance/route.ts | 625 |
| src/components/admin/lenses/LensMatricesList.tsx | 620 |
| src/app/admin/notifications/_components/NotificationsContent.tsx | 617 |
| src/lib/security/alerting.ts | 608 |
| src/__tests__/unit/lib/payments/services/payment-service.test.ts | 599 |
| src/app/admin/pos/components/usePOSAdvancedSale.ts | 593 |
| src/__tests__/unit/lib/errors/comprehensive-handler.test.ts | 592 |
| src/components/admin/lenses/LensMatrixManager.tsx | 586 |
| src/app/admin/saas-management/users/[id]/page.tsx | 584 |
| src/app/admin/products/add/_components/AddProductContent.tsx | 583 |
| src/app/admin/customers/_components/CustomersContent.tsx | 581 |
| src/components/admin/lenses/ContactLensMatricesList.tsx | 580 |
| src/components/admin/lenses/ContactLensFamilyWizard.tsx | 578 |
| src/lib/notifications/notification-service.ts | 577 |
| src/hooks/useWorkOrder.ts | 576 |
| src/__tests__/integration/helpers/test-setup.ts | 575 |
| src/app/admin/agreements/[id]/_components/AgreementDetailContent.tsx | 572 |
| src/lib/api/services/products/service.ts | 571 |
| src/components/ui/brand/ProductCard.tsx | 571 |
| src/app/api/admin/dashboard/route.ts | 569 |
| src/lib/ai/tools/customers.ts | 566 |
| src/components/admin/PrescriptionManagementCard.tsx | 565 |
| src/lib/security/threat-detection.ts | 564 |
| src/app/admin/saas-management/organizations/[id]/_components/OrganizationDetailsContent.tsx | 563 |
| src/lib/ai/tools/categories.ts | 554 |
| src/lib/ai/tools/diagnoseSystem.ts | 551 |
| src/app/admin/cash-register/cashRegister.char.test.ts | 546 |
| src/lib/cash-register/__tests__/payment-aggregator.test.ts | 539 |
| src/app/api/admin/admin-users/[id]/route.ts | 539 |
| src/lib/email/templates/appointments.ts | 538 |
| src/components/admin/saas-management/SaasManagementSidebar.tsx | 538 |
| src/app/admin/system/components/SystemConfig.tsx | 535 |
| src/app/admin/customers/[id]/_components/CustomerDetailContent.tsx | 534 |
| src/__tests__/unit/lib/middleware/error-handler.test.ts | 534 |
| src/lib/email/__tests__/email-variables-integration.test.ts | 533 |
| src/components/admin/lenses/ContactLensMatrixManager.tsx | 533 |
| src/app/admin/products/options/_components/ProductOptionsContent.tsx | 528 |
| src/components/admin/CreateQuoteForm/CreateQuoteFormLensSection.tsx | 527 |
| src/app/api/admin/admin-users/route.ts | 527 |
| src/app/admin/saas-management/dashboard/_components/SaaSRecentActivity.tsx | 527 |
| src/lib/api/services/productService.ts | 524 |
| src/components/admin/AdminNotificationDropdown.tsx | 523 |
| src/app/admin/cash-register/CashRegisterPaymentSection.tsx | 519 |
| src/lib/errors/comprehensive-handler.ts | 518 |
| src/app/signup/page.tsx | 518 |
| src/components/ui/brand/FormComponents.tsx | 516 |
| src/lib/payments/services/payment-service.ts | 511 |
| src/app/admin/pos/components/POSAdvancedSaleFrameTab.tsx | 511 |
| src/__tests__/unit/lib/inventory/stock-helpers.test.ts | 511 |
| src/lib/ai/memory/organizational.ts | 510 |
| src/app/support/ticket/[ticketNumber]/page.tsx | 509 |
| src/app/api/admin/chat/route.ts | 509 |
| src/lib/validation/formValidation.ts | 507 |
| src/lib/telemetry/collector/browser-collector.ts | 507 |
| src/app/api/admin/support/tickets/route.ts | 504 |
| src/__tests__/security/phase1-security.test.ts | 502 |
| src/lib/api/services/customerService.ts | 501 |
| src/lib/ai/tools/support.ts | 501 |
