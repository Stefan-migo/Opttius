# Índice de Skills Opttius — Guías de Dominio del Proyecto

Este documento consolida las 26 skills del directorio `.cursor/skills` para que NotebookLM tenga acceso al conocimiento experto del proyecto Opttius (ópticas, Supabase, Next.js).

**Fecha de generación:** 2026-02-23  
**Fuente:** `.cursor/skills/**/SKILL.md`

---

## Resumen por Categoría

| Categoría        | Skills                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **Óptica Core**  | admin-users, appointments, crm, field-operations, inventory, libro-recetas-digital, pos, quotes, work-orders                 |
| **Pagos y SaaS** | payment-workflow, saas-management                                                                                            |
| **Sistema**      | system-configuration, supabase-auth, user-profile, database-optical-supabase                                                 |
| **Frontend**     | frontend-design-modern, responsive-frontend-optical, opttius-identity, marketing-identity-optical, seo-aio-optical-discovery |
| **Comunicación** | emails, notifications, support, whatsapp-ai-agent                                                                            |
| **Analítica**    | analytics, dashboard, ai                                                                                                     |
| **Herramientas** | nlm-skill, testing                                                                                                           |

---

## 0. database-optical-supabase

**Cuándo usar:** schema, migraciones, RLS, índices, funciones, multi-tenant, patrones ópticos.

**Principios:** organization_id + branch_id para scope; profiles ≠ customers; product_branch_stock para inventario.

**RLS:** is_super_admin, can_access_branch, get_user_organization_id. Políticas por SELECT/INSERT/UPDATE/DELETE.

**Índices:** B-tree en FKs y filtros; GIST para rangos (matrices de precios); parciales para NULL/boolean.

**Docs:** docs/database/SUPABASE_DATABASE_DOCUMENTATION.md

---

## 1. admin-users-optical-supabase

**Cuándo usar:** administradores, empleados, admin_users, admin_branch_access, roles, branch assignment, permisos.

**Roles:** root/dev (SaaS) | super_admin (org) | admin (sucursales) | employee | vendedor. Super Admin = `admin_branch_access.branch_id = null`.

**Modelo:** admin_users (id, email, role, organization_id), admin_branch_access (admin_user_id, branch_id, role: manager|staff|viewer).

**APIs:** `/api/admin/admin-users`, `/api/admin/admin-users/register`, branch-access.

---

## 2. ai-optical-supabase

**Cuándo usar:** chat IA, SmartContextWidget, insights, LLM providers, tools, knowledge base.

**Arquitectura:** POST /api/admin/chat → Agent.streamChat(); GET /api/ai/insights → SmartContextWidget. Proveedores: OpenAI, Anthropic, DeepSeek (fallback).

**Secciones insights:** dashboard, inventory, clients, pos, analytics. Madurez: new, starting, growing, established.

**Tools:** getProducts, getCustomers, getOrders, getSalesSummary, analyzeBusinessFlow.

---

## 3. analytics-optical-supabase

**Cuándo usar:** métricas, KPIs, dashboard analíticas, tendencias, revenue, work orders, quotes conversion.

**Regla crítica:** NUNCA usar `products.inventory_quantity`. Usar `product_branch_stock`.

**Fuentes:** cash_register_closures (ingresos preferido), orders, lab_work_orders, quotes, appointments, product_branch_stock.

**Endpoint:** GET /api/admin/analytics/dashboard?period=7|30|90|365. Feature: advanced_analytics (tier Pro).

---

## 4. appointments-optical-supabase

**Cuándo usar:** citas, agendas, calendar, schedule_settings, guest customers, slots.

**Modelo:** appointments (customer*id O guest*\* obligatorios). Tipos: eye_exam, consultation, fitting, delivery, repair, follow_up, emergency.

**RPCs:** get_available_time_slots, check_appointment_availability. schedule_settings con fallback branch → global.

