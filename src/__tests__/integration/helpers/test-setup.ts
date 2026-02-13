/**
 * Test Helpers for Integration Tests
 *
 * Provides utilities to create test data (organizations, users, etc.)
 * for multi-tenancy validation tests
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Create a service role client for tests (uses local Supabase)
 */
function createTestServiceRoleClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
// Use any for tables that might not be in the Database type yet
type Organization = any; // Tables<"organizations">;
type AdminUser = any; // Tables<"admin_users">;
type Branch = any; // Tables<"branches">;
type Customer = any; // Tables<"customers">;
type Product = any; // Tables<"products">;
type Order = any; // Tables<"orders">;

export interface TestOrganization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: "basic" | "pro" | "premium";
}

export interface TestUser {
  id: string;
  email: string;
  organization_id: string;
  authToken?: string;
  sessionData?: {
    session?: {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
      token_type?: string;
    };
    user?: any;
  };
}

export interface TestBranch {
  id: string;
  name: string;
  code: string;
  organization_id: string;
}

/**
 * Check if multi-tenancy infrastructure is available
 */
export async function isMultiTenancyAvailable(): Promise<boolean> {
  try {
    const supabase = createTestServiceRoleClient();
    // Try to query the organizations table
    const { error, data } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (error) {
      console.log(
        `[Test Setup] Organizations table check failed: ${error.message}`,
      );
      return false;
    }

    console.log(
      `[Test Setup] Multi-tenancy infrastructure available: ${!error}`,
    );
    return !error;
  } catch (err: any) {
    console.log(
      `[Test Setup] Exception checking multi-tenancy: ${err?.message}`,
    );
    return false;
  }
}

/**
 * Create a test organization
 */
export async function createTestOrganization(
  name: string = `Test Org ${Date.now()}`,
  subscription_tier: "basic" | "pro" | "premium" = "basic",
): Promise<TestOrganization> {
  const supabase = createTestServiceRoleClient();

  const slug = name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      subscription_tier,
      status: "active",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test organization: ${error?.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    subscription_tier: data.subscription_tier as "basic" | "pro" | "premium",
  };
}

/**
 * Create a test user with auth and admin_users entry
 */
export async function createTestUser(
  organizationId: string,
  email: string = `test-${Date.now()}@test.com`,
  role: string = "admin",
): Promise<TestUser> {
  const supabase = createTestServiceRoleClient();

  // Create auth user
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: "TestPassword123!",
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  // Create admin_users entry (role: 'admin' after simplify_admin_roles; otherwise 'store_manager' for old schema)
  let adminUser: unknown = null;
  let adminError: { message?: string; code?: string } | null = null;
  const insertAdmin = (r: string) =>
    supabase
      .from("admin_users")
      .insert({
        id: authUser.user.id,
        email,
        role: r,
        organization_id: organizationId,
        is_active: true,
      })
      .select()
      .single();

  let result = await insertAdmin(role);
  adminUser = result.data;
  adminError = result.error;
  if (adminError?.code === "23514" && role === "admin") {
    result = await insertAdmin("store_manager");
    adminUser = result.data;
    adminError = result.error;
  }

  if (adminError || !adminUser) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create admin user: ${adminError?.message}`);
  }

  // Get auth token for API calls
  const { data: sessionData, error: sessionError } =
    await supabase.auth.signInWithPassword({
      email,
      password: "TestPassword123!",
    });

  if (sessionError || !sessionData?.session) {
    // Cleanup if session creation fails
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create session: ${sessionError?.message}`);
  }

  return {
    id: authUser.user.id,
    email,
    organization_id: organizationId,
    authToken: sessionData.session.access_token,
    sessionData: {
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        token_type: sessionData.session.token_type,
      },
      user: sessionData.user,
    },
  };
}

/**
 * Create a test branch
 */
