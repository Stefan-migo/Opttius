# Quick Setup Reference

A condensed version of the setup process for quick reference.

## Quick Setup (5 Minutes)

```bash
# 1. Clone repository
git clone https://github.com/Stefan-migo/Opttius.git
cd Opttius

# 2. Install dependencies
npm install

# 3. Copy environment file
cp env.example .env.local

# 4. Start Supabase (first time: 5-10 min, subsequent: 10-30 sec)
npm run supabase:start

# 5. Get credentials
npm run supabase:status
# Copy: Publishable key → NEXT_PUBLIC_SUPABASE_ANON_KEY
# Copy: Secret key → SUPABASE_SERVICE_ROLE_KEY

# 6. Update .env.local with:
# NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=[from step 5]
# SUPABASE_SERVICE_ROLE_KEY=[from step 5]

# 7. Run migrations
npm run supabase:reset

# 8. Start dev server
npm run dev

# 9. Create admin user
node scripts/create-admin-via-api.js your-email@example.com YourPassword123!

# 10. Login at http://localhost:3000/login
```

## Essential Commands

```bash
# Start/Stop Supabase
npm run supabase:start
npm run supabase:stop
npm run supabase:status

# Database
npm run supabase:reset  # Reset and reapply migrations

# Development
npm run dev            # Start dev server
npm run build          # Build for production

# Create Admin
node scripts/create-admin-via-api.js [email] [password]
```

## Access URLs

- App: http://localhost:3000
- Admin: http://localhost:3000/admin
- Supabase Studio: http://127.0.0.1:54323
- Mailpit: http://127.0.0.1:54324

## Default Admin Credentials (Test Only)

- Email: `admin@test.com`
- Password: `Admin123!`

---

For detailed instructions, see [SETUP_GUIDE.md](./SETUP_GUIDE.md)
