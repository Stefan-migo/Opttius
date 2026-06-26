/**
 * Script para Generar Insights de IA con Datos Reales del Sistema
 * Versión Directa - Usa directamente el generador sin pasar por API
 * 
 * Uso:
 *   node scripts/generate-ai-insights-direct.js [section] [email]
 * 
 * Ejemplos:
 *   node scripts/generate-ai-insights-direct.js dashboard
 *   node scripts/generate-ai-insights-direct.js inventory $DEMO_ADMIN_EMAIL
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    throw new Error(`Error listando usuarios: ${listError.message}`);
  }

  const user = usersData?.users?.find(u => u.email === email);
  
  if (!user) {
    throw new Error(`Usuario con email ${email} no encontrado`);
  }

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

async function prepareDashboardData(organizationId, branchId = null) {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get orders
  let ordersQuery = supabase
    .from('orders')
    .select('total_amount, created_at, status, payment_status')
    .gte('created_at', thirtyDaysAgo.toISOString());

  if (branchId) {
    ordersQuery = ordersQuery.eq('branch_id', branchId);
  }

  const { data: orders } = await ordersQuery;

  // Calculate yesterday's sales
  const yesterdayOrders = orders?.filter((o) => {
    const orderDate = new Date(o.created_at);
    return (
      orderDate >= yesterday &&
      orderDate <= yesterdayEnd &&
      (o.status === 'completed' || o.payment_status === 'paid')
    );
  }) || [];

  const yesterdaySales = yesterdayOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Calculate monthly average
  const monthlyOrders = orders?.filter((o) => {
    const orderDate = new Date(o.created_at);
    return (
      orderDate >= thirtyDaysAgo &&
      (o.status === 'completed' || o.payment_status === 'paid')
    );
  }) || [];

  const monthlyRevenue = monthlyOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);
  const monthlyAverage = monthlyRevenue / 30;

  // Get work orders
  let workOrdersQuery = supabase
    .from('lab_work_orders')
    .select('status, lab_estimated_delivery_date')
    .in('status', ['ordered', 'sent_to_lab', 'in_progress_lab']);

  if (branchId) {
    workOrdersQuery = workOrdersQuery.eq('branch_id', branchId);
  }

  const { data: workOrders } = await workOrdersQuery;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdueWorkOrders = workOrders?.filter((wo) => {
    if (!wo.lab_estimated_delivery_date) return false;
    const deliveryDate = new Date(wo.lab_estimated_delivery_date);
    return deliveryDate < today;
  }).length || 0;

  // Get pending quotes
  let quotesQuery = supabase
    .from('quotes')
    .select('status, converted_to_work_order_id')
    .in('status', ['draft', 'sent'])
    .is('converted_to_work_order_id', null);

  if (branchId) {
    quotesQuery = quotesQuery.eq('branch_id', branchId);
  }

  const { data: quotes } = await quotesQuery;
  const pendingQuotes = quotes?.length || 0;

  return {
    yesterdaySales: Math.round(yesterdaySales),
    monthlyAverage: Math.round(monthlyAverage),
    overdueWorkOrders,
    pendingQuotes,
  };
}

async function generateInsightsForSection(section, userEmail) {
  console.log(`\n🚀 Generando insights para sección: ${section}`);
  console.log(`📧 Usuario: ${userEmail}\n`);

  try {
    const { userId, organizationId, organizationName } = await getOrganizationForUser(userEmail);
    console.log(`✅ Organización encontrada: ${organizationName} (${organizationId})`);

    // Prepare data based on section
    let data = {};
    
    if (section === 'dashboard') {
      data = await prepareDashboardData(organizationId);
      console.log(`📊 Datos preparados:`, JSON.stringify(data, null, 2));
    } else {
      console.log(`⚠️  Sección ${section} requiere implementación de prepare-data`);
      console.log(`   Por ahora, usa el botón en el widget o la consola del navegador`);
      return;
    }

    // Call the API to generate insights (simpler approach)
    console.log(`\n🤖 Generando insights con IA...`);
    console.log(`   Nota: Este script requiere que el servidor Next.js esté corriendo`);
    console.log(`   Usa el botón en el widget o la consola del navegador para generar insights\n`);
    
    console.log(`💡 Alternativa: Usa la consola del navegador:`);
    console.log(`   generateInsights('${section}');\n`);

  } catch (error) {
    console.error(`\n❌ Error:`, error.message);
    console.error(error.stack);
    throw error;
  }
}

// Main
const sectionArg = process.argv[2];
const userEmail = process.argv[3] || process.env.DEMO_ADMIN_EMAIL || '';

const sectionsToProcess = sectionArg ? [sectionArg] : sections;

if (sectionArg && !sections.includes(sectionArg)) {
  console.error(`❌ Sección inválida: ${sectionArg}`);
  console.error(`   Secciones válidas: ${sections.join(', ')}`);
  process.exit(1);
}

console.log('🤖 Script de Generación de Insights de IA (Versión Simplificada)');
console.log('=' .repeat(60));
console.log(`📧 Usuario: ${userEmail}`);
console.log(`📂 Sección: ${sectionArg || 'todas'}`);
console.log('=' .repeat(60));
console.log(`\n💡 RECOMENDACIÓN: Usa el botón en el widget flotante o la consola del navegador`);
console.log(`   El widget ahora muestra un botón "Generar" cuando no hay insights\n`);

(async () => {
  try {
    for (const section of sectionsToProcess) {
      await generateInsightsForSection(section, userEmail);
    }
    console.log('\n✅ Script completado');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
})();
