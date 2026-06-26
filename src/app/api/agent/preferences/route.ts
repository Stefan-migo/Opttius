/**
 * GET/PATCH /api/agent/preferences — Agent user preferences (stub).
 *
 * Phase 2b: returns empty defaults. Phase 4 will wire localStorage sync
 * and the agent_user_prefs table.
 *
 * @module api/agent/preferences
 */

import { NextRequest } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

// ponytail: stub — returns default prefs. Expand when Phase 4 builds the prefs UI.
const DEFAULT_PREFERENCES = {
  auto_mode: false,
  bubble_position: "floating",
  agent_tone: "professional",
};

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(DEFAULT_PREFERENCES), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    logger.error("Agent preferences GET error", { error });
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ponytail: stub — accept body but return defaults.
    // Phase 4 will persist to localStorage or agent_user_prefs table.
    const body = await request.json();

    return new Response(
      JSON.stringify({ ...DEFAULT_PREFERENCES, ...body, saved: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    logger.error("Agent preferences PATCH error", { error });
    return new Response(JSON.stringify({ error: "Error interno" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
