// Create SuperAdmin User for Demo Organization
// This script creates a user via Supabase Auth API and assigns them to the demo organization
// 
// IMPORTANT: Run scripts/create-root-user.js FIRST to create a root/dev user for SaaS management
//
// Usage:
//   node scripts/create-demo-super-admin.js
//   OR with custom credentials:
//   DEMO_ADMIN_EMAIL=demo@example.com DEMO_ADMIN_PASSWORD=Password123! node scripts/create-demo-super-admin.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('   Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_ORG_ID = '00000000-0000-0000-0000-000000000001';
const DEMO_BRANCH_ID = '00000000-0000-0000-0000-000000000002';
const DEMO_BRANCH_2_ID = '00000000-0000-0000-0000-000000000003';

async function createDemoSuperAdmin() {
  const email = process.env.DEMO_ADMIN_EMAIL;
  const password = process.env.DEMO_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('❌ Missing demo credentials. Set in .env.local or when running:');
    console.error('   DEMO_ADMIN_EMAIL=your-demo@example.com');
    console.error('   DEMO_ADMIN_PASSWORD=your-secure-password');
    console.error('');
    console.error('   Example: DEMO_ADMIN_EMAIL=demo@test.local DEMO_ADMIN_PASSWORD=DemoPass123! node scripts/create-demo-super-admin.js');
    process.exit(1);
  }

  console.log('');
  console.log('========================================');
  console.log('Creating SuperAdmin for Demo Organization');
  console.log('========================================');
  console.log('');
  console.log('Email:', email);
  console.log('Password:', '[configurada]');
  console.log('');

  try {
    let userId;
    let userExists = false;

    // Check if user already exists
    console.log('🔍 Checking for existing user...');
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();

    if (!listError && existingUsers?.users) {
      const existingUser = existingUsers.users.find(u => u.email === email);
      if (existingUser) {
        console.log('✅ User already exists, updating...');
        userId = existingUser.id;
        userExists = true;

        // Update password
        const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
          password: password,
          email_confirm: true
        });

        if (updateError) {
          console.warn('⚠️  Error updating password (may already be correct):', updateError.message);
        } else {
          console.log('✅ Password updated');
        }
      }
    }

    // Create user if doesn't exist
    if (!userExists) {
      console.log('📝 Creating new user...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: 'Demo',
          last_name: 'SuperAdmin'
        }
      });

      if (authError) {
        if (authError.message?.includes('already registered')) {
          console.log('⚠️  User already registered, trying to find...');
          const { data: users } = await supabase.auth.admin.listUsers();
          const user = users?.users?.find(u => u.email === email);
          if (user) {
            userId = user.id;
            userExists = true;
          } else {
            throw new Error('User exists but could not be found');
          }
        } else {
          throw authError;
        }
      } else {
        userId = authData.user.id;
        console.log('✅ User created:', userId);
      }
    }

    // Create/update profile (skip membership_tier as it may not exist)
    console.log('📝 Creating/updating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: email,
        first_name: 'Demo',
        last_name: 'SuperAdmin',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.warn('⚠️  Profile error (may already exist):', profileError.message);
    } else {
      console.log('✅ Profile created/updated');
    }

    // Create/update admin_users entry
    // System uses simplified 'admin' role, pero necesitamos acceso completo
    console.log('📝 Creating/updating admin_users entry...');
    const { error: adminError } = await supabase
      .from('admin_users')
      .upsert({
        id: userId,
        email: email,
        role: 'admin', // Sistema simplificado usa solo 'admin'
        organization_id: DEMO_ORG_ID, // Asignar a organización demo
        is_active: true,
        permissions: {
          orders: ['read', 'create', 'update', 'delete'],
          products: ['read', 'create', 'update', 'delete'],
          customers: ['read', 'create', 'update', 'delete'],
          analytics: ['read'],
          settings: ['read', 'create', 'update', 'delete'],
          admin_users: ['read', 'create', 'update', 'delete'],
          support: ['read', 'create', 'update', 'delete'],
          bulk_operations: ['read', 'create', 'update', 'delete']
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (adminError) {
      throw new Error(`Failed to create admin_users entry: ${adminError.message}`);
    }
    console.log('✅ Admin user created/updated');
    console.log('   Role: admin (full access)');
    console.log('   Organization ID:', DEMO_ORG_ID);
    console.log('   Is Active: true');

    // Grant branch access - crear acceso a la sucursal demo
    console.log('📝 Granting branch access...');
    const branchData = {
      admin_user_id: userId,
      branch_id: DEMO_BRANCH_ID,
      role: 'manager',
      is_primary: true
    };
    
    const { error: branchError } = await supabase
      .from('admin_branch_access')
      .upsert(branchData, {
        onConflict: 'admin_user_id,branch_id'
      });

    if (branchError) {
      console.warn('⚠️  Branch access error (may already exist):', branchError.message);
    } else {
      console.log('✅ Branch access granted (Casa Matriz)');
      console.log('   Branch ID:', DEMO_BRANCH_ID);
      console.log('   Role: manager');
      console.log('   Is Primary: true');
    }

    // Grant access to second branch (Sucursal Providencia)
    console.log('📝 Granting access to Sucursal Providencia...');
    const branch2Data = {
      admin_user_id: userId,
      branch_id: DEMO_BRANCH_2_ID,
      role: 'manager',
      is_primary: false
    };

    const { error: branch2Error } = await supabase
      .from('admin_branch_access')
      .upsert(branch2Data, {
        onConflict: 'admin_user_id,branch_id'
      });

    if (branch2Error) {
      console.warn('⚠️  Branch 2 access error (may already exist):', branch2Error.message);
    } else {
      console.log('✅ Branch access granted (Sucursal Providencia)');
      console.log('   Branch ID:', DEMO_BRANCH_2_ID);
    }

    // También crear acceso global (super_admin) para acceso completo
    // Esto permite acceso a todas las sucursales
    console.log('📝 Granting global access (super_admin)...');
    const globalAccessData = {
      admin_user_id: userId,
      branch_id: null, // NULL = acceso a todas las sucursales
      role: 'manager',
      is_primary: false
    };
    
    const { error: globalAccessError } = await supabase
      .from('admin_branch_access')
      .upsert(globalAccessData, {
        onConflict: 'admin_user_id,branch_id'
      });

    if (globalAccessError) {
      console.warn('⚠️  Global access error (may already exist):', globalAccessError.message);
    } else {
      console.log('✅ Global access granted (super_admin)');
      console.log('   This allows access to all branches');
    }

    console.log('');
    console.log('========================================');
    console.log('✅ SuperAdmin created successfully!');
    console.log('========================================');
    console.log('');
    // Verificar que el usuario se creó correctamente
    console.log('🔍 Verifying user setup...');
    const { data: verifyAdmin, error: verifyError } = await supabase
      .from('admin_users')
      .select('id, email, role, organization_id, is_active')
      .eq('id', userId)
      .single();

    if (verifyError) {
      console.warn('⚠️  Warning: Could not verify admin user:', verifyError.message);
    } else {
      console.log('✅ Verification successful:');
      console.log('   ID:', verifyAdmin.id);
      console.log('   Email:', verifyAdmin.email);
      console.log('   Role:', verifyAdmin.role);
      console.log('   Organization ID:', verifyAdmin.organization_id);
      console.log('   Is Active:', verifyAdmin.is_active);
    }

    // Verificar acceso a sucursales
    const { data: verifyBranches, error: branchVerifyError } = await supabase
      .from('admin_branch_access')
      .select('admin_user_id, branch_id, role, is_primary')
      .eq('admin_user_id', userId);

    if (branchVerifyError) {
      console.warn('⚠️  Warning: Could not verify branch access:', branchVerifyError.message);
    } else if (verifyBranches?.length) {
      console.log('✅ Branch access verified:');
      verifyBranches.forEach((aba, i) => {
        console.log(`   ${i + 1}. Branch: ${aba.branch_id || 'All (global)'}, Role: ${aba.role}, Primary: ${aba.is_primary}`);
      });
    }

    console.log('');
    console.log('========================================');
    console.log('✅ SuperAdmin created successfully!');
    console.log('========================================');
    console.log('');
    console.log('Credentials:');
    console.log('  Email:', email);
    console.log('  Password:', password);
    console.log('  Role: admin (full access)');
    console.log('  Organization: Óptica Demo Global (Demo Mode)');
    console.log('  Branches: Casa Matriz, Sucursal Providencia');
    console.log('');
    console.log('You can now login at: http://localhost:3000/login');
    console.log('');
    console.log('Note: This user has full admin access to the demo organization.');
    console.log('      You can explore all features with pre-loaded sample data.');
    console.log('');

  } catch (error) {
    console.error('');
    console.error('❌ Error creating demo super admin:');
    console.error(error.message);
    console.error('');
    process.exit(1);
  }
}

createDemoSuperAdmin();
