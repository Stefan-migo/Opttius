import type { ToolResult } from "../types";

export async function executeCustomerImport(
  supabase: unknown,
  organizationId: string,
  branchId: string,
  headers: string[],
  rows: Record<string, string | number | null>[],
  columnMapping: Record<string, string>,
): Promise<ToolResult> {
  let imported = 0;
  const failed: Array<{ row: number; error: string }> = [];

  // Resolve column key: mapping key may differ by case/trim from actual header
  const resolveVal = (
    row: Record<string, string | number | null>,
    fileCol: string,
  ): string | number | null => {
    const normalized = String(fileCol || "")
      .trim()
      .toLowerCase();
    const match = headers.find(
      (h) =>
        String(h || "")
          .trim()
          .toLowerCase() === normalized,
    );
    return match != null ? (row[match] ?? null) : null;
  };

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = rows[i];
      const mapped: Record<string, unknown> = {};
      for (const [fileCol, opttiusField] of Object.entries(columnMapping)) {
        const val = resolveVal(row, fileCol);
        if (val !== null && val !== undefined && String(val).trim()) {
          mapped[opttiusField] = String(val).trim();
        }
      }

      const firstName =
        mapped.first_name || mapped.name?.split(" ")[0] || "Cliente";
      const lastName =
        mapped.last_name ||
        mapped.name?.split(" ").slice(1).join(" ") ||
        "Sin apellido";

      const { error } = await supabase.from("customers").insert({
        branch_id: branchId,
        organization_id: organizationId,
        first_name: firstName,
        last_name: lastName,
        email: mapped.email || null,
        phone: mapped.phone || null,
        rut: mapped.rut || null,
        address_line_1: mapped.address_line_1 || null,
        city: mapped.city || null,
        country: mapped.country || null,
        is_active: true,
      });

      if (error) {
        failed.push({ row: i + 2, error: error.message });
      } else {
        imported++;
      }
    } catch (e: unknown) {
      failed.push({
        row: i + 2,
        error: e?.message || "Validation error",
      });
    }
  }

  return {
    success: true,
    data: {
      imported,
      failed: failed.length,
      errors: failed.slice(0, 10),
    },
    message: `Imported ${imported} customers. ${failed.length} failed.`,
  };
}
