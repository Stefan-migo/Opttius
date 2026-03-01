import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/utils/supabase/server";
import { appLogger as logger } from "@/lib/logger";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

/**
 * POST /api/admin/chat/upload-import-file
 * Upload CSV/Excel for AI-assisted bulk import.
 * Returns fileId (storage path), filename, rowCount, headers.
 */
export const dynamic = "force-dynamic";

function parseCSVHeaders(text: string): {
  headers: string[];
  rowCount: number;
} {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rowCount: 0 };
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));
  return { headers, rowCount: Math.max(0, lines.length - 1) };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    const { data: adminUser } = await supabase
      .from("admin_users")
      .select("organization_id")
      .eq("id", user.id)
      .eq("is_active", true)
      .single();

    if (!adminUser?.organization_id) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum 5MB." },
        { status: 400 },
      );
    }

    const mimeType = file.type;
    const isCSV =
      mimeType === "text/csv" || file.name.toLowerCase().endsWith(".csv");
    const isExcel =
      mimeType ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mimeType === "application/vnd.ms-excel" ||
      file.name.toLowerCase().endsWith(".xlsx") ||
      file.name.toLowerCase().endsWith(".xls");

    if (!isCSV && !isExcel) {
      return NextResponse.json(
        { error: "Only CSV and Excel (.xlsx, .xls) files are allowed" },
        { status: 400 },
      );
    }

    const fileId = crypto.randomUUID();
    const ext = isCSV
      ? "csv"
      : file.name.toLowerCase().endsWith(".xls")
        ? "xls"
        : "xlsx";
    const storagePath = `${adminUser.organization_id}/${fileId}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const storageClient = createServiceRoleClient();
    const { error: uploadError } = await storageClient.storage
      .from("import-temp")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      logger.error("Upload import file failed", {
        error: uploadError,
        message: uploadError.message,
        bucket: "import-temp",
      });
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    let headers: string[] = [];
    let rowCount = 0;

    if (isCSV) {
      const text = new TextDecoder().decode(buffer);
      const parsed = parseCSVHeaders(text);
      headers = parsed.headers;
      rowCount = parsed.rowCount;
    } else {
      try {
        const XLSX = await import("xlsx");
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, {
          header: 1,
          defval: "",
        });
        if (data.length > 0 && Array.isArray(data[0])) {
          headers = (data[0] as string[]).map((h) => String(h || "").trim());
        }
        rowCount = Math.max(0, data.length - 1);
      } catch (e) {
        logger.warn("Could not parse Excel for preview", { e });
      }
    }

    return NextResponse.json({
      fileId: storagePath,
      filename: file.name,
      rowCount,
      headers,
    });
  } catch (err: any) {
    logger.error("Upload import file error", { error: err?.message });
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