export async function createTestBranch(
  organizationId: string,
  name: string = `Test Branch ${Date.now()}`,
  code: string = `TEST-${Date.now()}`,
): Promise<TestBranch> {
  const supabase = createTestServiceRoleClient();

  const { data, error } = await supabase
    .from("branches")
    .insert({
      name,
      code,
      organization_id: organizationId,
      is_active: true,
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test branch: ${error?.message}`);
  }

  return {
    id: data.id,
    name: data.name,
    code: data.code,
    organization_id: data.organization_id!,
  };
}

/**
 * Assign branch access to a test user
 */
export async function assignTestUserBranchAccess(
  userId: string,
  branchId: string,
  role: string = "manager",
  isPrimary: boolean = true,
): Promise<void> {
  const supabase = createTestServiceRoleClient();

  const { error } = await supabase.from("admin_branch_access").upsert(
    {
      admin_user_id: userId,
      branch_id: branchId,
      role,
      is_primary: isPrimary,
    },
    {
      onConflict: "admin_user_id,branch_id",
    },
  );

  if (error) {
    throw new Error(`Failed to assign branch access: ${error.message}`);
  }
}

/**
 * Create a test customer
 */
export async function createTestCustomer(
  organizationId: string,
  branchId: string,
  data: Partial<Customer> = {},
): Promise<Customer> {
  const supabase = createTestServiceRoleClient();

  const { data: customerData, error } = await supabase
    .from("customers")
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      first_name: data.first_name || "Test",
      last_name: data.last_name || "Customer",
      email: data.email || `customer-${Date.now()}@test.com`,
      ...data,
    })
    .select()
    .single();

  if (error || !customerData) {
    throw new Error(`Failed to create test customer: ${error?.message}`);
  }

  return customerData;
}

/**
 * Create a test product
 */
export async function createTestProduct(
  organizationId: string,
  branchId: string,
  data: Partial<Product> = {},
): Promise<Product> {
  const supabase = createTestServiceRoleClient();

  const { data: productData, error } = await supabase
    .from("products")
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      name: data.name || `Test Product ${Date.now()}`,
      slug: data.slug || `test-product-${Date.now()}`,
      price: data.price || 10000,
      currency: data.currency || "CLP",
      status: data.status || "active",
      ...data,
    })
    .select()
    .single();

  if (error || !productData) {
    throw new Error(`Failed to create test product: ${error?.message}`);
  }

  return productData;
}

/**
 * Create a test order
 */
export async function createTestOrder(
  organizationId: string,
  branchId: string,
  data: Partial<Order> = {},
): Promise<Order> {
  const supabase = createTestServiceRoleClient();

  // Generate unique order number
  const orderNumber = `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const { data: orderData, error } = await supabase
    .from("orders")
    .insert({
      organization_id: organizationId,
      branch_id: branchId,
      order_number: orderNumber,
      email: data.email || `order-${Date.now()}@test.com`,
      subtotal: data.subtotal || 10000,
      tax_amount: data.tax_amount || 0,
      shipping_amount: data.shipping_amount || 0,
      discount_amount: data.discount_amount || 0,
      total_amount: data.total_amount || 10000,
      currency: data.currency || "CLP",
      status: data.status || "pending",
      payment_status: data.payment_status || "pending",
      ...data,
    })
    .select()
    .single();

  if (error || !orderData) {
    throw new Error(`Failed to create test order: ${error?.message}`);
  }

  return orderData;
}

/**
 * Create a root/dev user for testing
 */
export async function createTestRootUser(
  email: string = `root-${Date.now()}@opttius.com`,
  role: "root" | "dev" = "root",
): Promise<TestUser> {
  const supabase = createTestServiceRoleClient();

  // Create auth user
  const { data: authUser, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password: "TestPassword123!",
      email_confirm: true,
    });

  if (authError || !authUser.user) {
    throw new Error(`Failed to create auth user: ${authError?.message}`);
  }

  // Create admin_users entry with root/dev role (no organization_id for root/dev)
  const { data: adminUser, error: adminError } = await supabase
    .from("admin_users")
    .insert({
      id: authUser.user.id,
      email,
      role,
      organization_id: null, // Root/dev users don't belong to an organization
      is_active: true,
    })
    .select()
    .single();

  if (adminError || !adminUser) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create root user: ${adminError?.message}`);
  }

  // Get auth token for API calls
  const { data: sessionData, error: sessionError } =
    await supabase.auth.signInWithPassword({
      email,
      password: "TestPassword123!",
    });

  if (sessionError || !sessionData?.session) {
    await supabase.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create session: ${sessionError?.message}`);
  }

  return {
    id: authUser.user.id,
    email,
    organization_id: "", // Root users don't have organization
    authToken: sessionData.session.access_token,
    sessionData: {
      session: {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_at: sessionData.session.expires_at,
        token_type: sessionData.session.token_type,
      },
      user: sessionData.user,
    },
  };
}

