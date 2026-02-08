# Documentación de Diseño: Sistema de Backup SaaS Opttius

## 📋 Introducción

El sistema de backup SaaS está diseñado para proporcionar una recuperación total ante desastres y una capa de seguridad redundante para el ecosistema Opttius. A diferencia del backup por organización (que es parcial y relacional), el backup SaaS es un **vaciado completo (Dump)** de la base de datos PostgreSQL.

## 🛠️ Especificaciones Técnicas

- **Alcance**: 100% de la base de datos (schemas `public`, `auth`, `storage`, `extensions`).
- **Formato**: SQL Nativo (`.sql`).
- **Motor**: `pg_dump` ejecutado dentro del contenedor de base de datos.
- **Almacenamiento**: Bucket privado `saas-backups` en Supabase Storage.

## 🛡️ Análisis de Seguridad y Necesidades

Después de analizar el sistema, se han identificado las siguientes necesidades críticas de seguridad:

| Necesidad                      | Solución Propuesta                                                                                                                         | Estado |
| :----------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :----- |
| **Aislamiento Total**          | Los backups SaaS contienen datos de todas las ópticas. Solo usuarios con roles `root` o `super_admin` pueden ver o disparar estos backups. | ✅     |
| **Cifrado en Reposo**          | Uso de cifrado AES-256 (nativo de Supabase/S3) para los archivos almacenados.                                                              | ✅     |
| **Integridad de Datos**        | Verificación de integridad post-backup mediante validación de tamaño y estructura básica del SQL.                                          | ✅     |
| **Audit Logs**                 | Registro obligatorio en `admin_activity_log` de quién inició el backup y el resultado.                                                     | ✅     |
| **Protección contra Timeouts** | Ejecución asíncrona para bases de datos que crezcan significativamente en el futuro.                                                       | ✅     |

## 📅 Plan de Implementación (Estatus: 100% Completado)

### Fase 1: Motor de Backup (Core) - ✅

- Implementado en `src/lib/saas-backup-service.ts`.
- Usa `pg_dump` vía Docker para fidelidad total (100% tablas y relaciones).

### Fase 2: Capa API - ✅

- Implementado en `src/app/api/admin/saas-management/backups/route.ts`.
- Protección estricta via `get_admin_role` integrada.

### Fase 3: Integración de Interfaz (UI) - ✅

- Integrado en el Dashboard de Gestión SaaS.
- Nueva tarjeta interactiva con feedback en tiempo real mediante Toasts.

### Fase 4: Automatización Progresiva - ✅

- El sistema de backup está listo para ser programado mediante Vercel Cron.

## 🗄️ Esquema de Almacenamiento

```text
storage/saas-backups/
  ├── full_backup_2026-02-06_02-00.sql
  ├── full_backup_2026-02-13_02-00.sql
  └── ...
```
