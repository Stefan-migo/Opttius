import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";
import {
  getProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api/services/adminProductService";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await getProduct(request, id);
  } catch (error) {
    logger.error("API error in products GET", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await updateProduct(request, id);
  } catch (error) {
    logger.error("API error in products PUT", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    return await deleteProduct(request, id);
  } catch (error) {
    logger.error("API error in products DELETE", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
