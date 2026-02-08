/**
 * AI Tool Tester Script
 * This script runs a basic test for all available AI tools by calling their execution logic directly.
 * It requires a valid Supabase context (usually mockable for direct logic test).
 */
import { allTools } from "../src/lib/ai/tools/index";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTools() {
  console.log("🚀 STARTING AI TOOLS TEST...");
  console.log("-----------------------------------");

  // Get a test organization and user (first ones found for testing)
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

  if (!org || !user) {
    console.error(
      "❌ ERROR: No organization or user found in DB to perform context tests.",
    );
    return;
  }

  const context = {
    userId: user.id,
    organizationId: org.id,
    supabase: supabase,
  };

  console.log(
    `📡 CONTEXT: Org[${context.organizationId}] User[${context.userId}]`,
  );
  console.log("-----------------------------------");

  const results = [];

  for (const tool of allTools) {
    process.stdout.write(
      `Testing [${tool.category || "General"}] ${tool.name}... `,
    );

    try {
      // Test basic list/get execution with default empty/default params
      // Most list tools should support empty params
      const response = await tool.execute({}, context);

      if (response.success) {
        console.log("✅ SUCCESS");
        results.push({
          name: tool.name,
          status: "PASS",
          category: tool.category,
        });
      } else {
        console.log(
          `⚠️ FAILED (App Error): ${response.error || "Unknown error"}`,
        );
        results.push({
          name: tool.name,
          status: "FAIL",
          category: tool.category,
          error: response.error,
        });
      }
    } catch (error: any) {
      console.log(`❌ CRASHED (Script Error): ${error.message}`);
      results.push({
        name: tool.name,
        status: "CRASH",
        category: tool.category,
        error: error.message,
      });
    }
  }

  console.log("-----------------------------------");
  console.log("📊 TEST SUMMARY:");
  const passed = results.filter((r) => r.status === "PASS").length;
  console.log(`✅ Passed: ${passed} / ${results.length}`);
  console.log(`❌ Failed/Crashed: ${results.length - passed}`);

  if (passed < results.length) {
    console.log("\n⚠️ FAILING TOOLS:");
    results
      .filter((r) => r.status !== "PASS")
      .forEach((r) => {
        console.log(`- ${r.name} (${r.category}): ${r.error}`);
      });
  }
}

testTools().catch((err) => {
  console.error("💥 TEST RUNNER CRASHED:", err);
  process.exit(1);
});
