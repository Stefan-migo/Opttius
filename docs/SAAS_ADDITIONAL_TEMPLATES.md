# Análisis Adicional de Comunicación SaaS - Opttius

## 1. Situaciones Adicionales Identificadas

Además de las 10 plantillas inicialmente diseñadas, se identificaron las siguientes situaciones donde el SaaS debe comunicarse con los administradores de ópticas:

---

## 2. Nuevas Plantillas SaaS Identificadas

### 2.1 Gestión de Suscripciones (Adicionales)

| #   | Tipo de Email                  | Trigger                         | Prioridad |
| --- | ------------------------------ | ------------------------------- | --------- |
| 11  | `saas_subscription_cancelled`  | Suscripción cancelada por admin | Alta      |
| 12  | `saas_subscription_renewed`    | Suscripción renovada            | Media     |
| 13  | `saas_subscription_downgraded` | Plan degradado                  | Alta      |
| 14  | `saas_subscription_upgraded`   | Plan mejorado                   | Media     |
| 15  | `saas_invoice_generated`       | Factura generada                | Media     |
| 16  | `saas_payment_overdue`         | Pago vencido                    | Alta      |

### 2.2 Gestión de Usuarios y Permisos

| #   | Tipo de Email            | Trigger                         | Prioridad |
| --- | ------------------------ | ------------------------------- | --------- |
| 17  | `saas_user_invited`      | Usuario invitado a organización | Alta      |
| 18  | `saas_user_removed`      | Usuario eliminado               | Media     |
| 19  | `saas_user_role_changed` | Rol cambiado                    | Media     |
| 20  | `saas_password_changed`  | Contraseña cambiada             | Alta      |
| 21  | `saas_mfa_enabled`       | MFA activado                    | Media     |
| 22  | `saas_mfa_disabled`      | MFA desactivado                 | Media     |

### 2.3 Seguridad y Auditoría

| #   | Tipo de Email                   | Trigger                        | Prioridad |
| --- | ------------------------------- | ------------------------------ | --------- |
| 23  | `saas_suspicious_login`         | Login sospechoso               | Alta      |
| 24  | `saas_password_reset_requested` | Reset de contraseña solicitado | Alta      |
| 25  | `saas_email_changed`            | Email cambiado                 | Alta      |
| 26  | `saas_api_key_created`          | API key creada                 | Media     |
| 27  | `saas_api_key_revoked`          | API key revocada               | Media     |

### 2.4 Alertas del Sistema

| #   | Tipo de Email          | Trigger                 | Prioridad |
| --- | ---------------------- | ----------------------- | --------- |
| 28  | `saas_quota_exceeded`  | Cuota excedida          | Alta      |
| 29  | `saas_storage_warning` | Almacenamiento bajo     | Media     |
| 30  | `saas_billing_anomaly` | Anomalía en facturación | Alta      |

### 2.5 Eventos y Capacitación

| #   | Tipo de Email             | Trigger                    | Prioridad |
| --- | ------------------------- | -------------------------- | --------- |
| 31  | `saas_webinar_invitation` | Invitación a webinar       | Baja      |
| 32  | `saas_new_tutorial`       | Nuevo tutorial disponible  | Baja      |
| 33  | `saas_community_update`   | Actualización de comunidad | Baja      |

---

## 3. Matriz Completa de Plantillas SaaS

### 3.1 Plantillas Originales (5)

| #   | Tipo                        | Estado      |
| --- | --------------------------- | ----------- |
| 1   | `saas_welcome`              | ✅ Diseñada |
| 2   | `saas_trial_ending`         | ✅ Diseñada |
| 3   | `saas_subscription_success` | ✅ Diseñada |
| 4   | `saas_subscription_failed`  | ✅ Diseñada |
| 5   | `saas_payment_reminder`     | ✅ Diseñada |
| 6   | `saas_onboarding_step_1`    | ✅ Diseñada |
| 7   | `saas_terms_update`         | ✅ Diseñada |
| 8   | `saas_maintenance`          | ✅ Diseñada |
| 9   | `saas_usage_alert`          | ✅ Diseñada |
| 10  | `saas_feature_announcement` | ✅ Diseñada |

### 3.2 Nuevas Plantillas Identificadas (23)