/**
 * Cleanup test data
 */
export async function cleanupTestData(organizationId: string): Promise<void> {
  const supabase = createTestServiceRoleClient();

  // Get all users in organization
  const { data: users } = await supabase
    .from("admin_users")
    .select("id")
    .eq("organization_id", organizationId);

  // Delete auth users
  if (users) {
    for (const user of users) {
      await supabase.auth.admin.deleteUser(user.id);
    }
  }

  // Delete organization (cascade will delete related data)
  await supabase.from("organizations").delete().eq("id", organizationId);
}

/**
 * Cleanup root user
 */
export async function cleanupRootUser(userId: string): Promise<void> {
  const supabase = createTestServiceRoleClient();
  await supabase.auth.admin.deleteUser(userId);
}

/**
 * Make authenticated API request
 * Note: Next.js API routes use cookies for auth, not Bearer tokens
 * We need to set the session cookie manually with the correct format
 */
export async function makeAuthenticatedRequest(
  url: string,
  options: RequestInit = {},
  authToken?: string,
  sessionData?: {
    session?: {
      access_token: string;
      refresh_token?: string;
      expires_at?: number;
      token_type?: string;
    };
    user?: any;
  },
): Promise<Response> {
  const headers = new Headers(options.headers);

  // For Next.js API routes, we need to set the session cookie
  // The cookie format for Supabase SSR is an array with session object
  if (authToken && sessionData?.session) {
    // Extract project ref from Supabase URL
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

    // For local Supabase, the project ref is sanitized
    // Based on logs, Supabase SSR uses "127" for localhost, not "127-0-0-1-54321"
    let projectRef: string;
    if (
      supabaseUrl.includes("localhost") ||
      supabaseUrl.includes("127.0.0.1")
    ) {
      projectRef = "127"; // Simplified format for localhost (matches Supabase SSR behavior)
    } else {
      // Extract from URL (e.g., https://xyz.supabase.co -> xyz)
      const match = supabaseUrl.match(/https?:\/\/([^.]+)/);
      projectRef = match ? match[1] : "default";
    }

    const cookieName = `sb-${projectRef}-auth-token`;

    // Create cookie with complete session data in Supabase SSR format
    // Format: [{ access_token, refresh_token, expires_at, token_type, user }]
    const cookieValue = JSON.stringify([
      {
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token || "",
        expires_at:
          sessionData.session.expires_at ||
          Math.floor(Date.now() / 1000) + 3600, // Default: 1 hour from now
        token_type: sessionData.session.token_type || "bearer",
        user: sessionData.user || {},
      },
    ]);

    headers.set("Cookie", `${cookieName}=${encodeURIComponent(cookieValue)}`);
    // Also set Authorization header for API routes that support Bearer tokens
    headers.set("Authorization", `Bearer ${authToken}`);
  } else if (authToken) {
    // Fallback: if only token is provided, create minimal session data
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";

    let projectRef: string;
    if (
      supabaseUrl.includes("localhost") ||
      supabaseUrl.includes("127.0.0.1")
    ) {
      projectRef = "127-0-0-1-54321";
    } else {
      const match = supabaseUrl.match(/https?:\/\/([^.]+)/);
      projectRef = match ? match[1] : "default";
    }

    const cookieName = `sb-${projectRef}-auth-token`;
    const cookieValue = JSON.stringify([
      {
        access_token: authToken,
        refresh_token: "",
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: {},
      },
    ]);

    headers.set("Cookie", `${cookieName}=${encodeURIComponent(cookieValue)}`);
    // Also set Authorization header for API routes that support Bearer tokens
    headers.set("Authorization", `Bearer ${authToken}`);
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: "include", // Include cookies
  });
}
