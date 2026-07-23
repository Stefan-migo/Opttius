import { NextRequest, NextResponse } from "next/server";

import { handleDeleteCustomer } from "./customersDetailDeleteService";
import { handleGetCustomer } from "./customersDetailGetService";
import { handleUpdateCustomer } from "./customersDetailUpdateService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await handleGetCustomer(request, params);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await handleUpdateCustomer(request, params);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    return await handleDeleteCustomer(request, params);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
