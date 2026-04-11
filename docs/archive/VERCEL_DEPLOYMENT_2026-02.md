# Vercel Deployment - Opttius (Feb 2026)

## Resumen

Documentación del despliegue en Vercel, limitaciones del plan Hobby y necesidad de avanzar a Pro para crons horarios.

---

## Plan Hobby: Limitación de Crons

**El plan Hobby de Vercel solo permite crons diarios** (máximo una ejecución por día).

- Crons que ejecutan **más de una vez al día** (p. ej. cada hora) **bloquean el deploy**.
- Error típico: _"Hobby accounts are limited to daily cron jobs. This cron expression would run more than once per day."_

### Cambio aplicado (2026-02)

| Cron                       | Expresión original      | Expresión actual (Hobby)      | Propósito                      |
| -------------------------- | ----------------------- | ----------------------------- | ------------------------------ |
| `appointment-reminders-2h` | `0 * * * *` (cada hora) | `0 6 * * *` (diario 6:00 UTC) | Recordatorios 2h antes de cita |

**Consecuencia:** Los recordatorios "2 horas antes" solo se ejecutan una vez al día (6:00 UTC). Solo reciben recordatorio las citas ~2h después de esa hora. El resto de crons (24h, follow-up, etc.) funcionan con normalidad.

---

## Necesidad de Plan Pro

**Recomendación: avanzar a Vercel Pro** cuando se requiera:

1. **Recordatorios 2h funcionando correctamente** – El cron `appointment-reminders-2h` debe ejecutarse cada hora (`0 * * * *`) para enviar recordatorios a quienes tienen cita en ~2 horas.
2. **Más crons frecuentes** – Cualquier job que necesite ejecutarse más de una vez al día.
3. **Mayor capacidad de build** – Pro ofrece más minutos de build y mejor rendimiento.

### Restaurar cron horario al pasar a Pro

En `vercel.json`, cambiar:

```json
{ "path": "/api/cron/appointment-reminders-2h", "schedule": "0 6 * * *" }
```

por:

```json
{ "path": "/api/cron/appointment-reminders-2h", "schedule": "0 * * * *" }
```

---

## Crons actuales (vercel.json)

| Path                                        | Schedule     | Frecuencia                                  |
| ------------------------------------------- | ------------ | ------------------------------------------- |
| `/api/cron/backups`                         | `0 3 * * 0`  | Semanal (domingo 3:00 UTC)                  |
| `/api/cron/cleanup-notifications`           | `0 4 * * *`  | Diario                                      |
| `/api/cron/cleanup-pending-payments`        | `0 2 * * *`  | Diario                                      |
| `/api/cron/generate-insights`               | `0 8 * * *`  | Diario                                      |
| `/api/cron/low-stock-alerts`                | `0 7 * * *`  | Diario                                      |
| `/api/cron/appointment-reminders`           | `0 6 * * *`  | Diario (24h antes)                          |
| `/api/cron/appointment-reminders-2h`        | `0 6 * * *`  | Diario _(debería ser `0 _ \* \* _` en Pro)_ |
| `/api/cron/appointment-follow-up-reminders` | `30 6 * * *` | Diario                                      |
| `/api/cron/prescription-expiring`           | `0 6 * * *`  | Diario                                      |
| `/api/cron/quote-expiring`                  | `0 6 * * *`  | Diario                                      |
| `/api/cron/saas-trial-ending`               | `30 6 * * *` | Diario                                      |
| `/api/cron/saas-payment-reminder`           | `0 7 * * *`  | Diario                                      |

---

## Checklist de deploy

- [ ] `npm run build` pasa sin errores
- [ ] Push a `main` en GitHub
- [ ] Vercel detecta el push y ejecuta el deploy
- [ ] Si falla por cron: verificar que todas las expresiones sean diarias o menos frecuentes (plan Hobby)
- [ ] Para crons horarios: plan Pro activo
