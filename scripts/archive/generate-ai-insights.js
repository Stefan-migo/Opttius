/**
 * Script para Generar Insights de IA con Datos Reales del Sistema
 * 
 * Este script genera insights de IA para todas las secciones usando datos reales del sistema.
 * 
 * Uso:
 *   node scripts/generate-ai-insights.js [section]
 * 
 * Ejemplos:
 *   node scripts/generate-ai-insights.js dashboard
 *   node scripts/generate-ai-insights.js inventory
 *   node scripts/generate-ai-insights.js clients
 *   node scripts/generate-ai-insights.js analytics
 *   node scripts/generate-ai-insights.js  (genera para todas las secciones)
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY no está configurado en .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const sections = ['dashboard', 'inventory', 'clients', 'analytics'];

async function getOrganizationForUser(email) {
  // Buscar usuario por email usando listUsers
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    throw new Error(`Error listando usuarios: ${listError.message}`);
  }

  const user = usersData?.users?.find(u => u.email === email);
  
  if (!user) {
    throw new Error(`Usuario con email ${email} no encontrado`);
  }

  // Buscar en admin_users
  const { data: adminUser, error } = await supabase
    .from('admin_users')
    .select('organization_id, organizations(name)')
    .eq('id', user.id)
    .eq('is_active', true)
    .single();

  if (error || !adminUser) {
    throw new Error(`Usuario ${email} no es admin o no tiene organización asignada: ${error?.message || 'No encontrado'}`);
  }

  return {
    userId: user.id,
    organizationId: adminUser.organization_id,
    organizationName: adminUser.organizations?.name || 'Mi Óptica',
  };
}

async function generateInsightsForSection(section, userEmail) {
  console.log(`\n🚀 Generando insights para sección: ${section}`);
  console.log(`📧 Usuario: ${userEmail}\n`);

  try {
    // Obtener organización del usuario
    const { userId, organizationId, organizationName } = await getOrganizationForUser(userEmail);

    console.log(`✅ Organización encontrada: ${organizationName} (${organizationId})`);

    // Crear token de sesión para autenticación
    const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: userEmail,
    });

    if (sessionError) {
      throw new Error(`Error generando sesión: ${sessionError.message}`);
    }

    // Paso 1: Obtener datos reales del sistema
    console.log(`📊 Obteniendo datos reales del sistema...`);
    const prepareDataResponse = await fetch(`${APP_URL}/api/ai/insights/prepare-data?section=${section}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sessionData.properties.access_token}`,
      },
    });

    if (!prepareDataResponse.ok) {
      const errorData = await prepareDataResponse.json().catch(() => ({ error: prepareDataResponse.statusText }));
      throw new Error(`Error obteniendo datos: ${prepareDataResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const prepareData = await prepareDataResponse.json();
    console.log(`✅ Datos obtenidos:`, JSON.stringify(prepareData.data[section] || prepareData.data, null, 2));

    // Paso 2: Generar insights usando los datos reales
    console.log(`\n🤖 Generando insights con IA...`);
    const generateResponse = await fetch(`${APP_URL}/api/ai/insights/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.properties.access_token}`,
      },
      body: JSON.stringify({
        section,
        data: prepareData.data[section] || prepareData.data,
      }),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json().catch(() => ({ error: generateResponse.statusText }));
      throw new Error(`Error generando insights: ${generateResponse.status} - ${JSON.stringify(errorData)}`);
    }

    const result = await generateResponse.json();

    console.log(`\n✅ Insights generados exitosamente!`);
    console.log(`📈 Cantidad: ${result.count}`);
    console.log(`\n📋 Insights creados:\n`);

    result.insights.forEach((insight, index) => {
      console.log(`${index + 1}. [${insight.type.toUpperCase()}] ${insight.title}`);
      console.log(`   Mensaje: ${insight.message}`);
      console.log(`   Prioridad: ${insight.priority}/10`);
      if (insight.action_label) {
        console.log(`   Acción: ${insight.action_label} → ${insight.action_url}`);
      }
      console.log('');
    });

    console.log(`\n✨ Para ver los insights en el frontend:`);
    console.log(`   1. Inicia sesión en ${APP_URL}/admin`);
    console.log(`   2. Navega a la sección correspondiente`);
    console.log(`   3. Los insights aparecerán automáticamente en el widget flotante\n`);

    return result;
  } catch (error) {
    console.error(`\n❌ Error generando insights:`, error.message);
    console.error(error.stack);
    throw error;
  }
}

// Main
const sectionArg = process.argv[2];
const userEmail = process.argv[3] || process.env.DEMO_ADMIN_EMAIL || '';

const sectionsToProcess = sectionArg
  ? [sectionArg]
  : sections;

if (sectionArg && !sections.includes(sectionArg)) {
  console.error(`❌ Sección inválida: ${sectionArg}`);
  console.error(`   Secciones válidas: ${sections.join(', ')}`);
  process.exit(1);
}

console.log('🤖 Script de Generación de Insights de IA con Datos Reales');
console.log('=' .repeat(60));
console.log(`📧 Usuario: ${userEmail}`);
console.log(`📂 Secciones a procesar: ${sectionsToProcess.join(', ')}`);
console.log('=' .repeat(60));

(async () => {
  try {
    for (const section of sectionsToProcess) {
      await generateInsightsForSection(section, userEmail);
      
      // Pequeña pausa entre secciones para no sobrecargar
      if (sectionsToProcess.length > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  }
})();
