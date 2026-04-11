import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient();

    const { data: zone, error } = await supabase
      .from("shipping_zones")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      return NextResponse.json({ error: "Zone not found" }, { status: 404 });
    }

    return NextResponse.json({ zone });
  } catch (error) {
    logger.error("Error in get shipping zone API:", {
      error,
      zoneId: params.id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updateData: {
      updated_at: string;
      name?: string;
      description?: string;
      countries?: string[];
      states?: string[];
      cities?: string[];
      is_active?: boolean;
      sort_order?: number;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.countries !== undefined)
      updateData.countries = Array.isArray(body.countries)
        ? body.countries
        : [body.countries];
    if (body.states !== undefined)
      updateData.states = Array.isArray(body.states)
        ? body.states
        : body.states
          ? [body.states]
          : [];
    if (body.cities !== undefined)
      updateData.cities = Array.isArray(body.cities)
        ? body.cities
        : body.cities
          ? [body.cities]
          : [];
    if (body.postal_codes !== undefined)
      (updateData as unknown).postal_codes = Array.isArray(body.postal_codes)
        ? body.postal_codes
        : body.postal_codes
          ? [body.postal_codes]
          : [];
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;

    const { data: zone, error } = await supabase
      .from("shipping_zones")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      logger.error("Error updating shipping zone:", {
        error,
        zoneId: params.id,
      });
      return NextResponse.json(
        { error: "Failed to update shipping zone" },
        { status: 500 },
      );
    }

    return NextResponse.json({ zone });
  } catch (error) {
    logger.error("Error in update shipping zone API:", {
      error,
      zoneId: params.id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const { error } = await supabase
      .from("shipping_zones")
      .delete()
      .eq("id", params.id);

    if (error) {
      logger.error("Error deleting shipping zone:", {
        error,
        zoneId: params.id,
      });
      return NextResponse.json(
        { error: "Failed to delete shipping zone" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Zone deleted successfully",
    });
  } catch (error) {
    logger.error("Error in delete shipping zone API:", {
      error,
      zoneId: params.id,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
