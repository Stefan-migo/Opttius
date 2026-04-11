import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: zones, error } = await supabase
      .from("shipping_zones")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      logger.error("Error fetching shipping zones:", { error });
      return NextResponse.json(
        { error: "Failed to fetch shipping zones" },
        { status: 500 },
      );
    }

    return NextResponse.json({ zones: zones || [] });
  } catch (error) {
    logger.error("Error in shipping zones API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      countries = ["Argentina"],
      states = [],
      cities = [],
      postal_codes = [],
      is_active = true,
      sort_order = 0,
    } = body;

    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: zone, error } = await supabase
      .from("shipping_zones")
      .insert({
        name,
        description,
        countries: Array.isArray(countries) ? countries : [countries],
        states: Array.isArray(states) ? states : states ? [states] : [],
        cities: Array.isArray(cities) ? cities : cities ? [cities] : [],
        postal_codes: Array.isArray(postal_codes)
          ? postal_codes
          : postal_codes
            ? [postal_codes]
            : [],
        is_active,
        sort_order,
      })
      .select()
      .single();

    if (error) {
      logger.error("Error creating shipping zone:", { error, name });
      return NextResponse.json(
        { error: "Failed to create shipping zone" },
        { status: 500 },
      );
    }

    return NextResponse.json({ zone });
  } catch (error) {
    logger.error("Error in create shipping zone API:", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