**Guest:** customer_id NULL + guest_first_name, guest_last_name, guest_rut. Auto-registro al completar.

---

## 5. crm-optical-supabase

**Cuándo usar:** clientes, customers, prescriptions, búsqueda RUT, formularios.

**Regla:** customers NO autenticados. branch_id + organization_id obligatorios. Crear solo desde admin.

**Búsqueda:** normalizeRUT(), formatRUT(), RPC search_customers_by_rut. Límite tier antes de crear.

**Relaciones:** prescriptions, appointments, quotes → customer_id.

---

## 6. dashboard-optical-supabase

**Cuándo usar:** /admin, KPIs ejecutivos, citas del día, alertas inventario, quick actions.

**Dos niveles:** Dashboard principal (/admin) vs Analytics (/admin/analytics, tier Pro).

**Fuentes:** cash_register_closures, product_branch_stock (NUNCA products.inventory_quantity), appointments, lab_work_orders, quotes.

**Headers:** x-branch-id (sucursal) o "global" (super admin).

---

## 7. emails-optical-supabase

**Cuándo usar:** plantillas, EmailNotificationService, Resend, system_email_templates, confirmaciones.

**Capas:** client.ts (Resend), template-loader.ts (DB por type + org), template-utils (variables), wrapInModernLayout.

**Tipos óptica:** order_confirmation, appointment_confirmation, quote_sent, work_order_ready, low_stock_alert.

**Tipos SaaS:** saas_welcome, saas_trial_ending, saas_payment_failed.

---

## 8. whatsapp-ai-agent-optical

**Cuándo usar:** WhatsApp Business API, mensajería por WhatsApp, agente IA por WhatsApp, webhooks, recordatorios.

**Principio:** Reutilizar el Agent existente (core.ts). NO crear agente paralelo. Mismo ToolExecutor, mismas tools.

**Flujo:** Webhook POST → context resolver (wa_id → customer/admin) → Session Manager → Agent.chat() → WhatsApp Client send.

**Roles:** Admin = todas las tools. Cliente = getAppointmentStatus, getQuoteStatus, getOrderStatus.

**Doc:** docs/WHATSAPP_AI_AGENT.md.

---

## 9. whatsapp-agent-training-optical

**Cuándo usar:** entrenamiento de agente WhatsApp, prompts WhatsApp, adaptación por canal, mejora continua.

**Principio:** Mismo Agent, configuración por canal. Prompt engineering primero; fine-tuning solo si hace falta.

**Fuentes:** system prompts (config.ts), memoria organizacional, knowledge base, EXPERT_KNOWLEDGE, chat history.

**WhatsApp:** brevedad (1–3 oraciones), tono cercano, identidad transparente, siguiente paso claro.

**Doc:** docs/WHATSAPP_AGENT_TRAINING.md.

---

## 10. frontend-design-modern

**Cuándo usar:** UI, landing, admin, auth, diseño responsive.

**Pivote 2026-02:** Minimalismo SaaS (Stripe, Apple, Vercel). Paleta Epoch intacta: #1A2B23, #C5A059, #F9F7F2.

**Tipografía:** Geist, Inter, DM Sans. Eliminadas: Cinzel, Playfair, Lato. Bordes: rounded-xl, rounded-2xl (no rounded-arch).

**Copy:** "Automatiza. Controla. Crece." Evitar: legado, forjar, santuario, maestría, credencial.

---

## 11. inventory-optical-supabase

**Cuándo usar:** productos, product_branch_stock, stock, low_stock, POS stock reduction.

**Regla crítica:** Inventario NUNCA en products. products.inventory_quantity DEPRECADO. Usar product_branch_stock.

**RPC:** update_product_stock(p_product_id, p_branch_id, p_quantity_change, p_reserve). get_product_stock.

**Tipos:** frame (sí stock), lens (no*), accessory (sí), service (no). Excluir frame-manual-*, lens-_, treatments-_, labor-\*.

---

## 12. nlm-skill

