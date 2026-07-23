/**
 * Service Role Client for Admin Operations
 *
 * This module exports the createServiceRoleClient function which creates
 * a Supabase client with service role privileges, bypassing Row Level Security (RLS).
 *
 * Use this client only in server-side code for administrative operations.
 * Never expose the service role key to the client.
 */

export { createServiceRoleClient } from "./server";
