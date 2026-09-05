# Spec: admin-product-org-scoping

## Context

`POST /api/admin/products` derives `organization_id` only from `admin_users.organization_id`, never from the effective branch. A super admin in global view creating a product for another org's branch lands the product (and its stock rows) in the wrong org, so stock stays 0 at sale time. This spec establishes the branch-first org derivation contract, mirroring `processSaleBusinessLookups.ts:220-236`, `adminQuoteService.ts:378-383`, and `customersCreateService.ts:145-152`.

## ADDED Requirements

### Requirement: Branch-first organization resolution on product create

`POST /api/admin/products` MUST resolve the effective branch in priority order — payload `branch_id`, then `x-branch-id` header, then resolved branch context — and MUST derive the product's `organization_id` from that branch's `branches.organization_id`. When no branch resolves, the API MUST fall back to `admin_users.organization_id`. The resolved org MUST be applied to both the product row and all stock rows created by `handleProductStock`.

#### Scenario: Create with branch_id payload lands in branch's org

- GIVEN a super admin in global view and a branch belonging to another org
- WHEN POST /api/admin/products includes `branch_id` for that branch
- THEN the product's `organization_id` equals the branch's `organization_id`
- AND its stock rows are created only for branches of that org

#### Scenario: Create with x-branch-id header lands in branch's org

- GIVEN a super admin and an `x-branch-id` header identifying a branch
- WHEN POST /api/admin/products omits `branch_id` in the payload
- THEN the effective branch comes from the header
- AND the product and its stock rows use the branch's `organization_id`

#### Scenario: Fallback to admin org without branch context

- GIVEN a non-super-admin with an org and no branch context resolving
- WHEN POST /api/admin/products is called
- THEN `organization_id` falls back to `admin_users.organization_id`

#### Scenario: Stock rows target the resolved org's branches

- GIVEN a product created with a resolved branch org
- WHEN `handleProductStock` runs
- THEN `product_branch_stock` rows are created for branches filtered by the resolved org
- AND no stock row targets branches of the admin's own org when it differs

### Requirement: Super admin global without branch is rejected

When the caller is a super admin in global view and no branch context resolves from payload, header, or context, `POST /api/admin/products` MUST return 400 with a clear error message (mirroring `customersCreateService.ts:145-152`).

#### Scenario: Global super admin with no branch gets 400

- GIVEN a super admin in global view
- WHEN POST /api/admin/products is called with no `branch_id`, no `x-branch-id`, and no branch context
- THEN the API returns 400
- AND the error message states that the branch must be specified

### Requirement: Product list stays org-scoped via branch-first derivation

`GET /api/admin/products` MUST keep its existing branch-first org derivation for super admins with a selected branch and MUST scope results to the resolved org (behavior unchanged; covered for regression).

#### Scenario: List scoped to the branch's org

- GIVEN a super admin with a branch selected via `x-branch-id`
- WHEN GET /api/admin/products is called
- THEN products are filtered by the branch's `organization_id`
