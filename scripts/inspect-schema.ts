import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTables() {
  const tables = [
    "categories",
    "profiles",
    "orders",
    "products",
    "order_items",
    "organizations",
    "support_tickets",
  ];

  for (const table of tables) {
    console.log(`\n--- Inspecting [${table}] ---`);
    const { data: sample, error } = await supabase
      .from(table)
      .select("*")
      .limit(1);

    if (error) {
      console.log(`❌ Error querying table: ${error.message}`);
      continue;
    }

    if (sample && sample.length > 0) {
      console.log("Columns found in sample row:");
      console.log(Object.keys(sample[0]).join(", "));
    } else {
      console.log(
        "Empty table, checking with standard select (might still show error if column missing)",
      );
      // Try to select common columns to see which ones fail
      const testColumns = ["id", "organization_id", "created_at"];
      for (const col of testColumns) {
        const { error: colError } = await supabase
          .from(table)
          .select(col)
          .limit(1);
        process.stdout.write(`- ${col}: ${colError ? "❌" : "✅"} `);
        if (colError) console.log(`(${colError.message})`);
        else console.log("");
      }
    }
  }
}

inspectTables();
