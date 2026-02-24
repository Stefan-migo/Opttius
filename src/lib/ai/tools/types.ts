import type { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ToolExecutionContext {
  userId: string;
  organizationId: string;
  supabase: SupabaseClient<any>;
  currency?: string;

  // New context for Super Admin awareness
  userData?: {
    role?: string;
    isSuperAdmin?: boolean;
    name?: string;
  };
  currentBranchId?: string | null; // null for global/unselected

  /** When true, skip logAdminActivity (e.g. WhatsApp customer - no auth.uid()) */
  skipAdminActivityLog?: boolean;
  /** Customer ID when context is WhatsApp customer (for customer-scoped tools) */
  customerId?: string | null;
}

export interface ToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ToolError {
  code: string;
  message: string;
  details?: any;
}

export type ToolFunction<TParams = any, TResult = any> = (
  params: TParams,
  context: ToolExecutionContext,
) => Promise<ToolResult<TResult>>;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: ToolFunction;
  requiresConfirmation?: boolean;
  category?: string;
  /** Optional Zod schema for validating tool parameters before execution */
  zodSchema?: z.ZodTypeAny;
}
