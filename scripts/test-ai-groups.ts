/**
 * AI Grouped Tool Tester
 * Tests all AI tools grouped by logic categories.
 */
import { allTools } from "../src/lib/ai/tools/index";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: Missing credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const groups = {
  "GRUPO 1: INVENTARIO": [
    "getProducts",
    "getProductById",
    "createProduct",
    "updateProduct",
    "deleteProduct",
    "updateInventory",
    "getLowStockProducts",
    "getCategories",
    "getCategoryById",
    "createCategory",
    "updateCategory",
    "deleteCategory",
    "getCategoryTree",
  ],
  "GRUPO 2: VENTAS Y CLIENTES": [
    "getOrders",
    "getOrderById",
    "updateOrderStatus",
    "updatePaymentStatus",
    "getPendingOrders",
    "getOrderStats",
    "getCustomers",
    "getCustomerById",
    "updateCustomer",
    "getCustomerOrders",
    "getCustomerStats",
  ],
  "GRUPO 3: INTELIGENCIA": [
    "analyzeBusinessFlow",
    "analyzeMarketTrends",
    "optimizeInventory",
    "generateRecommendations",
    "getDashboardStats",
    "getRevenueTrend",
    "getTopProducts",
    "getSalesReport",
  ],
  "GRUPO 4: SOPORTE": [
    "diagnoseSystem",
    "getTickets",
    "getTicketById",
    "updateTicketStatus",
    "createTicketResponse",
  ],
};

async function runGroupedTest() {
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .limit(1)
    .single();
  const { data: user } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .single();

  if (!org || !user) return console.error("❌ Context not found");

  const context = { userId: user.id, organizationId: org.id, supabase };

  for (const [groupName, toolNames] of Object.entries(groups)) {
    console.log(`\n============== ${groupName} ==============`);
    for (const name of toolNames) {
      const tool = allTools.find((t) => t.name === name);
      if (!tool) {
        console.log(`- ${name}: ⚪ SKIPPED (Not found)`);
        continue;
      }
      process.stdout.write(`- ${name}: `);
      try {
        const res = await tool.execute({}, context);
        console.log(res.success ? "✅ PASS" : `⚠️ FAIL: ${res.error}`);
      } catch (e: any) {
        console.log(`❌ CRASH: ${e.message}`);
      }
    }
  }
}

runGroupedTest();
