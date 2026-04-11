import { NextRequest } from "next/server";
import { z } from "zod";

import { addBranchFilter, getBranchContext } from "@/lib/api/branch-middleware";
import { AuthenticationError, AuthorizationError } from "@/lib/api/errors";
import { appLogger as logger } from "@/lib/logger";
import { formatRUT } from "@/lib/utils/rut";
import type { IsAdminParams, IsAdminResult } from "@/types/supabase-rpc";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/server";

export const dynamic = "force-dynamic";

const MAX_EXPORT_ROWS = 10000;

const exportQuerySchema = z.object({
  format: z
    .string()
    .transform((v) => (v ? v.toLowerCase().trim() : "csv"))
    .refine((v) => v === "csv" || v === "xlsx", {
      message: "format must be csv or xlsx",
    })
    .transform((v) => v as "csv" | "xlsx"),
  date_from: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) =>
      v && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
        ? v.trim()
        : undefined,
    ),
  date_to: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) =>
      v && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v.trim())
        ? v.trim()
        : undefined,
    ),
  branch_id: z
    .union([z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) =>
      v &&
      typeof v === "string" &&
      v.trim() !== "" &&
      /^[0-9a-f-]{36}$/i.test(v.trim())
        ? v.trim()
        : undefined,
    ),
});

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    logger.info("Prescriptions export API GET called", { requestId });

    const supabase = await createClient();
    const supabaseServiceRole = createServiceRoleClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new AuthenticationError("Unauthorized");
    }

    const { data: isAdmin } = (await supabase.rpc("is_admin", {
      user_id: user.id,
    } as IsAdminParams)) as { data: IsAdminResult | null; error: Error | null };
    if (!isAdmin) {
      throw new AuthorizationError("Admin access required");
    }

    const branchContext = await getBranchContext(request, user.id);

    const searchParams = request.nextUrl.searchParams;
    const formatParam = searchParams.get("format") || "csv";
    const parsed = exportQuerySchema.safeParse({
      format: formatParam,
      date_from: searchParams.get("date_from"),
      date_to: searchParams.get("date_to"),
      branch_id: searchParams.get("branch_id"),
    });

    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message: "Invalid parameters",
            details: parsed.error.errors,
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const {
      format,
      date_from,
      date_to,
      branch_id: queryBranchId,
    } = parsed.data;

    const effectiveBranchId = queryBranchId ?? branchContext.branchId;

    if (!branchContext.isSuperAdmin && effectiveBranchId === null) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            message:
              "Seleccione una sucursal. Solo super administradores en vista global pueden exportar todas las sucursales.",
          },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    let query = supabaseServiceRole
      .from("prescriptions")
      .select("*")
      .order("prescription_date", { ascending: false })
      .limit(MAX_EXPORT_ROWS);

    query = addBranchFilter(
      query,
      effectiveBranchId,
      branchContext.isSuperAdmin,
      branchContext.organizationId,
    );

    if (date_from) query = query.gte("prescription_date", date_from);
    if (date_to) query = query.lte("prescription_date", date_to);

    const { data: prescriptions, error } = await query;

    if (error) {
      logger.error("Error fetching prescriptions for export", {
        error,
        requestId,
      });
      throw new Error(`Failed to fetch prescriptions: ${error.message}`);
    }

    const items = prescriptions || [];

    if (items.length === 0) {
      const dateStr = new Date().toISOString().split("T")[0];
      const ext = format === "csv" ? "csv" : "xlsx";
      const filename = `libro-recetas-${dateStr}.${ext}`;

      if (format === "csv") {
        const csv =
          "Fecha;RUT;Nombre;Profesional;OD Esf;OD Cil;OD Eje;OD Add;OD PD;OS Esf;OS Cil;OS Eje;OS Add;OS PD;Tipo;Nº Receta;Sucursal\n";
        const bom = "\uFEFF";
        return new Response(bom + csv, {
          status: 200,
          headers: {
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Type": "text/csv; charset=utf-8",
          },
        });
      }

      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet([]);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Libro de Recetas");
      const xlsxBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });
      return new Response(xlsxBuffer, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        },
      });
    }

    const customerIds = [
      ...new Set(items.map((p: { customer_id: string }) => p.customer_id)),
    ];
    const { data: customers } =
      customerIds.length > 0
        ? await supabaseServiceRole
            .from("customers")
            .select("id, first_name, last_name, rut")
            .in("id", customerIds)
        : { data: [] };

    const branchIds = [
      ...new Set(
        items.map((p: { branch_id?: string }) => p.branch_id).filter(Boolean),
      ),
    ];
    const { data: branches } =
      branchIds.length > 0
        ? await supabaseServiceRole
            .from("branches")
            .select("id, name")
            .in("id", branchIds)
        : { data: [] };

    const customerMap = new Map(
      (customers || []).map(
        (c: {
          id: string;
          first_name?: string;
          last_name?: string;
          rut?: string;
        }) => [c.id, c],
      ),
    );
    const branchMap = new Map(
      (branches || []).map((b: { id: string }) => [b.id, b]),
    );

    const rows = items.map((p: Record<string, unknown>) => {
      const c = customerMap.get(p.customer_id as string);
      const b = branchMap.get(p.branch_id as string);
      const fullName = c
        ? `${c.first_name || ""} ${c.last_name || ""}`.trim()
        : "";
      const rutFormatted = c?.rut ? formatRUT(c.rut) : "";
      return {
        fecha: p.prescription_date || "",
        rut: rutFormatted,
        nombre: fullName,
        profesional: p.issued_by || "",
        od_esf: p.od_sphere ?? "",
        od_cil: p.od_cylinder ?? "",
        od_eje: p.od_axis ?? "",
        od_add: p.od_add ?? "",
        od_pd: p.od_pd ?? "",
        os_esf: p.os_sphere ?? "",
        os_cil: p.os_cylinder ?? "",
        os_eje: p.os_axis ?? "",
        os_add: p.os_add ?? "",
        os_pd: p.os_pd ?? "",
        tipo: p.prescription_type || "",
        numero_receta: p.prescription_number || "",
        sucursal: (b as { name?: string })?.name || "",
      };
    });

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `libro-recetas-${dateStr}.${format === "csv" ? "csv" : "xlsx"}`;

    if (format === "csv") {
      const headers = [
        "Fecha",
        "RUT",
        "Nombre",
        "Profesional",
        "OD Esf",
        "OD Cil",
        "OD Eje",
        "OD Add",
        "OD PD",
        "OS Esf",
        "OS Cil",
        "OS Eje",
        "OS Add",
        "OS PD",
        "Tipo",
        "Nº Receta",
        "Sucursal",
      ];
      const csvRows = [
        headers.join(";"),
        ...rows.map((r) =>
          [
            r.fecha,
            r.rut,
            `"${String(r.nombre).replace(/"/g, '""')}"`,
            `"${String(r.profesional).replace(/"/g, '""')}"`,
            r.od_esf,
            r.od_cil,
            r.od_eje,
            r.od_add,
            r.od_pd,
            r.os_esf,
            r.os_cil,
            r.os_eje,
            r.os_add,
            r.os_pd,
            r.tipo,
            r.numero_receta,
            `"${String(r.sucursal).replace(/"/g, '""')}"`,
          ].join(";"),
        ),
      ];
      const csv = csvRows.join("\n");
      const bom = "\uFEFF";
      const buffer = Buffer.from(bom + csv, "utf-8");

      return new Response(buffer, {
        status: 200,
        headers: {
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Libro de Recetas");
    const xlsxBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new Response(xlsxBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error) {
    logger.error("Error in prescriptions export API", { error, requestId });
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          message:
            error instanceof Error ? error.message : "Internal server error",
        },
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
