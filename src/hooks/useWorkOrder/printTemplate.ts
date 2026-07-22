import { formatCurrency, formatDate } from "@/lib/utils";

import type { WorkOrder } from "./types";

export function buildPrintContent(
  workOrder: WorkOrder,
  orgName: string,
): string {
  const customerName =
    workOrder.customer?.first_name && workOrder.customer?.last_name
      ? `${workOrder.customer.first_name} ${workOrder.customer.last_name}`
      : "Sin nombre";

  const statusLabels: Record<string, string> = {
    quote: "Presupuesto",
    ordered: "Ordenado",
    sent_to_lab: "Enviado al Lab",
    received_from_lab: "Recibido del Lab",
    mounted: "Montado",
    quality_check: "Control de Calidad",
    ready_for_pickup: "Listo para Retiro",
    delivered: "Entregado",
    cancelled: "Cancelado",
    returned: "Devuelto",
  };

  const rx = (v: number | null | undefined) =>
    v !== null && v !== undefined ? `${v > 0 ? "+" : ""}${v}` : "-";

  const p = workOrder.prescription as Record<string, unknown> | null;
  const rxSection = p
    ? `
    <div class="section">
      <h2>Receta (Para Laboratorio)</h2>
      <div class="rx-grid">
        <div>
          <strong>OD:</strong> Esf ${rx(p.od_sphere as number | null)} | Cil ${rx(p.od_cylinder as number | null)} | Eje ${(p.od_axis as string) ?? "-"}° | Add ${(p.od_add as string) ?? "-"} | PD ${(p.od_pd as string) ?? "-"} mm${(p.od_near_pd as number | null) != null ? ` | PD Cerca ${p.od_near_pd} mm` : ""}${((p.od_prism as number | null) ?? (p.prism_od as number | null)) != null ? ` | Prisma ${(p.od_prism as number | null) ?? (p.prism_od as number | null)}` : ""}${(p.od_base as string | null) != null ? ` | Base ${p.od_base}` : ""}
        </div>
        <div>
          <strong>OS:</strong> Esf ${rx(p.os_sphere as number | null)} | Cil ${rx(p.os_cylinder as number | null)} | Eje ${(p.os_axis as string) ?? "-"}° | Add ${(p.os_add as string) ?? "-"} | PD ${(p.os_pd as string) ?? "-"} mm${(p.os_near_pd as number | null) != null ? ` | PD Cerca ${p.os_near_pd} mm` : ""}${((p.os_prism as number | null) ?? (p.prism_os as number | null)) != null ? ` | Prisma ${(p.os_prism as number | null) ?? (p.prism_os as number | null)}` : ""}${(p.os_base as string | null) != null ? ` | Base ${p.os_base}` : ""}
        </div>
      </div>
      ${
        p.frame_pd != null || p.height_segmentation != null || p.issued_by
          ? `
      <div class="rx-extra mt-2">
        ${p.frame_pd != null ? `<span>DP Marco: ${p.frame_pd} mm</span>` : ""}
        ${p.height_segmentation != null ? `<span>Altura Segmento: ${p.height_segmentation} mm</span>` : ""}
        ${p.issued_by ? `<span>Prescrito por: ${p.issued_by}${p.issued_by_license ? ` (${p.issued_by_license})` : ""}</span>` : ""}
      </div>`
          : ""
      }
      ${p.notes ? `<p class="mt-2"><em>Notas:</em> ${String(p.notes).replace(/\n/g, "<br>")}</p>` : ""}
    </div>`
    : "";

  const labSection = workOrder.lab_name
    ? `
    <div class="section">
      <h2>Laboratorio</h2>
      <p><strong>${workOrder.lab_name}</strong></p>
      ${workOrder.lab_order_number ? `<p>Orden Lab: ${workOrder.lab_order_number}</p>` : ""}
    </div>`
    : "";

  const notesSection =
    workOrder.internal_notes || workOrder.lab_notes
      ? `
    <div class="section">
      <h2>Notas</h2>
      ${workOrder.internal_notes ? `<p>${String(workOrder.internal_notes).replace(/\n/g, "<br>")}</p>` : ""}
      ${workOrder.lab_notes ? `<p><em>Lab:</em> ${String(workOrder.lab_notes).replace(/\n/g, "<br>")}</p>` : ""}
    </div>`
      : "";

  const treatmentsList = workOrder.lens_treatments?.length
    ? workOrder.lens_treatments.join(", ")
    : "Ninguno";

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Orden de Trabajo ${workOrder.work_order_number}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 210mm; margin: 0 auto; padding: 20px; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 16px; margin-bottom: 24px; }
          .header h1 { margin: 0; font-size: 20px; }
          .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
          .badge { display: inline-block; padding: 4px 8px; background: #e5e7eb; border-radius: 4px; font-size: 12px; margin-right: 8px; }
          .section { margin-bottom: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
          .section h2 { margin: 0 0 12px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
          .rx-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 12px; }
          .total-row { font-weight: bold; font-size: 18px; border-top: 2px solid #333; padding-top: 12px; margin-top: 12px; }
          .footer { margin-top: 24px; text-align: center; font-size: 11px; color: #6b7280; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${orgName}</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px;">Orden de Trabajo #${workOrder.work_order_number}</p>
        </div>
        <div class="meta">
          <span>${formatDate(workOrder.work_order_date, { format: "long", locale: "es-CL" })}</span>
          <span><span class="badge">${statusLabels[workOrder.status] || workOrder.status}</span><span class="badge">Pago: ${workOrder.payment_status}</span></span>
        </div>
        <div class="section">
          <h2>Cliente</h2>
          <p><strong>${customerName}</strong></p>
          ${workOrder.customer?.email ? `<p>${workOrder.customer.email}</p>` : ""}
          ${workOrder.customer?.phone ? `<p>${workOrder.customer.phone}</p>` : ""}
        </div>
        <div class="info-grid">
          <div class="section">
            <h2>Marco</h2>
            <p><strong>${workOrder.frame_name}</strong></p>
            ${workOrder.frame_brand ? `<p>Marca: ${workOrder.frame_brand}</p>` : ""}
            ${workOrder.frame_model ? `<p>Modelo: ${workOrder.frame_model}</p>` : ""}
            ${workOrder.frame_serial_number ? `<p>Serie: ${workOrder.frame_serial_number}</p>` : ""}
          </div>
          <div class="section">
            <h2>Lente</h2>
            <p><strong>${workOrder.lens_type}</strong></p>
            <p>Material: ${workOrder.lens_material}</p>
            ${workOrder.lens_index ? `<p>Índice: ${workOrder.lens_index}</p>` : ""}
            <p>Tratamientos: ${treatmentsList}</p>
          </div>
        </div>
        ${rxSection}
        ${labSection}
        ${notesSection}
        <div class="section">
          <h2>Total</h2>
          <div class="total-row">${formatCurrency(workOrder.total_amount)}</div>
          ${
            workOrder.deposit_amount > 0
              ? `
          <p>Depósito: ${formatCurrency(workOrder.deposit_amount)}</p>
          ${workOrder.balance_amount > 0 ? `<p style="color: #ea580c; font-weight: 600;">Saldo Pendiente: ${formatCurrency(workOrder.balance_amount)}</p>` : ""}
          `
              : ""
          }
        </div>
        <div class="footer">Documento generado el ${formatDate(new Date(), { locale: "es-CL" })}</div>
      </body>
    </html>`;
}
