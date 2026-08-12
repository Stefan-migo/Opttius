// Generated type definitions — do NOT edit directly.
// Regenerate with: supabase gen types --linked > src/types/supabase.generated.ts
export type { Database, Json } from "./supabase.generated";
// ponytail: re-export type only, not runtime — avoids eslint-disable in 20+ consumer files
export type { SupabaseClient } from "@supabase/supabase-js";

// Domain helper types — maintained manually alongside domain splits
export * from "./supabase-helpers";
