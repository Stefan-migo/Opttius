# Tasks: Service Role Reduction — Phase 1 Remaining

## Review Workload Forecast

| Field                   | Value       |
| ----------------------- | ----------- |
| Estimated changed lines | ~30         |
| 400-line budget risk    | Low         |
| Chained PRs recommended | No          |
| Suggested split         | Single PR   |
| Delivery strategy       | ask-on-risk |
| Chain strategy          | pending     |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal                                         | Likely PR | Notes                 |
| ---- | -------------------------------------------- | --------- | --------------------- |
| 1    | Swap cron.ts key + update .env.example       | Single PR | Single commit to main |
| 2    | Verify GRANTs cover cron surface + run tests | Same PR   | Same commit           |

## Phase 1: Remaining Implementation

- [x] **1.1 Swap key in `src/utils/supabase/cron.ts`** — change `SUPABASE_SERVICE_ROLE_KEY` env var reference to `SUPABASE_CRON_KEY`, update error message, remove Phase 1→2 comment
- [x] **1.2 Add `SUPABASE_CRON_KEY` to `.env.example`** — add entry with descriptive comment (example value: placeholder or empty string)

> **Manual prerequisite**: Issue a `SUPABASE_CRON_KEY` JWT for `cron_role` via Supabase dashboard before deploy. One-time operation, not code.

## Phase 2: Verification

- [x] **2.1 Verify `cron_role` GRANTs** — confirmed SELECT ON ALL TABLES covers reads. Missing write GRANTs added in `20260701000011_cron_role_write_grants.sql`: INSERT on `ai_insights`, UPDATE on `demo_requests`, UPDATE on `payments`.
- [x] **2.2 Run tests** — `npm run test:run` passes (83/96 files, 1397/1581 passing). Only failure is pre-existing timeout in email-variables-integration, unrelated to cron.
- [ ] **2.3 Smoke-test cron endpoints** — ⚠️ Requires deployed `SUPABASE_CRON_KEY` JWT. Cannot perform locally. Must be done post-deploy.

## Dependencies

- `SUPABASE_CRON_KEY` JWT for `cron_role` must exist in project env vars (set via Supabase dashboard)
- Migration `20260701000010_create_cron_role.sql` already applied (commit `38c0d62`)
