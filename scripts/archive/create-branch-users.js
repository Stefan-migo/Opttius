/**
 * Script para crear usuarios de prueba con diferentes niveles de acceso a sucursales
 * 
 * Uso:
 * node scripts/create-branch-users.js
 * 
 * O con credenciales personalizadas:
 * ADMIN_EMAIL=admin@test.com ADMIN_PASSWORD=password123 node scripts/create-branch-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurada en .env.local');
  console.error('Ejecuta: npm run supabase:status para obtener las credenciales');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createUser(email, password, firstName, lastName) {
  console.log(`\n📝 Creando/verificando usuario: ${email}`);
  
  // Verificar si el usuario ya existe
  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);
  
  let userId;
  
  if (existingUser) {
    console.log(`ℹ️  Usuario ya existe, actualizando...`);
    userId = existingUser.id;
    
    // Actualizar contraseña y metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: password,
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });
    
    if (updateError) {
      console.warn(`⚠️  No se pudo actualizar usuario:`, updateError.message);
    } else {
      console.log(`✅ Usuario actualizado`);
    }
  } else {
    // Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirmar email para desarrollo
      user_metadata: {
        first_name: firstName,
        last_name: lastName
      }
    });

    if (authError) {
      console.error(`❌ Error creando usuario en auth:`, authError.message);
      return null;
    }

    userId = authData.user.id;
    console.log(`✅ Usuario creado en auth: ${userId}`);
  }

  // Crear o actualizar perfil (puede existir por trigger)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      email,
      first_name: firstName,
      last_name: lastName,
    }, {
      onConflict: 'id'
    });

  if (profileError) {
    // Si el perfil ya existe, intentar actualizarlo
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email,
        first_name: firstName,
        last_name: lastName,
      })
      .eq('id', userId);

    if (updateError) {
      console.error(`❌ Error creando/actualizando perfil:`, profileError.message);
      return null;
    }
    console.log(`✅ Perfil actualizado (ya existía)`);
  } else {
    console.log(`✅ Perfil creado`);
  }

  return userId;
}

async function createAdminUser(userId, email) {
  console.log(`\n👤 Creando/verificando usuario admin: ${email}`);
  
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('admin_users')
    .select('id')
    .eq('id', userId)
    .single();

  if (existing) {
    console.log(`ℹ️  Usuario admin ya existe, actualizando...`);
    const { error } = await supabase
      .from('admin_users')
      .update({
        email,
        role: 'admin',
        is_active: true,
        permissions: {
          orders: ['read', 'create', 'update', 'delete'],
          products: ['read', 'create', 'update', 'delete'],
          customers: ['read', 'create', 'update', 'delete'],
          analytics: ['read'],
          settings: ['read', 'create', 'update', 'delete'],
          admin_users: ['read'],
          support: ['read', 'create', 'update', 'delete'],
          bulk_operations: ['read', 'create', 'update', 'delete']
        }
      })
      .eq('id', userId);

    if (error) {
      console.error(`❌ Error actualizando admin_user:`, error.message);
      return false;
    }
    console.log(`✅ Usuario admin actualizado`);
  } else {
    const { error } = await supabase
      .from('admin_users')
      .insert({
        id: userId,
        email,
        role: 'admin',
        is_active: true,
        permissions: {
          orders: ['read', 'create', 'update', 'delete'],
          products: ['read', 'create', 'update', 'delete'],
          customers: ['read', 'create', 'update', 'delete'],
          analytics: ['read'],
          settings: ['read', 'create', 'update', 'delete'],
          admin_users: ['read'],
          support: ['read', 'create', 'update', 'delete'],
          bulk_operations: ['read', 'create', 'update', 'delete']
        }
      });

    if (error) {
      console.error(`❌ Error creando admin_user:`, error.message);
      return false;
    }

    console.log(`✅ Usuario admin creado`);
  }
  return true;
}

async function assignBranchAccess(userId, branchId, role = 'manager', isPrimary = true) {
  console.log(`\n🏢 Asignando acceso a sucursal: ${branchId || 'TODAS (Super Admin)'}`);
  
  // Verificar si ya existe
  const { data: existing } = await supabase
    .from('admin_branch_access')
    .select('id')
    .eq('admin_user_id', userId)
    .is('branch_id', branchId === null ? null : 'not null')
    .single();

  if (existing) {
    console.log(`ℹ️  Acceso a sucursal ya existe, actualizando...`);
    const { error } = await supabase
      .from('admin_branch_access')
      .update({
        role,
        is_primary: isPrimary
      })
      .eq('admin_user_id', userId)
      .is('branch_id', branchId === null ? null : 'not null');

    if (error) {
      console.error(`❌ Error actualizando acceso a sucursal:`, error.message);
      return false;
    }
    console.log(`✅ Acceso a sucursal actualizado`);
  } else {
    // Eliminar cualquier acceso existente para este usuario
    await supabase
      .from('admin_branch_access')
      .delete()
      .eq('admin_user_id', userId);

    const { error } = await supabase
      .from('admin_branch_access')
      .insert({
        admin_user_id: userId,
        branch_id: branchId, // NULL = super admin (acceso a todas)
        role,
        is_primary: isPrimary
      });

    if (error) {
      console.error(`❌ Error asignando acceso a sucursal:`, error.message);
      return false;
    }

    console.log(`✅ Acceso a sucursal asignado`);
  }
  return true;
}

async function getMainBranch() {
  const { data, error } = await supabase
    .from('branches')
    .select('id, name, code')
    .eq('code', 'MAIN')
    .single();

  if (error || !data) {
    console.error('❌ Error obteniendo sucursal principal:', error?.message);
    return null;
  }

  return data;
}

async function main() {
  console.log('🚀 Creando usuarios de prueba para sistema multi-sucursal\n');
  console.log('='.repeat(60));

  // Obtener sucursal principal
  const mainBranch = await getMainBranch();
  if (!mainBranch) {
    console.error('❌ No se pudo obtener la sucursal principal');
    process.exit(1);
  }

  console.log(`\n📍 Sucursal Principal encontrada: ${mainBranch.name} (${mainBranch.code})`);
  console.log(`   ID: ${mainBranch.id}\n`);

  // ===== USUARIO 1: Admin Regular (solo una sucursal) =====
  const regularAdminEmail = process.env.REGULAR_ADMIN_EMAIL || 'admin@sucursal.com';
  const regularAdminPassword = process.env.REGULAR_ADMIN_PASSWORD || 'Admin123!';
  const regularAdminFirstName = 'Admin';
  const regularAdminLastName = 'Sucursal';

  console.log('\n' + '='.repeat(60));
  console.log('👤 CREANDO ADMIN REGULAR (Solo una sucursal)');
  console.log('='.repeat(60));

  const regularAdminId = await createUser(
    regularAdminEmail,
    regularAdminPassword,
    regularAdminFirstName,
    regularAdminLastName
  );

  if (regularAdminId) {
    await createAdminUser(regularAdminId, regularAdminEmail);
    await assignBranchAccess(regularAdminId, mainBranch.id, 'manager', true);
  }

  // ===== USUARIO 2: Super Admin (acceso a todas las sucursales) =====
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@test.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin123!';
  const superAdminFirstName = 'Super';
  const superAdminLastName = 'Admin';

  console.log('\n' + '='.repeat(60));
  console.log('👑 CREANDO SUPER ADMIN (Acceso a todas las sucursales)');
  console.log('='.repeat(60));

  const superAdminId = await createUser(
    superAdminEmail,
    superAdminPassword,
    superAdminFirstName,
    superAdminLastName
  );

  if (superAdminId) {
    await createAdminUser(superAdminId, superAdminEmail);
    // NULL branch_id = super admin (acceso a todas las sucursales)
    await assignBranchAccess(superAdminId, null, 'manager', true);
  }

  // ===== RESUMEN =====
  console.log('\n' + '='.repeat(60));
  console.log('✅ RESUMEN DE USUARIOS CREADOS');
  console.log('='.repeat(60));
  
  if (regularAdminId) {
    console.log(`\n👤 Admin Regular:`);
    console.log(`   Email: ${regularAdminEmail}`);
    console.log(`   Password: ${regularAdminPassword}`);
    console.log(`   Acceso: Solo sucursal "${mainBranch.name}"`);
    console.log(`   Puede ver: Solo datos de su sucursal`);
  }

  if (superAdminId) {
    console.log(`\n👑 Super Admin:`);
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log(`   Acceso: TODAS las sucursales (Vista Global)`);
    console.log(`   Puede ver: Todos los datos de todas las sucursales`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Usuarios creados exitosamente!');
  console.log('='.repeat(60));
  console.log('\n💡 Puedes iniciar sesión en: http://localhost:3000/login');
  console.log('💡 El selector de sucursal aparecerá en el header del panel admin\n');
}

main().catch(console.error);
