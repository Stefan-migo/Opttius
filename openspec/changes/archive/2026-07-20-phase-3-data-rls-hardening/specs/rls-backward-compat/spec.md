# RLS Backward Compat Removal Specification

## Purpose

Remove `organization_id IS NULL` fallback from all RLS policies. This pattern was introduced during multi-tenant migration to allow legacy global/default rows to remain accessible. After Wave 2 ensures all rows have proper `organization_id`, the IS NULL escape hatch MUST be eliminated to enforce strict org isolation.

## Requirements

### Requirement: No RLS policy SHALL use `organization_id IS NULL` as an access grant

Every RLS policy that includes `OR (organization_id IS NULL)` as a fallback to grant access to unowned rows MUST be rewritten. The IS NULL check SHALL be replaced by explicit org-scoped checks or removed entirely.

#### Scenario: Schedule/quote/POS settings no longer accessible via IS NULL

- GIVEN a schedule_settings row with `organization_id IS NULL` (legacy global default)
- WHEN an admin from Org X queries schedule_settings
- THEN the row MUST NOT be visible unless the admin has explicit access through a different policy
- AND any code relying on the global fallback MUST be updated to explicitly scope queries

#### Scenario: Notification settings scoped exclusively

- GIVEN a notification_settings row with `organization_id IS NULL AND branch_id IS NULL` (global default)
- WHEN a non-root admin queries notification_settings
- THEN the row MUST be visible only if the admin's org has no specific override
- AND the global row SHALL only be readable by root users or through an explicit global-config policy

### Requirement: Organization-level default rows SHALL use explicit policies

Tables that need global default rows (e.g., system_email_templates with `category = 'organization' AND organization_id IS NULL`) SHALL have a dedicated, explicitly named policy that grants access to those rows, rather than mixing the IS NULL grant into the org-scoped policy.

#### Scenario: Global templates accessible through named policy

- GIVEN a system_email_template with `category = 'organization'` and `organization_id IS NULL`
- WHEN an admin queries templates
- THEN the row SHALL be accessible through a new policy named "Users can view global organization templates" that explicitly targets `organization_id IS NULL AND category = 'organization'`
- AND the original org-scoped policy SHALL NOT include `OR organization_id IS NULL`

### Requirement: Branch-ID NULL patterns SHALL be reviewed separately

Tables with `(branch_id IS NULL) OR (organization_id IS NULL)` composite fallbacks SHALL be split: branch-level policies SHALL handle branch scope, org-level policies SHALL handle org scope. No single policy SHALL grant access via NULL on both dimensions.

#### Scenario: Branch-settings policy decomposition

- GIVEN a quote_settings policy with `branch_id IS NULL OR organization_id = get_user_organization_id()`
- WHEN refactored
- THEN there SHALL be two policies: one for org-level settings (`organization_id = get_user_organization_id()`) and one for branch-level settings (`branch_id = accessible_branch`)
- AND `organization_id IS NULL` SHALL NOT appear in either

| Table                         | Current IS NULL Pattern                        | Replacement                                         |
| ----------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| `contact_lens_families`       | `OR org_id IS NULL`                            | Drop IS NULL; all families have org_id after Wave 2 |
| `contact_lens_price_matrices` | `OR org_id IS NULL`                            | Drop IS NULL                                        |
| `schedule_settings`           | `OR (org_id IS NULL)` composite                | Split to org-scoped + branch-scoped policies        |
| `pos_settings`                | `OR (org_id IS NULL)` composite                | Split to org-scoped + branch-scoped policies        |
| `quote_settings`              | `OR (org_id IS NULL)` composite                | Split to org-scoped + branch-scoped policies        |
| `notification_settings`       | `OR (org_id IS NULL AND branch_id IS NULL)`    | Explicit global-config policy for root              |
| `system_email_templates`      | `category = 'organization' AND org_id IS NULL` | Renamed explicit policy                             |
| `admin_notifications`         | `org_id IS NULL` for SaaS notifications        | Root-only explicit policy                           |
