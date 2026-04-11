# Opttius - Complete Setup Guide

This guide will walk you through setting up Opttius from scratch, including cloning the repository, setting up Docker Supabase, and creating your first admin user.

## Prerequisites

Before starting, ensure you have the following installed:

- **Node.js** >= 18.0.0 ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))

---

## Step 1: Clone the Repository

1. Open your terminal/command prompt
2. Navigate to where you want to clone the project:

   ```bash
   cd /path/to/your/projects
   ```

3. Clone the repository:

   ```bash
   git clone https://github.com/Stefan-migo/businessManagementApp.git
   ```

4. Navigate into the project directory:
   ```bash
   cd businessManagementApp
   ```

---

## Step 2: Install Dependencies

Install all Node.js packages required by the project:

```bash
npm install
```

**Expected output:**

- This will download and install ~774 packages
- May take 2-5 minutes depending on your internet connection
- You may see some deprecation warnings (these are normal)

---

## Step 3: Set Up Environment Variables

1. Copy the example environment file:

   ```bash
   cp env.example .env.local
   ```

2. Open `.env.local` in your text editor

3. Update the Supabase configuration with local values (we'll get these in the next step):
   - `NEXT_PUBLIC_SUPABASE_URL` - Will be `http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Will be provided by Supabase
   - `SUPABASE_SERVICE_ROLE_KEY` - Will be provided by Supabase

**Note:** Keep the file open, you'll need to update it after starting Supabase.

---

## Step 4: Start Docker Desktop

1. **Start Docker Desktop** application
2. Wait for Docker to fully start (you'll see a green indicator)
3. Ensure Docker is running before proceeding

---

## Step 5: Start Local Supabase

Start the local Supabase instance (this uses Docker):

```bash
npm run supabase:start
```

**First time setup:**

- Downloads ~800MB of Docker images
- Takes 5-10 minutes on first run
- Subsequent starts take 10-30 seconds

**Expected output:**

```
✅ Started supabase local development setup.

         API URL: http://127.0.0.1:54321
     GraphQL URL: http://127.0.0.1:54321/graphql/v1
  S3 Storage URL: http://127.0.0.1:54321/storage/v1/s3
         MCP URL: http://127.0.0.1:54321/mcp
    Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
      Studio URL: http://127.0.0.1:54323
     Mailpit URL: http://127.0.0.1:54324
 Publishable key: sb_publishable_XXXXXXXXXXXXX
      Secret key: sb_secret_XXXXXXXXXXXXX
```

**If Supabase is already running:**

- You'll see "supabase start is already running"
- Use the credentials shown in the output

---

## Step 6: Get Supabase Credentials

Get the current status and credentials:

```bash
npm run supabase:status
```

**Copy these values:**

- **Publishable key** → This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Secret key** → This is your `SUPABASE_SERVICE_ROLE_KEY`

---

## Step 7: Update Environment Variables

1. Open `.env.local` in your text editor

2. Update the Supabase section with the values from Step 6:

   ```env
   # ===== SUPABASE =====
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XXXXXXXXXXXXX
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_XXXXXXXXXXXXX
   ```

   **Replace `XXXXXXXXXXXXX` with the actual keys from `supabase:status`**

3. Save the file

---

## Step 8: Create Storage Directories (Optional)

Create directories for Supabase storage buckets:

```bash
mkdir -p supabase/storage/uploads
mkdir -p supabase/storage/product-images
mkdir -p supabase/storage/images
```

**Note:** This prevents warnings during database reset, but the app will work without it.

---

## Step 9: Run Database Migrations

Apply all database migrations to set up the schema:

```bash
npm run supabase:reset
```

**What this does:**

- Creates all database tables
- Sets up Row Level Security (RLS) policies
- Creates necessary functions and triggers
- Applies all migrations from `supabase/migrations/`

**Expected output:**

- You'll see "Applying migration..." for each migration file
- May take 1-2 minutes
- You may see some NOTICE messages (these are normal)
- At the end: "Restarting containers..."

**If you see storage bucket warnings:**

- These are harmless and can be ignored
- The app will still work correctly

---

## Step 10: Verify Database Setup

Verify that migrations were applied successfully:

```bash
npm run supabase:status
```

You should see all services running with green status.

---

## Step 11: Start the Development Server

Start the Next.js development server:

```bash
npm run dev
```

**Expected output:**

```
▲ Next.js 14.2.35
- Local:        http://localhost:3000
- Ready in X seconds
```

**Keep this terminal window open** - the server needs to keep running.

---

## Step 12: Verify Application is Running

1. Open your web browser
2. Navigate to: **http://localhost:3000**
3. You should see the application (it may redirect to `/admin` or `/login`)

---

## Step 13: Create Your First Admin User

You have **three options** to create an admin user:

### Option A: Using Node.js Script (Recommended - Creates New User)

This creates a brand new admin user with the credentials you specify.

**Method 1: Using Environment Variables (Most Secure)**

```bash
# Set your credentials
export ADMIN_EMAIL="your-email@example.com"
export ADMIN_PASSWORD="YourSecurePassword123!"

# Create the admin user
node scripts/create-admin-via-api.js
```

**Method 2: Pass Credentials as Arguments**

```bash
node scripts/create-admin-via-api.js your-email@example.com YourPassword123!
```

**Method 3: Use Default Test Credentials (Local Development Only)**

```bash
node scripts/create-admin-via-api.js
```

This creates:

- Email: `admin@test.com`
- Password: `Admin123!`

**Expected output:**

```
✅ Auth user created: [user-id]
✅ Profile updated with admin tier
✅ Admin user entry created

🎉 Admin user created successfully!
Email: your-email@example.com
Password: YourPassword123!
User ID: [user-id]
```

---

### Option B: Sign Up First, Then Grant Admin Access

1. **Sign up a regular user:**
   - Go to: http://localhost:3000/signup
   - Fill in the signup form with your email and password
   - Complete the signup process

2. **Grant admin access using SQL:**

   a. Edit `scripts/sql-utils/grant-admin-access.sql`:
   - Open the file in a text editor
   - Change `user_email text := 'stefan.migo@gmail.com';` to your email
   - Save the file

   b. Run the SQL script:

   ```bash
   docker exec -i supabase_db_web psql -U postgres -d postgres < scripts/sql-utils/grant-admin-access.sql
   ```

   **Expected output:**

   ```
   NOTICE: Found user: your-email@example.com (ID: [user-id])
   NOTICE: Profile updated with admin tier
   NOTICE: ✅ Admin access granted successfully!
   ```

---

### Option C: Using Supabase Studio (Web UI)

1. **Open Supabase Studio:**
   - Go to: http://127.0.0.1:54323

2. **Sign up a user:**
   - Go to: http://localhost:3000/signup
   - Create your account

3. **Grant admin access via SQL Editor:**
   - In Supabase Studio, go to **SQL Editor**
   - Run this SQL (replace `your-email@example.com` with your email):

   ```sql
   DO $$
   DECLARE
     user_id uuid;
     user_email text := 'your-email@example.com';
   BEGIN
     -- Find user by email
     SELECT id INTO user_id
     FROM auth.users
     WHERE email = user_email;

     IF user_id IS NULL THEN
       RAISE EXCEPTION 'User with email % not found', user_email;
     END IF;

     -- Update profile membership_tier to 'admin'
     UPDATE public.profiles
     SET membership_tier = 'admin', updated_at = now()
     WHERE id = user_id;

     -- Add to admin_users table
     INSERT INTO public.admin_users (id, email, role, is_active, created_at, updated_at)
     VALUES (user_id, user_email, 'admin', true, now(), now())
     ON CONFLICT (id) DO UPDATE SET
       role = 'admin',
       is_active = true,
       updated_at = now();

     RAISE NOTICE 'Admin access granted to %', user_email;
   END $$;
   ```

---

## Step 14: Verify Admin User Creation

Verify your admin user was created:

```bash
docker exec -i supabase_db_web psql -U postgres -d postgres -c "SELECT au.id, au.email, au.role, au.is_active, p.membership_tier FROM admin_users au LEFT JOIN profiles p ON au.id = p.id;"
```

You should see your admin user listed.

---

## Step 15: Log In to Admin Panel

1. **Open your browser:**
   - Go to: http://localhost:3000/login

2. **Log in with your admin credentials:**
   - Enter the email you used
   - Enter the password you set

3. **You'll be redirected to:**
   - Admin Dashboard: http://localhost:3000/admin

---

## 🎉 Setup Complete!

Opttius is now running locally with:

- ✅ Local Supabase database
- ✅ All migrations applied
- ✅ Admin user created
- ✅ Development server running

---

## Useful Commands Reference

### Supabase Commands

```bash
npm run supabase:start    # Start local Supabase
npm run supabase:stop     # Stop local Supabase
npm run supabase:status   # Check status and get credentials
npm run supabase:reset    # Reset database (reapply migrations)
```

### Development Commands

```bash
npm run dev               # Start development server
npm run build             # Build for production
npm run start             # Start production server
npm run lint              # Run ESLint
npm run type-check        # TypeScript type checking
```

### Admin User Creation

```bash
# Create new admin user
node scripts/create-admin-via-api.js [email] [password]

# Or with environment variables
export ADMIN_EMAIL="email@example.com"
export ADMIN_PASSWORD="Password123!"
node scripts/create-admin-via-api.js
```

---

## Access Points

- **Main App**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin
- **Login**: http://localhost:3000/login
- **Signup**: http://localhost:3000/signup
- **Supabase Studio**: http://127.0.0.1:54323
- **Email Testing (Mailpit)**: http://127.0.0.1:54324

---

## Troubleshooting

### Supabase Won't Start

```bash
# Check Docker is running
docker ps

# Stop and restart Supabase
npm run supabase:stop
npm run supabase:start
```

### Port Conflicts

If ports 54321-54324 are in use, edit `supabase/config.toml` to change ports.

### Migration Errors

```bash
# Reset the database completely
npm run supabase:reset
```

### Can't Access Admin Panel

1. Verify you're logged in
2. Check admin_users table:
   ```bash
   docker exec -i supabase_db_web psql -U postgres -d postgres -c "SELECT * FROM admin_users WHERE email = 'your-email@example.com';"
   ```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules
npm install
```

---

## Next Steps

- Explore the admin panel features
- Add products, customers, and orders
- Check out the analytics dashboard
- Review the support ticket system
- Explore the AI chatbot agent (if configured)

---

## Security Notes

⚠️ **Important for Production:**

- Never use default credentials in production
- Always use environment variables for sensitive data
- The `create-admin-via-api.js` script is for **local development only**
- For production, use proper admin creation workflows
- Never commit `.env.local` to version control

---

**Happy coding! 🚀**
