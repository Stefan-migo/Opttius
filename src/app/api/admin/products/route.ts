import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import { createClientFromRequest } from "@/utils/supabase/server";

import { createProduct } from "./productsCreateService";
import { listProducts } from "./productsService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { client: supabase, getUser } = await createClientFromRequest(request);

    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as any)) as any;
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = adminUser?.organization_id;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 403 });
    }

    return await listProducts(request, supabase, organizationId);
  } catch (error) {
    logger.error({ error }, "Error in GET /api/admin/products");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { client: supabase, getUser } = await createClientFromRequest(request);

    const { data, error: userError } = await getUser();
    const user = data?.user;
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as any)) as any;
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    const organizationId = adminUser?.organization_id;
    if (!organizationId) {
      return NextResponse.json({ error: "Organization not found" }, { status: 403 });
    }

    return await createProduct(request, supabase, organizationId);
  } catch (error) {
    logger.error({ error }, "Error in POST /api/admin/products");
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