**Cuándo usar:** notebooklm-cli, nlm, MCP NotebookLM, research, podcasts, reports.

**Comandos:** nlm login, nlm source add, nlm notebook query (NO nlm chat start). --confirm obligatorio en delete/generate.

**Windows:** export PYTHONIOENCODING=utf-8 para evitar error con ✓.

---

## 13. notifications-optical-supabase

**Cuándo usar:** admin_notifications, notification_settings, alertas, EmailNotificationService.

**Tipos:** quote_new, work_order_completed, low_stock, appointment_new, support_ticket_new, system_alert.

**Scoping:** organization_id, branch_id, target_admin_role (root para SaaS).

---

## 14. opttius-identity

**Cuándo usar:** identidad, copy, landing, auth, narrativa, arquetipo.

**Arquetipo:** Software médico de alta gama / Minimalismo SaaS. "De la clínica al código."

**Paleta:** epoch-primary #1A2B23, epoch-accent #C5A059, epoch-surface #1A1A1A, epoch-background #F9F7F2.

---

## 14b. marketing-identity-optical

**Cuándo usar:** estrategia de marketing, narrativa, copy, landing, conversión, posicionamiento óptico.

**Propósito:** Guiar construcción de estrategia de marketing e identidad con código limpio y mejores prácticas.

**Fórmula:** Hero (problema + propuesta + origen + CTA), Problem/Solution, Features, Benefits, CTA. Pilares: tecnólogo médico, exclusivo para ópticas.

**Doc:** docs/marketing/MARKETING_IDENTITY_STRATEGY.md.

---

## 14c. seo-aio-optical-discovery

**Cuándo usar:** metadata, sitemap, robots, JSON-LD, Schema.org, Open Graph, discoverability, SEO, AIO, citación por LLMs.

**Propósito:** Estrategia de descubrimiento orgánico (SEO + AIO) para que ópticas encuentren Opttius y LLMs lo citen como autoridad.

**Principios:** Topic clusters (no keywords aisladas), respuesta directa en 30 palabras (AIO), autoridad temática, vocabulario técnico óptico.

**Docs:** docs/marketing/SEO_AIO_DISCOVERY_STRATEGY.md, SEO_AIO_TECHNICAL_REFERENCE.md, SEO_AIO_CURRENT_STATE_AND_IMPROVEMENTS.md.

---

## 15. payment-workflow-optical-supabase

**Cuándo usar:** checkout, process-sale, order_payments, Mercado Pago, webhooks.

**Dos capas:** payments (SaaS, gateways) vs order_payments (POS, efectivo/tarjeta/transfer).

**Reglas:** Caja abierta obligatoria. Branch obligatorio. Cash-First: paymentAmount < minDeposit → work_order on_hold_payment.

---

## 16. pos-optical-supabase

**Cuándo usar:** POS, process-sale, caja, presupuestos al POS, lab_work_orders desde venta.

**Flujo:** Carrito → process-sale → orders + order_items + order_payments + lab_work_orders + product_branch_stock.

**Cash-First:** paymentAmount < minDeposit → on_hold_payment. Presbicia: two_separate → far_lens + near_lens.

---

## 17. quotes-optical-supabase

**Cuándo usar:** presupuestos, CreateQuoteForm, quote-to-work-order, load-to-pos, matrices lentes.

**Estados:** draft → sent → accepted → converted_to_work. Rejected, expired.

**Presbicia:** none, two_separate, bifocal, trifocal, progressive. customer_own_frame → frame_price = 0.

---

## 18. saas-management-optical-supabase

**Cuándo usar:** /admin/saas-management, organizations, subscriptions, root/dev, soporte B2B.

**Acceso:** SOLO root o dev. requireRoot(request) en todas las APIs.

**Rutas:** organizations, users, subscriptions, support, emails, backups, analytics.

---

## 19. system-configuration-optical-supabase

**Cuándo usar:** Sistema, system_config, configuración global vs branch.

