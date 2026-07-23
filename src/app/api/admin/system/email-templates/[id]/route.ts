import { NextRequest, NextResponse } from "next/server";

import { handleDeleteTemplate } from "./emailTemplateDeleteService";
import { handleGetTemplate } from "./emailTemplateGetService";
import { handleUpdateTemplate } from "./emailTemplateUpdateService";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try { return await handleGetTemplate(request, params); }
  catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try { return await handleUpdateTemplate(request, params); }
  catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try { return await handleDeleteTemplate(request, params); }
  catch { return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
