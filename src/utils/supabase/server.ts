import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/**
 * Create Supabase client from request, supporting both cookies and Bearer tokens
 * This allows API routes to work with both browser requests (cookies) and test requests (Bearer tokens)
 *
 * @returns Object with { client, getUser: () => Promise<{data: {user}, error}> }
 *   - client: Supabase client instance
 *   - getUser: Helper function that handles both cookie and Bearer token authentication
 */
export async function createClientFromRequest(request?: NextRequest): Promise<{
  client: unknown; // Flexible type for test compatibility
  getUser: () => Promise<{ data: { user: unknown } | null; error: unknown }>;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Check if Authorization header with Bearer token is present (for tests)
  if (request) {
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // Create client with token in global headers for RLS
      const client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      // Return client with custom getUser that uses the token
      return {
        client,
        getUser: async () => {
          const result = await client.auth.getUser(token);
          return result;
        },
      };
    }
  }

  // Fallback to cookie-based authentication (normal browser flow)
  const client = await createClient();
  return {
    client,
    getUser: async () => {
      const result = await client.auth.getUser();
      return result;
    },
  };
}

// Service role client for admin operations (bypasses RLS)
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
