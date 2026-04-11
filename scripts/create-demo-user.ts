/**
 * Script: Create Demo User Pipeline
 *
 * Creates a complete demo user flow: demo request → approved → user with org access
 * Bypasses email invitation for local testing
 *
 * Usage: npx tsx scripts/create-demo-user.ts
 */

import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Configuration
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Error: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY is not set",
  );
  process.exit(1);
}

// Create service role client (bypasses RLS)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Demo user configuration
const DEMO_EMAIL = "TestLead@test.com";
const DEMO_PASSWORD = "TestPass123";
const DEMO_FULL_NAME = "Test Lead";
const DEMO_OPTICA_NAME = "Óptica Test Lead";

async function main() {
  console.log("🚀 Starting demo user creation pipeline...\n");

  try {
    // Step 1: Create demo_request entry
    console.log("📝 Step 1: Creating demo_request...");

    const { data: existingRequest } = await supabase
      .from("demo_requests")
      .select("id, status")
      .eq("email", DEMO_EMAIL.toLowerCase())
      .maybeSingle();

    let requestId: string;

    if (existingRequest) {
      console.log(
        `  - Found existing request: ${existingRequest.id} (status: ${existingRequest.status})`,
      );
      requestId = existingRequest.id;

      // Reset status to pending if needed
      if (existingRequest.status !== "pending") {
        await supabase
          .from("demo_requests")
          .update({ status: "pending", funnel_stage: "pending" })
          .eq("id", requestId);
        console.log("  - Reset status to pending");
      }
    } else {
      const { data: newRequest, error: requestError } = await supabase
        .from("demo_requests")
        .insert({
          email: DEMO_EMAIL.toLowerCase(),
          full_name: DEMO_FULL_NAME,
          optica_name: DEMO_OPTICA_NAME,
          phone: "+56912345678",
          source: "script",
          status: "pending",
          funnel_stage: "pending",
          metadata: {
            created_by_script: true,
            created_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (requestError)
        throw new Error(
          `Failed to create demo request: ${requestError.message}`,
        );
      requestId = newRequest.id;
      console.log(`  - Created demo_request: ${requestId}`);
    }

    // Step 2: Check if user already exists in auth.users
    console.log("\n👤 Step 2: Checking/Creating user in Supabase Auth...");

    const { data: existingUser } = await supabase.rpc(
      "get_auth_user_id_by_email",
      {
        p_email: DEMO_EMAIL.toLowerCase(),
      },
    );

    let userId: string;

    if (existingUser) {
      const existingUserId =
        typeof existingUser === "string"
          ? existingUser
          : (existingUser as { id?: string })?.id;
      if (!existingUserId)
        throw new Error("Could not resolve existing user ID");
      userId = existingUserId;
      console.log(`  - Found existing auth user: ${userId}`);
    } else {
      // Create user directly with password (bypassing email invite)
      const { data: newUser, error: userError } =
        await supabase.auth.admin.createUser({
          email: DEMO_EMAIL.toLowerCase(),
          password: DEMO_PASSWORD,
          email_confirm: true, // Auto-confirm email for local testing
          user_metadata: {
            full_name: DEMO_FULL_NAME,
          },
        });

      if (userError)
        throw new Error(`Failed to create auth user: ${userError.message}`);
      if (!newUser.user?.id) throw new Error("Created user has no id");
      userId = newUser.user.id;
      console.log(`  - Created auth user: ${userId}`);
    }

    // Step 3: Create profile if not exists
    console.log("\n👤 Step 3: Creating/Updating profile...");

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        email: DEMO_EMAIL.toLowerCase(),
        first_name: DEMO_FULL_NAME.split(" ")[0],
        last_name: DEMO_FULL_NAME.split(" ").slice(1).join(" ") || "Demo",
        phone: "+56912345678",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

    if (profileError)
      console.log(`  - Profile upsert warning: ${profileError.message}`);
    else console.log("  - Profile created/updated");

    // Step 4: Create demo organization using the existing function
    console.log("\n🏢 Step 4: Creating demo organization...");

    const { data: orgId, error: orgError } = await supabase.rpc(
      "create_demo_organization_for_user",
      { p_user_id: userId, p_demo_type: "organic" },
    );

    if (orgError)
      throw new Error(`Failed to create demo org: ${orgError.message}`);
    console.log(`  - Created demo organization: ${orgId}`);

    // Step 5: Update demo_request to approved
    console.log("\n✅ Step 5: Updating demo_request to approved...");

    const now = new Date().toISOString();
    const demoExpires = new Date();
    demoExpires.setDate(demoExpires.getDate() + 7);

    const { error: updateError } = await supabase
      .from("demo_requests")
      .update({
        status: "approved",
        funnel_stage: "approved",
        reviewed_at: now,
        organization_id: orgId,
        demo_started_at: now,
        demo_expires_at: demoExpires.toISOString(),
        last_contact_at: now,
      })
      .eq("id", requestId);

    if (updateError)
      throw new Error(`Failed to update demo request: ${updateError.message}`);
    console.log("  - Demo request marked as approved");

    // Step 6: Create admin_users entry
    console.log("\n🔐 Step 6: Creating admin_users entry...");

    const { error: adminUserError } = await supabase
      .from("admin_users")
      .insert({
        id: userId,
        email: DEMO_EMAIL.toLowerCase(),
        role: "admin",
        organization_id: orgId,
        is_active: true,
        created_at: now,
        updated_at: now,
      })
      .select();

    if (adminUserError) {
      // Check if it already exists
      if (adminUserError.message.includes("duplicate")) {
        console.log("  - admin_users entry already exists, updating...");
        await supabase
          .from("admin_users")
          .update({
            role: "admin",
            organization_id: orgId,
            is_active: true,
            updated_at: now,
          })
          .eq("id", userId);
      } else {
        throw new Error(
          `Failed to create admin_users: ${adminUserError.message}`,
        );
      }
    }
    console.log("  - admin_users entry created/updated");

    // Step 7: Create admin_branch_access for all branches in the org
    console.log(
      "\n🏪 Step 7: Creating admin_branch_access for all branches...",
    );

    const { data: branches } = await supabase
      .from("branches")
      .select("id")
      .eq("organization_id", orgId);

    if (branches && branches.length > 0) {
      for (const branch of branches) {
        const { error: branchAccessError } = await supabase
          .from("admin_branch_access")
          .upsert(
            {
              admin_user_id: userId,
              branch_id: branch.id,
              is_active: true,
              created_at: now,
              updated_at: now,
            },
            {
              onConflict: "admin_user_id,branch_id",
            },
          );

        if (branchAccessError) {
          console.log(
            `  - Warning: could not create branch access for ${branch.id}: ${branchAccessError.message}`,
          );
        }
      }
      console.log(`  - Created branch access for ${branches.length} branches`);
    } else {
      // If no branches exist, create access without specific branch (super admin within org)
      const { error: branchAccessError } = await supabase
        .from("admin_branch_access")
        .upsert(
          {
            admin_user_id: userId,
            branch_id: null, // Super admin for the org
            is_active: true,
            created_at: now,
            updated_at: now,
          },
          {
            onConflict: "admin_user_id,branch_id",
          },
        );

      if (branchAccessError) {
        console.log(
          `  - Warning: could not create org-wide access: ${branchAccessError.message}`,
        );
      } else {
        console.log("  - Created org-wide access (no branches)");
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ Demo user pipeline completed successfully!");
    console.log("=".repeat(60));
    console.log("\n📋 Credentials:");
    console.log(`   Email:    ${DEMO_EMAIL}`);
    console.log(`   Password: ${DEMO_PASSWORD}`);
    console.log(`\n🌐 Login URL: http://127.0.0.1:3000/login`);
    console.log(`\n🏢 Demo Org ID: ${orgId}`);
    console.log(`   Demo Expires: ${demoExpires.toISOString()}`);
    console.log("\n" + "=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
