# RLS Wave 2 — Org-Blind Policy Specification

## Purpose

Fix remaining RLS policies across ~10 tables that still use org-blind `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())` without an organization scoping check. This eliminates cross-tenant data access vulnerabilities identified after Wave 1 patched `customer_lens_purchases`.

## Requirements

### Requirement: Support tables SHALL have org-scoped policies

`support_categories`, `support_templates`, `support_tickets`, and `support_messages` SHALL have RLS policies that scope access to the user's organization. Policies that only check `EXISTS (SELECT 1 FROM admin_users)` are a MUST NOT.

#### Scenario: Admin can manage only own org's support data

- GIVEN admin user A from Org X and admin user B from Org Y, each with a support ticket
- WHEN user A queries `support_tickets`
- THEN user A MUST see only Org X's tickets
- AND user B MUST see only Org Y's tickets

#### Scenario: Customers can see own tickets (unchanged)

- GIVEN a customer with a support ticket linked to their `customer_id`
- WHEN the customer queries `support_tickets`
- THEN the existing customer-scoped policy MUST remain functional
- AND the new org-scoped admin policy MUST NOT interfere

### Requirement: Chat tables SHALL have org-scoped admin policies

`chat_messages` and `chat_sessions` SHALL scope their admin-level view policies to the user's organization. Existing user-scoped policies (by `user_id` or `session_id`) MUST be preserved.

#### Scenario: Admin views only own org's chat sessions

- GIVEN admin user A from Org X and admin B from Org Y
- WHEN admin A queries `chat_sessions` with the admin-wide policy
- THEN admin A MUST see only sessions where `organization_id = admin_user.organization_id`
- AND admin B MUST see only Org Y's sessions

### Requirement: Contact lens inventory SHALL have org-scoped INSERT/UPDATE/DELETE

`contact_lens_inventory` has a branch-scoped SELECT policy but INSERT, UPDATE, and DELETE are org-blind (only check admin role). These MUST be scoped to the user's organization through branch ownership.

#### Scenario: Admin manages only own org's contact lens stock

- GIVEN admin A in Org X and admin B in Org Y
- WHEN admin A inserts/updates/deletes `contact_lens_inventory`
- THEN the operation MUST succeed only if the row belongs to a branch in Org X
- AND admin B MUST be denied access to Org X's rows

### Requirement: Lead management tables SHALL have org-scoped access

`lead_activities`, `lead_scoring_logs`, and `lead_scoring_rules` currently have root-only policies without any org scoping. These SHALL add organization scoping to allow org-level lead management while preserving root full-access.

#### Scenario: Org admin can manage own leads

- GIVEN a lead activity record for Org X
- WHEN an admin user from Org X queries `lead_activities`
- THEN the admin MUST see the record
- AND a root user MUST still see all records

### Requirement: Inventory movements SHALL have org-scoped INSERT

`inventory_movements` INSERT policy is org-blind and MUST be scoped to the user's organization through the product's organization or branch.

#### Scenario: Org-scoped inventory movement insertion

- GIVEN admin A in Org X and admin B in Org Y
- WHEN admin A inserts an inventory movement referencing a Product in Org X
- THEN the insert SHALL succeed
- AND when admin B tries the same, it SHALL fail if the product is not in Org Y

| Table                    | Blind Policies              | Fix Strategy                                          |
| ------------------------ | --------------------------- | ----------------------------------------------------- |
| `support_categories`     | manage (USING + WITH CHECK) | Add `organization_id` check via FK to branch/category |
| `support_templates`      | manage (USING + WITH CHECK) | Add `organization_id` check via category FK           |
| `support_tickets`        | 2 admin policies            | Scope via `organization_id` column or branch FK       |
| `support_messages`       | 2 admin policies            | Scope via ticket → organization                       |
| `chat_messages`          | admin-view-all              | Scope via session → organization_id                   |
| `chat_sessions`          | admin-view-all              | Add `organization_id` check                           |
| `contact_lens_inventory` | INSERT/DELETE/UPDATE        | Scope via branch_id → organization_id                 |
| `lead_activities`        | root-only                   | Preserve root + add org scope                         |
| `lead_scoring_logs`      | root-only                   | Preserve root + add org scope                         |
| `lead_scoring_rules`     | root-only                   | Preserve root + add org scope                         |
| `inventory_movements`    | INSERT                      | Scope via product → org                               |