| #   | Tipo                            | Categoría   | Prioridad |
| --- | ------------------------------- | ----------- | --------- |
| 11  | `saas_subscription_cancelled`   | Suscripción | Alta      |
| 12  | `saas_subscription_renewed`     | Suscripción | Media     |
| 13  | `saas_subscription_downgraded`  | Suscripción | Alta      |
| 14  | `saas_subscription_upgraded`    | Suscripción | Media     |
| 15  | `saas_invoice_generated`        | Facturación | Media     |
| 16  | `saas_payment_overdue`          | Facturación | Alta      |
| 17  | `saas_user_invited`             | Usuarios    | Alta      |
| 18  | `saas_user_removed`             | Usuarios    | Media     |
| 19  | `saas_user_role_changed`        | Usuarios    | Media     |
| 20  | `saas_password_changed`         | Seguridad   | Alta      |
| 21  | `saas_mfa_enabled`              | Seguridad   | Media     |
| 22  | `saas_mfa_disabled`             | Seguridad   | Media     |
| 23  | `saas_suspicious_login`         | Seguridad   | Alta      |
| 24  | `saas_password_reset_requested` | Seguridad   | Alta      |
| 25  | `saas_email_changed`            | Seguridad   | Alta      |
| 26  | `saas_api_key_created`          | API         | Media     |
| 27  | `saas_api_key_revoked`          | API         | Media     |
| 28  | `saas_quota_exceeded`           | Sistema     | Alta      |
| 29  | `saas_storage_warning`          | Sistema     | Media     |
| 30  | `saas_billing_anomaly`          | Sistema     | Alta      |
| 31  | `saas_webinar_invitation`       | Marketing   | Baja      |
| 32  | `saas_new_tutorial`             | Educación   | Baja      |
| 33  | `saas_community_update`         | Comunidad   | Baja      |

---

## 4. Plantillas Recomendadas para Implementación Inmediata

### Prioridad Alta (12 templates)

1. ✅ `saas_welcome` - Ya diseñada
2. ✅ `saas_trial_ending` - Ya diseñada
3. ✅ `saas_subscription_failed` - Ya diseñada
4. ✅ `saas_payment_reminder` - Ya diseñada
5. ✅ `saas_terms_update` - Ya diseñada
6. ✅ `saas_maintenance` - Ya diseñada
7. ✅ `saas_usage_alert` - Ya diseñada
8. ⏳ `saas_subscription_cancelled` - Nueva
9. ⏳ `saas_payment_overdue` - Nueva
10. ⏳ `saas_user_invited` - Nueva
11. ⏳ `saas_suspicious_login` - Nueva
12. ⏳ `saas_quota_exceeded` - Nueva

### Prioridad Media (15 templates)

13. ✅ `saas_subscription_success` - Ya diseñada
14. ✅ `saas_onboarding_step_1` - Ya diseñada
15. ✅ `saas_feature_announcement` - Ya diseñada
16. ⏳ `saas_subscription_renewed` - Nueva
17. ⏳ `saas_subscription_downgraded` - Nueva
18. ⏳ `saas_invoice_generated` - Nueva
19. ⏳ `saas_user_removed` - Nueva
20. ⏳ `saas_user_role_changed` - Nueva
21. ⏳ `saas_password_changed` - Nueva
22. ⏳ `saas_mfa_enabled` - Nueva
23. ⏳ `saas_api_key_created` - Nueva
24. ⏳ `saas_storage_warning` - Nueva
25. ⏳ `saas_billing_anomaly` - Nueva
26. ⏳ `saas_webinar_invitation` - Nueva
27. ⏳ `saas_new_tutorial` - Nueva

### Prioridad Baja (6 templates)

28. ⏳ `saas_subscription_upgraded` - Nueva
29. ⏳ `saas_password_reset_requested` - Nueva
30. ⏳ `saas_email_changed` - Nueva
31. ⏳ `saas_mfa_disabled` - Nueva
32. ⏳ `saas_api_key_revoked` - Nueva
33. ⏳ `saas_community_update` - Nueva

---

## 5. Resumen Final

| Categoría       | Total  | Prioridad Alta | Prioridad Media | Prioridad Baja |
| --------------- | ------ | -------------- | --------------- | -------------- |
| **Originales**  | 10     | 8              | 2               | 0              |
| **Suscripción** | 6      | 3              | 2               | 1              |
| **Usuarios**    | 4      | 1              | 3               | 0              |
| **Seguridad**   | 7      | 4              | 2               | 1              |
| **Sistema**     | 3      | 2              | 1               | 0              |
| **Marketing**   | 3      | 0              | 2               | 1              |
| **TOTAL**       | **33** | **18**         | **12**          | **3**          |

---

## 6. Recomendación de Implementación

### Fase 1 (Inmediata - Alta Prioridad)

Implementar las 10 plantillas originales + 2 nuevas críticas:

- `saas_subscription_cancelled`
- `saas_payment_overdue`

### Fase 2 (Corto Plazo - Media Prioridad)

Implementar las 12 plantillas de prioridad media.

### Fase 3 (Mediano Plazo - Baja Prioridad)

Implementar las 6 plantillas de prioridad baja.

---

**Documento creado**: 2025-02-06
**Versión**: 1.0
**Autor**: Análisis Adicional Opttius SaaS
