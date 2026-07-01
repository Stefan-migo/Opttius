# Pre-deploy Checklist: SUPABASE_CRON_KEY

Required before the `SUPABASE_CRON_KEY` change works in production.

## 1. Generate JWT for `cron_role`

Run in **Supabase Dashboard > SQL Editor**:

```sql
-- Generate a JWT token scoped to cron_role
select auth.sign(
  json_build_object(
    'role', 'cron_role',
    'iss', 'supabase',
    'exp', extract(epoch from now() + interval '10 years')::bigint
  ),
  current_setting('app.settings.jwt_secret')
);
```

Alternative: Dashboard > Settings > API > Generate JWT with payload `{"role": "cron_role"}`.

## 2. Set env var in Vercel

| Variable            | Value                         |
| ------------------- | ----------------------------- |
| `SUPABASE_CRON_KEY` | The generated JWT from step 1 |

## 3. Apply migration

Apply `20260701000011_cron_role_write_grants.sql` to production via `supabase db push` or SQL Editor.

## 4. Smoke-test cron endpoints

After deploy, hit each cron endpoint and confirm 2xx:

```bash
# Replace <CRON_SECRET> with the actual secret
curl -H "Authorization: Bearer <CRON_SECRET>" https://app.opttius.com/api/cron/appointment-reminders
curl -H "Authorization: Bearer <CRON_SECRET>" https://app.opttius.com/api/cron/backups
# ... all 17 endpoints
```

Expected: 200 OK. If any returns 42501 → missing GRANT, add it.

## Rollback

- Swap `SUPABASE_CRON_KEY` back to `SUPABASE_SERVICE_ROLE_KEY` in Vercel env vars
- Or delete the JWT and the migration won't block anything since it only ADDs privileges
