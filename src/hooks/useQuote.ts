"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { useBranch } from "@/hooks/useBranch";
import { quoteService } from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/utils";

export interface Quote {
  id: string;
  quote_number: string;
  quote_date: string;
  expiration_date?: string;
  customer: {
    id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
  prescription?: unknown;
  frame_product?: unknown;
  frame_name?: string;
  frame_brand?: string;
  frame_model?: string;
  frame_color?: string;
  frame_size?: string;
  frame_sku?: string;
  frame_price: number;
  lens_type?: string;
  lens_material?: string;
  lens_index?: number;
  lens_treatments?: string[];
  lens_tint_color?: string;
  lens_tint_percentage?: number;
  // Presbyopia solution fields
  presbyopia_solution?:
    | "none"
    | "progressive"
    | "bifocal"
    | "trifocal"
    | "two_separate";
  far_lens_family_id?: string;
  near_lens_family_id?: string;
  far_lens_cost?: number;
  near_lens_cost?: number;
  lens_family?: { id: string; name: string } | null;
  far_lens_family?: { id: string; name: string } | null;
  near_lens_family?: { id: string; name: string } | null;
  // Near frame fields (for two_separate solution)
  near_frame_product_id?: string;
  near_frame_name?: string;
  near_frame_brand?: string;
  near_frame_model?: string;
  near_frame_color?: string;
  near_frame_size?: string;
  near_frame_sku?: string;
  near_frame_price?: number;
  near_frame_price_includes_tax?: boolean;
  near_frame_cost?: number;
  customer_own_near_frame?: boolean;
  frame_cost: number;
  lens_cost: number;
  treatments_cost: number;
  labor_cost: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  currency: string;
  status: string;
  notes?: string;
  customer_notes?: string;
  terms_and_conditions?: string;
  created_at: string;
  converted_to_work_order_id?: string;
}

export function useQuote() {
  const router = useRouter();
  const params = useParams();
  const quoteId = params.id as string;
  const { currentBranchId, isSuperAdmin } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingToPos, setLoadingToPos] = useState(false);
  const [sending, setSending] = useState(false);
  const [showSendDialog, setShowSendDialog] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  // Helper function to safely get customer ID
  const getCustomerId = (q: Quote | null): string => {
    if (!q) return "N/A";
    if (typeof q.customer === "object" && q.customer !== null) {
      return q.customer.id ?? "N/A";
    }
    return "N/A";
  };

  const fetchQuote = async () => {
    try {
      setLoading(true);

      // Add branch header if branch is selected, or 'global' if in global view
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (currentBranchId) {
        headers["x-branch-id"] = currentBranchId;
      } else if (isGlobalView && isSuperAdmin) {
        headers["x-branch-id"] = "global";
      }

      const quoteResult = await quoteService.getQuote(quoteId);
      // Cast to any to handle additional properties from API response
      const quote = quoteResult as unknown as unknown;

      console.log("Quote loaded:", {
        quoteId: quote?.id,
        hasCustomer: !!quote?.customer,
        customerId: quote?.customer_id,
        customer: quote?.customer,
        presbyopia_solution: quote?.presbyopia_solution,
        far_lens_family_id: quote?.far_lens_family_id,
        near_lens_family_id: quote?.near_lens_family_id,
        far_lens_cost: quote?.far_lens_cost,
        near_lens_cost: quote?.near_lens_cost,
        near_frame_name: quote?.near_frame_name,
        near_frame_cost: quote?.near_frame_cost,
        frame_cost: quote?.frame_cost,
        frame_name: quote?.frame_name,
        far_lens_family: quote?.far_lens_family,
        near_lens_family: quote?.near_lens_family,
      });
      setQuote(quote);
    } catch (error) {
      console.error("Error fetching quote:", error);
      toast.error("Error al cargar el presupuesto");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteId, currentBranchId, isGlobalView]);

  const handleLoadToPOS = async () => {
    if (!quote) return;

    setLoadingToPos(true);
    try {
      // Redirigir al POS con el quoteId como parámetro
      router.push(`/admin/pos?quoteId=${quoteId}`);
    } catch (error: unknown) {
      console.error("Error loading quote to POS:", error);
      toast.error("Error al cargar presupuesto al POS");
    } finally {
      setLoadingToPos(false);
    }
  };

