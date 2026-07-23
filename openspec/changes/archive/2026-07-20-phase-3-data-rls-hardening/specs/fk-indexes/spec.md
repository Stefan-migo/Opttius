# FK Indexes Specification

## Purpose

Add missing foreign key indexes on agreement, telemetry, and field-operations tables to ensure `EXPLAIN ANALYZE` shows index scans for FK joins. Missing FK indexes cause sequential scans that degrade as these tables grow.

## Requirements

### Requirement: Every FK constraint SHALL have a corresponding index

For every foreign key column in the `agreement_*`, `telemetry_*`, and `operativo_*` table families, there SHALL be a B-tree index on that column (or a compound index with the FK column as the leftmost prefix). If the FK column is already covered by an existing index or unique constraint, no additional index is needed.

#### Scenario: Missing FK indexes on agreement tables are added

- GIVEN the FK constraint `agreement_institutional_balances_purchase_order_id_fkey` on `agreement_institutional_balances.purchase_order_id`
- WHEN checking existing indexes
- THEN the index `idx_agreement_institutional_balances_purchase_order_id` SHALL exist

- GIVEN the FK constraint `fk_agreement_institutional_balances_invoice_id` on `agreement_institutional_balances.invoice_id`
- WHEN checking existing indexes
- THEN the index `idx_agreement_institutional_balances_invoice_id` SHALL exist

- GIVEN the FK constraint `agreement_institutional_invoices_emitted_by_fkey` on `agreement_institutional_invoices.emitted_by`
- WHEN checking existing indexes
- THEN the index `idx_agreement_institutional_invoices_emitted_by` SHALL exist

#### Scenario: Existing FK indexes are verified

- GIVEN the FK constraint `agreement_customers_agreement_id_fkey`
- WHEN checking existing indexes
- THEN `idx_agreement_customers_agreement_id` SHALL exist (already present, verify)

- GIVEN the FK constraint `operativo_mobile_stock_field_operation_id_fkey`
- WHEN checking existing indexes
- THEN `idx_operativo_mobile_stock_field_operation` SHALL exist (already present, verify)

#### Scenario: Telemetry FK columns covered by existing indexes

- GIVEN the FK constraint `telemetry_events_organization_id_fkey` on `telemetry_events.organization_id`
- WHEN checking existing indexes
- THEN `idx_telemetry_events_org_timestamp` SHALL cover it (first column is organization_id)
- AND no additional single-column index is needed

### Requirement: New indexes SHALL use IF NOT EXISTS for idempotency

All index creation statements SHALL use `CREATE INDEX IF NOT EXISTS`. The migration SHALL be safe to run multiple times against the same schema.

#### Scenario: Idempotent migration

- GIVEN the migration has been applied once
- WHEN run again
- THEN it SHALL complete without errors
- AND no duplicate indexes SHALL be created

### Requirement: EXPLAIN ANALYZE SHALL verify index scans

After migration, `EXPLAIN ANALYZE` on FK join queries for each target table SHALL show Index Scan (not Sequential Scan) for the FK join condition.

#### Scenario: Index scan verification

- GIVEN the migration is applied against the consolidated schema
- WHEN running `EXPLAIN ANALYZE SELECT * FROM agreement_institutional_balances WHERE purchase_order_id = '<valid-uuid>'`
- THEN the plan SHALL show `Index Scan using idx_agreement_institutional_balances_purchase_order_id`

### Requirement: Agreement tables SHALL have completed FK index coverage

The following missing indexes MUST be added:

| Table                              | FK Column           | Target Index Name                                        |
| ---------------------------------- | ------------------- | -------------------------------------------------------- |
| `agreement_institutional_balances` | `purchase_order_id` | `idx_agreement_institutional_balances_purchase_order_id` |
| `agreement_institutional_balances` | `invoice_id`        | `idx_agreement_institutional_balances_invoice_id`        |
| `agreement_institutional_invoices` | `emitted_by`        | `idx_agreement_institutional_invoices_emitted_by`        |

All other FK columns in the `agreement_*`, `telemetry_*`, and `operativo_*` table families SHALL be verified to have existing index coverage. Any additional gaps found during audit MUST be documented and indexed.

#### Scenario: Audit-driven gap detection

- GIVEN the consolidated schema migration
- WHEN querying `pg_indexes` for each FK column in `agreement_*`, `telemetry_*`, `operativo_*` tables
- THEN any FK column without a matching index SHALL have one created
- AND the gap SHALL be documented in a spec update

| Table Family                          | FK Columns                                                                                                             | Indexed     | Missing |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- | ------- |
| `agreement_*` (5 tables, ~12 FK cols) | agreement_id, customer_id, order_id, purchase_order_id, invoice_id, balance_id, branch_id, organization_id, emitted_by | 9           | 3       |
| `telemetry_*` (3 tables)              | organization_id, user_id                                                                                               | All covered | 0       |
| `operativo_*` (2 tables)              | field_operation_id, product_id                                                                                         | All covered | 0       |