**Jerarquía:** Global (org=null) > Org (branch=null) > Branch. Merge: Branch > Org > Global.

**API:** GET/PUT /api/admin/system/config. useSystemConfig({ branchId }).

---

## 20. support-optical-supabase

**Cuándo usar:** tickets, soporte B2B, soporte B2C óptica, optical_internal_support_tickets.

**Dos capas:** saas_support_tickets (óptica → Opttius) vs optical_internal_support_tickets (óptica → cliente).

**Categorías:** lens_issue, frame_issue, delivery_issue, payment_issue, customer_complaint.

---

## 21. user-profile-optical-supabase

**Cuándo usar:** /profile, /admin/profile, datos personales, avatar, cambio contraseña.

**Rutas:** /profile (UserHeader) y /admin/profile (AdminLayout). Mismo ProfilePageContent.

**Modelo:** profiles (first_name, last_name, avatar_url, address, timezone).

---

## 22. work-orders-optical-supabase

**Cuándo usar:** lab_work_orders, ciclo de vida, quote-to-work-order, POS-to-work-order.

**Estados:** quote → ordered → sent_to_lab → received_from_lab → mounted → quality_check → ready_for_pickup → delivered. on_hold_payment (no visible en taller).

**Orígenes:** process-sale (POS), quotes convert, API directa.

---

## 22a. libro-recetas-digital-optical

**Cuándo usar:** libro de recetas, registro recetas despachadas, Código Sanitario Chile, fiscalización Seremi, recetas centralizadas, exportación auditoría, vinculación receta-OT.

**Modelo:** Reutiliza tabla prescriptions. Vista centralizada = fetch con join customers. CRUD existente en customers/[id]/prescriptions.

**Requisitos:** Filtros RUT, fecha, profesional. Export CSV/XLS. Vinculación con lab_work_orders. Presbicia (od_add, os_add).

**Doc:** docs/LIBRO_RECETAS_DIGITAL.md.

---

## 22b. field-operations-optical-supabase

**Cuándo usar:** operativos en terreno, bodega móvil, sync offline, registro masivo, OT express, entrega en empresa.

**Flujo:** Preparación (transfer stock) → En terreno (offline-first) → Consolidación (lote único) → Entrega (empresa cliente).

**Tablas:** field_operations, operativo_mobile_stock, operativo_sync_queue. Extender lab_work_orders con field_operation_id, operativo_batch_id.

**Doc:** docs/FIELD_OPERATIONS_SYSTEM.md.

---

## 23. supabase-auth

**Cuándo usar:** login, signup, sesión, profiles, RLS, middleware.

**Clientes:** createBrowserClient (cliente), createServerClient (middleware, API), createServiceRoleClient (admin, nunca cliente).

**RPCs:** is_admin, get_admin_role. Trigger handle_new_user para profiles.

---

## 24. responsive-frontend-optical

**Cuándo usar:** layouts, breakpoints, POS responsive, admin sidebar, touch targets.

**Breakpoints:** sm:640, md:768, lg:1024, xl:1280, 2xl:1400. Mobile-first.

**Admin:** Sidebar hidden lg:flex. Sheet móvil w-80. BranchSelector compacto en móvil.

---

## 25. testing-optical-supabase

**Cuándo usar:** testing, QA, checklists, E2E, backup validation.

**Cobertura:** flujos críticos multi-tenant, módulos ópticos, integración con skills.

---

## Reglas Transversales

1. **Multi-tenant:** organization_id y branch_id en todas las queries (excepto root/dev).
2. **Headers:** x-branch-id para sucursal; "global" para super admin.
3. **Inventario:** Siempre product_branch_stock, nunca products.inventory_quantity.
4. **Cash-First:** work_order on_hold_payment si pago insuficiente.
5. **Validación:** Zod en APIs. createApiSuccessResponse, createApiErrorResponse.
6. **RLS:** Políticas por organization_id, admin_branch_access.
