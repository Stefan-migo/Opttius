import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  let zone_id: string | null = null;
  let weight: number | undefined = undefined;
  let price: number | undefined = undefined;
  try {
    const body = await request.json();
    zone_id = body.zone_id;
    weight = body.weight;
    price = body.price;

    if (!zone_id) {
      return NextResponse.json(
        { error: "zone_id is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get active rates for the zone
    const { data: rates, error } = await supabase
      .from("shipping_rates")
      .select("*")
      .eq("zone_id", zone_id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch rates" },
        { status: 500 },
      );
    }

    // Calculate shipping cost based on rate type
    const applicableRates =
      rates?.filter((rate) => {
        // Check weight constraints
        if (weight !== undefined && weight !== null) {
          if (rate.min_weight && weight < rate.min_weight) return false;
          if (rate.max_weight && weight > rate.max_weight) return false;
        }

        // Check price constraints
        if (price !== undefined && price !== null) {
          if (rate.min_price && price < rate.min_price) return false;
          if (rate.max_price && price > rate.max_price) return false;
        }

        // Check free shipping threshold
        if (
          rate.free_shipping_threshold &&
          price &&
          price >= rate.free_shipping_threshold
        ) {
          return true; // Free shipping applies
        }

        return true;
      }) || [];

    // Calculate costs
    const calculatedRates = applicableRates.map((rate) => {
      let cost = 0;

      if (rate.rate_type === "flat") {
        cost = rate.flat_rate || 0;
      } else if (rate.rate_type === "weight" && weight) {
        cost = (rate.weight_rate_per_kg || 0) * weight;
      } else if (rate.rate_type === "price" && price) {
        cost = (price * (rate.price_rate_percentage || 0)) / 100;
      } else if (rate.rate_type === "free") {
        cost = 0;
      }

      // Apply free shipping threshold
      if (
        rate.free_shipping_threshold &&
        price &&
        price >= rate.free_shipping_threshold
      ) {
        cost = 0;
      }

      return {
        rate_id: rate.id,
        rate_name: rate.name,
        cost: Math.max(0, cost),
        estimated_days_min: rate.estimated_days_min,
        estimated_days_max: rate.estimated_days_max,
      };
    });

    return NextResponse.json({
      rates: calculatedRates,
      cheapest:
        calculatedRates.length > 0
          ? calculatedRates.reduce(
              (min, r) => (r.cost < min.cost ? r : min),
              calculatedRates[0],
            )
          : null,
    });
  } catch (error) {
    logger.error("Error in shipping calculate API:", {
      error,
      zoneId: zone_id,
      weight,
      price,
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
