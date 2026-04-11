# Demo Óptica Mirada Clara

Base de datos demo para una óptica chilena multi-sucursal con **6 meses de operación progresiva**. Permite probar flujos completos, selector de sucursal y analíticas por branch.

---

## Nombre de la óptica

**Óptica Mirada Clara**

---

## Identificadores

| Entidad                  | UUID                                   |
| ------------------------ | -------------------------------------- |
| Organización             | `00000000-0000-0000-0000-000000000001` |
| Sucursal 1 (Casa Matriz) | `00000000-0000-0000-0000-000000000002` |
| Sucursal 2 (Providencia) | `00000000-0000-0000-0000-000000000003` |

Configurar en `.env`:

```
NEXT_PUBLIC_DEMO_ORG_ID=00000000-0000-0000-0000-000000000001
```

---

## Credenciales demo

**No se crean usuarios automáticamente.** Para que la demo funcione completamente (cierres de caja, sesiones POS, tickets de soporte):

1. Crear un usuario admin vía la UI de registro o desde SaaS Management.
2. Asignar el usuario a la organización demo (Óptica Mirada Clara).
3. Dar acceso a ambas sucursales (admin_branch_access).

Las migraciones usan el primer `admin_users` de la org demo, o el primer `auth.users` como fallback para FKs obligatorias (pos_cashier_id, closed_by).

---

## Resumen de datos por sucursal

| Módulo          | Sucursal 1 (Casa Matriz) | Sucursal 2 (Providencia) |
| --------------- | ------------------------ | ------------------------ |
| **Período**     | Meses 0–4 (4 meses)      | Meses 4–6 (2 meses)      |
| Customers       | 22                       | 18                       |
| Prescriptions   | 22                       | 18                       |
| Appointments    | ~90                      | ~50                      |
| Quotes          | ~25                      | ~15                      |
| Lab work orders | ~20                      | ~12                      |
| Orders          | ~70                      | ~35                      |
| Cash closures   | ~80 días laborables      | ~40 días laborables      |
| Support tickets | —                        | ~10                      |

---

## Progresión temporal

- **Mes 0 (T0)**: Inicio óptica, solo Casa Matriz.
- **Meses 1–3**: Operación de Casa Matriz, volúmenes crecientes.
- **Mes 4 (T4)**: Apertura de Sucursal Providencia.
- **Meses 4–6**: Ambas sucursales operando.

---

## Cómo probar multi-sucursal

1. **Selector de sucursal**: Usar el header/sidebar para cambiar entre Casa Matriz y Sucursal Providencia.
2. **Filtros por branch**: CRM, citas, presupuestos, órdenes de trabajo y POS filtran por sucursal seleccionada.
3. **Dashboard**: KPIs y métricas por sucursal.
4. **POS**: Abrir caja y procesar ventas en cada sucursal.
5. **Inventario**: Stock por sucursal en `product_branch_stock`.

---

## Migraciones

| Archivo                                                | Descripción                    |
| ------------------------------------------------------ | ------------------------------ |
| `20260223000001_seed_demo_mirada_clara_sucursal_1.sql` | Org, branch 1, datos meses 0–4 |
| `20260223000002_seed_demo_mirada_clara_sucursal_2.sql` | Branch 2, datos meses 4–6      |

Ejecutar tras `supabase db reset` o aplicar con `supabase db push`.

---

## Demos dedicadas por usuario

Además de la demo global (Óptica Mirada Clara), el sistema soporta **demos dedicadas de 7 días** por usuario, creadas vía la función `create_demo_organization_for_user(p_user_id, p_demo_type)`:

- **Ópticas conocidas** (`demo_type: 'known_optica'`): signup vía `/acceso-opticas`, demo con banner "Activar tu Óptica" visible, auto-activación permitida.
- **Orgánicos** (`demo_type: 'organic'`): aprobados desde el dashboard, demo sin banner, activación solo vía soporte.

La demo global (`DEMO_ORG_ID`) se mantiene para reset/testing y no se elimina por el cron de limpieza. Ver [docs/onboarding/DUAL_ONBOARDING_FLOWS.md](./onboarding/DUAL_ONBOARDING_FLOWS.md) para el flujo completo.

---

## Relación con reset_demo_organization

La función `reset_demo_organization()` borra y recrea org, branches y customers de la demo anterior ("Óptica Demo Global"). Las migraciones de Mirada Clara insertan datos con `ON CONFLICT` y actualizan el nombre de la org.

Para una demo con progresión temporal:

1. Ejecutar `supabase db reset` (aplica todas las migraciones).
2. O ejecutar `SELECT reset_demo_organization()` y luego las migraciones Mirada Clara si se aplican por separado.

---

## Checklist maestro

Ver [DEMO_OPTICA_MASTER_CHECKLIST.md](./DEMO_OPTICA_MASTER_CHECKLIST.md) para la lista completa de elementos por módulo y criterios de coherencia.