  const handlePrint = useCallback(() => {
    if (!quote) return;

    // Create printable HTML content
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Por favor, permite ventanas emergentes para imprimir");
      return;
    }

    const customerName =
      quote.customer?.first_name && quote.customer?.last_name
        ? `${quote.customer.first_name} ${quote.customer.last_name}`
        : "Sin nombre";

    const treatmentsList =
      quote.lens_treatments && quote.lens_treatments.length > 0
        ? quote.lens_treatments.map((t) => `<li>${t}</li>`).join("")
        : "<li>Ninguno</li>";

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Presupuesto ${quote.quote_number}</title>
          <style>
            @media print {
              @page {
                margin: 1cm;
              }
            }
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 20px;
              color: #333;
            }
            .header {
              border-bottom: 3px solid #8B5A3C;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #8B5A3C;
              font-size: 24px;
            }
            .quote-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section h2 {
              color: #8B5A3C;
              border-bottom: 2px solid #D4A574;
              padding-bottom: 5px;
              margin-bottom: 15px;
              font-size: 18px;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 8px 0;
              border-bottom: 1px solid #eee;
            }
            .info-row:last-child {
              border-bottom: none;
            }
            .pricing-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .pricing-table td {
              padding: 10px;
              border-bottom: 1px solid #eee;
            }
            .pricing-table .total-row {
              font-weight: bold;
              font-size: 18px;
              border-top: 2px solid #8B5A3C;
              color: #8B5A3C;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #eee;
              font-size: 12px;
              color: #666;
            }
            ul {
              margin: 10px 0;
              padding-left: 20px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PRESUPUESTO ${quote.quote_number}</h1>
            <p>Fecha: ${formatDate(quote.quote_date)}</p>
            ${quote.expiration_date ? `<p>Válido hasta: ${formatDate(quote.expiration_date)}</p>` : ""}
          </div>

          <div class="quote-info">
            <div>
              <h3>Cliente</h3>
              <p><strong>${customerName}</strong></p>
              ${quote.customer?.email ? `<p>Email: ${quote.customer.email}</p>` : ""}
              ${quote.customer?.phone ? `<p>Teléfono: ${quote.customer.phone}</p>` : ""}
            </div>
            <div>
              <h3>Estado</h3>
              <p><strong>${quote.status.toUpperCase()}</strong></p>
            </div>
          </div>

          <div class="section">
            <h2>Marco</h2>
            <div class="info-row">
              <span>Nombre:</span>
              <span>${quote.frame_name || "-"}</span>
            </div>
            ${quote.frame_brand ? `<div class="info-row"><span>Marca:</span><span>${quote.frame_brand}</span></div>` : ""}
            ${quote.frame_model ? `<div class="info-row"><span>Modelo:</span><span>${quote.frame_model}</span></div>` : ""}
            ${quote.frame_color ? `<div class="info-row"><span>Color:</span><span>${quote.frame_color}</span></div>` : ""}
            <div class="info-row">
              <span>Precio:</span>
              <span><strong>${formatCurrency(quote.frame_price)}</strong></span>
            </div>
          </div>

          <div class="section">
            <h2>Lente</h2>
            ${quote.lens_type ? `<div class="info-row"><span>Tipo:</span><span>${quote.lens_type}</span></div>` : ""}
            ${quote.lens_material ? `<div class="info-row"><span>Material:</span><span>${quote.lens_material}</span></div>` : ""}
            ${quote.lens_index ? `<div class="info-row"><span>Índice:</span><span>${quote.lens_index}</span></div>` : ""}
            <div class="info-row">
              <span>Tratamientos:</span>
              <span>
                <ul>${treatmentsList}</ul>
              </span>
            </div>
          </div>

          <div class="section">
            <h2>Desglose de Precios</h2>
            <table class="pricing-table">
              <tr>
                <td>Costo de Marco:</td>
                <td style="text-align: right;">${formatCurrency(quote.frame_cost)}</td>
              </tr>
              <tr>
                <td>Costo de Lente:</td>
                <td style="text-align: right;">${formatCurrency(quote.lens_cost)}</td>
              </tr>
              <tr>
                <td>Costo de Tratamientos:</td>
                <td style="text-align: right;">${formatCurrency(quote.treatments_cost)}</td>
              </tr>
              <tr>
                <td>Costo de Mano de Obra:</td>
                <td style="text-align: right;">${formatCurrency(quote.labor_cost)}</td>
              </tr>
              <tr>
                <td><strong>Subtotal:</strong></td>
                <td style="text-align: right;"><strong>${formatCurrency(quote.subtotal)}</strong></td>
              </tr>
              ${
                quote.discount_amount > 0
                  ? `
              <tr>
                <td>Descuento (${quote.discount_percentage}%):</td>
                <td style="text-align: right; color: red;">-${formatCurrency(quote.discount_amount)}</td>
              </tr>
              `
                  : ""
              }
              <tr>
                <td>IVA (19%):</td>
                <td style="text-align: right;">${formatCurrency(quote.tax_amount)}</td>
              </tr>
              <tr class="total-row">
                <td>TOTAL:</td>
                <td style="text-align: right;">${formatCurrency(quote.total_amount)}</td>
              </tr>
            </table>
          </div>

          ${
            quote.customer_notes
              ? `
          <div class="section">
            <h2>Notas para el Cliente</h2>
            <p>${quote.customer_notes.replace(/\n/g, "<br>")}</p>
          </div>
          `
              : ""
          }

          ${
            quote.terms_and_conditions
              ? `
          <div class="section">
            <h2>Términos y Condiciones</h2>
            <p>${quote.terms_and_conditions.replace(/\n/g, "<br>")}</p>
          </div>
          `
              : ""
          }

          <div class="footer">
            <p>Este presupuesto es válido hasta ${quote.expiration_date ? formatDate(quote.expiration_date) : "fecha no especificada"}</p>
            <p>Para más información, contacte con nosotros.</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    }, 250);
  }, [quote]);

  const handleSendQuote = async () => {
    if (!quote) return;

    const emailToSend = quote.customer?.email || sendEmail;

    if (!emailToSend || !emailToSend.includes("@")) {
      toast.error("Por favor, ingresa un email válido");
      return;
    }

    setSending(true);
    try {
      await quoteService.sendQuote(quoteId, emailToSend);

      toast.success(`Presupuesto enviado exitosamente a ${emailToSend}`);
      setShowSendDialog(false);
      setSendEmail("");

      // Refresh quote to update status
      fetchQuote();
    } catch (error: unknown) {
      console.error("Error sending quote:", error);
      toast.error(error.message || "Error al enviar presupuesto");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    // Set initial email if customer has one
    if (quote?.customer?.email && !sendEmail) {
      setSendEmail(quote.customer.email);
    }
  }, [quote]);

  return {
    quote,
    loading,
    loadingToPos,
    sending,
    showSendDialog,
    sendEmail,
    printRef,
    getCustomerId,
    fetchQuote,
    handleLoadToPOS,
    handlePrint,
    handleSendQuote,
    setShowSendDialog,
    setSendEmail,
    router,
  };
}
