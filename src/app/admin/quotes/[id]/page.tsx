"use client";

import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  Loader2,
  Package,
  Printer,
  RefreshCw,
  Send,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";
import { quoteService } from "@/lib/api/services";
import { getLensTypeLabel } from "@/lib/lens-type-labels";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Quote {
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

export default function QuoteDetailPage() {
  // Helper function to safely get customer ID
  const getCustomerId = (q: Quote | null): string => {
    if (!q) return "N/A";
    if (typeof q.customer === "object" && q.customer !== null) {
      return q.customer.id ?? "N/A";
    }
    return "N/A";
  };

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

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId, currentBranchId, isGlobalView]);

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

  const handlePrint = () => {
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
  };

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

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { variant: unknown; label: string; icon: unknown }
    > = {
      draft: { variant: "outline", label: "Borrador", icon: FileText },
      sent: { variant: "secondary", label: "Enviado", icon: Send },
      accepted: { variant: "default", label: "Aceptado", icon: CheckCircle },
      rejected: { variant: "destructive", label: "Rechazado", icon: XCircle },
      expired: { variant: "outline", label: "Expirado", icon: Clock },
      converted_to_work: {
        variant: "default",
        label: "Convertido",
        icon: RefreshCw,
      },
    };

    const statusConfig = config[status] || {
      variant: "outline",
      label: status,
      icon: FileText,
    };
    const Icon = statusConfig.icon;

    return (
      <Badge className="flex items-center gap-1" variant={statusConfig.variant}>
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-epoch-primary">
              Presupuesto no encontrado
            </h1>
          </div>
        </div>
      </div>
    );
  }

  const customerName =
    quote.customer?.first_name && quote.customer?.last_name
      ? `${quote.customer.first_name} ${quote.customer.last_name}`
      : "Sin nombre";

  return (
    <div className="space-y-6">
      {/* Header - multi-row */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Volver"
            className="h-9 w-9 shrink-0"
            size="icon"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-epoch-primary truncate min-w-0">
            {quote.quote_number}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-admin-text-tertiary">
          Presupuesto para {customerName}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {getStatusBadge(quote.status)}
          {!quote.converted_to_work_order_id && (
            <Button
              className="h-9 gap-1.5"
              disabled={loadingToPos}
              size="sm"
              onClick={handleLoadToPOS}
            >
              {loadingToPos ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin shrink-0" />
                  <span className="text-xs sm:text-sm">Cargando...</span>
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4 shrink-0" />
                  <span className="text-xs sm:text-sm">Cargar al POS</span>
                </>
              )}
            </Button>
          )}
          {quote.converted_to_work_order_id && (
            <Link
              href={`/admin/work-orders/${quote.converted_to_work_order_id}`}
            >
              <Button className="h-9" size="sm" variant="outline">
                <Eye className="h-4 w-4 sm:mr-2 shrink-0" />
                <span className="hidden sm:inline">Ver Trabajo</span>
              </Button>
            </Link>
          )}
          <Button
            aria-label="Enviar presupuesto"
            className="h-9 w-9 sm:w-auto sm:px-3"
            size="sm"
            variant="outline"
            onClick={() => setShowSendDialog(true)}
          >
            <Send className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Enviar Presupuesto</span>
          </Button>
          <Button
            aria-label="Imprimir"
            className="h-9 w-9 sm:w-auto sm:px-3"
            size="sm"
            variant="outline"
            onClick={handlePrint}
          >
            <Printer className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Send Quote Dialog */}
      <Dialog open={showSendDialog} onOpenChange={setShowSendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Presupuesto por Email</DialogTitle>
            <DialogDescription>
              {quote?.customer?.email
                ? `El presupuesto será enviado al email del cliente: ${quote.customer.email}`
                : "Ingresa el email al cual enviar el presupuesto"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {quote?.customer?.email ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Label className="text-sm font-medium text-blue-900">
                  Email del Cliente
                </Label>
                <p className="text-sm text-blue-700 mt-1">
                  {quote.customer.email}
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  El presupuesto se enviará a este email. Si deseas enviarlo a
                  otro email, puedes cambiarlo abajo.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  El cliente no tiene un email asignado. Por favor, ingresa el
                  email de destino.
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="email">Email de Destino</Label>
              <Input
                className="mt-1"
                id="email"
                placeholder="cliente@ejemplo.com"
                type="email"
                value={sendEmail}
                onChange={(e) => setSendEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button disabled={sending || !sendEmail} onClick={handleSendQuote}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <Tabs className="space-y-6" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="details">Detalles</TabsTrigger>
          <TabsTrigger value="pricing">Precios</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent className="space-y-6" value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quote.customer ? (
                  <>
                    <div>
                      <p className="text-sm text-admin-text-tertiary">Nombre</p>
                      <p className="font-medium">{customerName}</p>
                    </div>
                    {quote.customer.email && (
                      <div>
                        <p className="text-sm text-admin-text-tertiary">
                          Email
                        </p>
                        <p className="font-medium">{quote.customer.email}</p>
                      </div>
                    )}
                    {quote.customer.phone && (
                      <div>
                        <p className="text-sm text-admin-text-tertiary">
                          Teléfono
                        </p>
                        <p className="font-medium">{quote.customer.phone}</p>
                      </div>
                    )}
                    {quote.customer?.id ? (
                      <Link href={`/admin/customers/${quote.customer.id}`}>
                        <Button
                          className="w-full mt-4"
                          size="sm"
                          variant="outline"
                        >
                          Ver Cliente
                        </Button>
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <div>
                    <p className="text-sm text-admin-text-tertiary text-red-500">
                      Cliente no encontrado (ID: {getCustomerId(quote)})
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prescription Info */}
            {quote.prescription && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Receta
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Fecha</p>
                    <p className="font-medium">
                      {formatDate(quote.prescription.prescription_date)}
                    </p>
                  </div>
                  {quote.prescription.prescription_type && (
                    <div>
                      <p className="text-sm text-admin-text-tertiary">Tipo</p>
                      <p className="font-medium">
                        {quote.prescription.prescription_type}
                      </p>
                    </div>
                  )}
                  {quote.prescription.issued_by && (
                    <div>
                      <p className="text-sm text-admin-text-tertiary">
                        Emitida por
                      </p>
                      <p className="font-medium">
                        {quote.prescription.issued_by}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Resumen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-admin-text-tertiary">Fecha</p>
                  <p className="font-medium">{formatDate(quote.quote_date)}</p>
                </div>
                {quote.expiration_date && (
                  <div>
                    <p className="text-sm text-admin-text-tertiary">
                      Válido hasta
                    </p>
                    <p className="font-medium">
                      {new Date(quote.expiration_date).toLocaleDateString(
                        "es-CL",
                      )}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-admin-text-tertiary">Total</p>
                  <p className="text-2xl font-bold text-admin-success">
                    {formatCurrency(quote.total_amount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Marco y Lente - Single merged card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                <Eye className="h-5 w-5 mr-2" />
                Marco y Lente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.presbyopia_solution === "two_separate" ? (
                <>
                  <div className="space-y-2 pb-4 border-b border-admin-border-primary/20">
                    <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Par Lejos
                    </p>
                    <p className="font-medium">
                      Marco: {quote.frame_name || "—"}
                      {quote.frame_brand && ` (${quote.frame_brand})`}
                    </p>
                    <p className="font-medium">
                      Lente:{" "}
                      {quote.far_lens_family?.name ||
                        getLensTypeLabel(quote.lens_type) ||
                        "—"}
                    </p>
                    <p className="text-sm font-semibold text-admin-success">
                      Precio: {formatCurrency(quote.frame_price)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-display font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Par Cerca
                    </p>
                    <p className="font-medium">
                      Marco:{" "}
                      {quote.customer_own_near_frame
                        ? "Cliente trae marco"
                        : `${quote.near_frame_name || "—"}${quote.near_frame_brand ? ` (${quote.near_frame_brand})` : ""}`}
                    </p>
                    <p className="font-medium">
                      Lente: {quote.near_lens_family?.name || "—"}
                    </p>
                    {!quote.customer_own_near_frame && (
                      <p className="text-sm font-semibold text-admin-success">
                        Precio: {formatCurrency(quote.near_frame_price || 0)}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Marco</p>
                    <p className="font-medium">{quote.frame_name || "—"}</p>
                    {quote.frame_brand && (
                      <p className="text-sm text-admin-text-tertiary">
                        {quote.frame_brand}
                        {quote.frame_model && ` · ${quote.frame_model}`}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-admin-success">
                      Precio: {formatCurrency(quote.frame_price)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-admin-text-tertiary">Lente</p>
                    <p className="font-medium">
                      {quote.lens_family?.name ||
                        getLensTypeLabel(quote.lens_type) ||
                        "—"}
                    </p>
                    <p className="text-sm text-admin-text-tertiary">
                      {quote.lens_material}
                      {quote.lens_index && ` · Índice ${quote.lens_index}`}
                    </p>
                    {quote.lens_treatments &&
                      quote.lens_treatments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {quote.lens_treatments.map((treatment, idx) => (
                            <Badge key={idx} variant="outline">
                              {treatment}
                            </Badge>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Details Tab */}
        <TabsContent className="space-y-6" value="details">
          {/* Prescription Details */}
          {quote.prescription && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Detalles de la Receta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Right Eye (OD) */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-epoch-primary border-b pb-2">
                      Ojo Derecho (OD)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {quote.prescription.od_sphere !== null &&
                        quote.prescription.od_sphere !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Esfera
                            </p>
                            <p className="font-medium">
                              {quote.prescription.od_sphere > 0 ? "+" : ""}
                              {quote.prescription.od_sphere} D
                            </p>
                          </div>
                        )}
                      {quote.prescription.od_cylinder !== null &&
                        quote.prescription.od_cylinder !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Cilindro
                            </p>
                            <p className="font-medium">
                              {quote.prescription.od_cylinder > 0 ? "+" : ""}
                              {quote.prescription.od_cylinder} D
                            </p>
                          </div>
                        )}
                      {quote.prescription.od_axis !== null &&
                        quote.prescription.od_axis !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Eje
                            </p>
                            <p className="font-medium">
                              {quote.prescription.od_axis}°
                            </p>
                          </div>
                        )}
                      {quote.prescription.od_add !== null &&
                        quote.prescription.od_add !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Adición
                            </p>
                            <p className="font-medium">
                              +{quote.prescription.od_add} D
                            </p>
                          </div>
                        )}
                      {quote.prescription.od_pd !== null &&
                        quote.prescription.od_pd !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              DP Lejos
                            </p>
                            <p className="font-medium">
                              {quote.prescription.od_pd} mm
                            </p>
                          </div>
                        )}
                      {quote.prescription.od_near_pd !== null &&
                        quote.prescription.od_near_pd !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              DP Cerca
                            </p>
                            <p className="font-medium">
                              {quote.prescription.od_near_pd} mm
                            </p>
                          </div>
                        )}
                    </div>
                    {quote.prescription.prism_od && (
                      <div className="mt-2">
                        <p className="text-xs text-admin-text-tertiary">
                          Prisma
                        </p>
                        <p className="font-medium">
                          {quote.prescription.prism_od}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Left Eye (OS) */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-epoch-primary border-b pb-2">
                      Ojo Izquierdo (OS)
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {quote.prescription.os_sphere !== null &&
                        quote.prescription.os_sphere !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Esfera
                            </p>
                            <p className="font-medium">
                              {quote.prescription.os_sphere > 0 ? "+" : ""}
                              {quote.prescription.os_sphere} D
                            </p>
                          </div>
                        )}
                      {quote.prescription.os_cylinder !== null &&
                        quote.prescription.os_cylinder !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Cilindro
                            </p>
                            <p className="font-medium">
                              {quote.prescription.os_cylinder > 0 ? "+" : ""}
                              {quote.prescription.os_cylinder} D
                            </p>
                          </div>
                        )}
                      {quote.prescription.os_axis !== null &&
                        quote.prescription.os_axis !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Eje
                            </p>
                            <p className="font-medium">
                              {quote.prescription.os_axis}°
                            </p>
                          </div>
                        )}
                      {quote.prescription.os_add !== null &&
                        quote.prescription.os_add !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Adición
                            </p>
                            <p className="font-medium">
                              +{quote.prescription.os_add} D
                            </p>
                          </div>
                        )}
                      {quote.prescription.os_pd !== null &&
                        quote.prescription.os_pd !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              DP Lejos
                            </p>
                            <p className="font-medium">
                              {quote.prescription.os_pd} mm
                            </p>
                          </div>
                        )}
                      {quote.prescription.os_near_pd !== null &&
                        quote.prescription.os_near_pd !== undefined && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              DP Cerca
                            </p>
                            <p className="font-medium">
                              {quote.prescription.os_near_pd} mm
                            </p>
                          </div>
                        )}
                    </div>
                    {quote.prescription.prism_os && (
                      <div className="mt-2">
                        <p className="text-xs text-admin-text-tertiary">
                          Prisma
                        </p>
                        <p className="font-medium">
                          {quote.prescription.prism_os}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Measurements */}
                <div className="mt-6 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                  {quote.prescription.frame_pd !== null &&
                    quote.prescription.frame_pd !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          DP del Marco
                        </p>
                        <p className="font-medium">
                          {quote.prescription.frame_pd} mm
                        </p>
                      </div>
                    )}
                  {quote.prescription.height_segmentation !== null &&
                    quote.prescription.height_segmentation !== undefined && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Altura de Segmento
                        </p>
                        <p className="font-medium">
                          {quote.prescription.height_segmentation} mm
                        </p>
                      </div>
                    )}
                  {quote.prescription.issued_by && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Prescrito por
                      </p>
                      <p className="font-medium">
                        {quote.prescription.issued_by}
                      </p>
                    </div>
                  )}
                </div>

                {quote.prescription.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-admin-text-tertiary">
                      Notas de la Receta
                    </p>
                    <p className="font-medium whitespace-pre-wrap text-sm">
                      {quote.prescription.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Frame Details */}
          {quote.presbyopia_solution === "two_separate" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Far Frame (Lejos) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Marco de Lejos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Nombre</p>
                      <p className="font-medium">{quote.frame_name || "—"}</p>
                    </div>
                    {quote.frame_brand && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Marca
                        </p>
                        <p className="font-medium">{quote.frame_brand}</p>
                      </div>
                    )}
                    {quote.frame_model && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Modelo
                        </p>
                        <p className="font-medium">{quote.frame_model}</p>
                      </div>
                    )}
                    {quote.frame_color && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Color
                        </p>
                        <p className="font-medium">{quote.frame_color}</p>
                      </div>
                    )}
                    {quote.frame_size && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Tamaño
                        </p>
                        <p className="font-medium">{quote.frame_size}</p>
                      </div>
                    )}
                    {quote.frame_sku && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">SKU</p>
                        <p className="font-medium">{quote.frame_sku}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Precio</p>
                      <p className="font-semibold text-admin-success">
                        {formatCurrency(quote.frame_price)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Near Frame (Cerca) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Marco de Cerca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {quote.customer_own_near_frame ? (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 font-medium">
                        Cliente trae marco (recambio de cristales)
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Nombre
                        </p>
                        <p className="font-medium">
                          {quote.near_frame_name || "—"}
                        </p>
                      </div>
                      {quote.near_frame_brand && (
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Marca
                          </p>
                          <p className="font-medium">
                            {quote.near_frame_brand}
                          </p>
                        </div>
                      )}
                      {quote.near_frame_model && (
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Modelo
                          </p>
                          <p className="font-medium">
                            {quote.near_frame_model}
                          </p>
                        </div>
                      )}
                      {quote.near_frame_color && (
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Color
                          </p>
                          <p className="font-medium">
                            {quote.near_frame_color}
                          </p>
                        </div>
                      )}
                      {quote.near_frame_size && (
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Tamaño
                          </p>
                          <p className="font-medium">{quote.near_frame_size}</p>
                        </div>
                      )}
                      {quote.near_frame_sku && (
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            SKU
                          </p>
                          <p className="font-medium">{quote.near_frame_sku}</p>
                        </div>
                      )}
                      {quote.near_frame_price !== undefined &&
                        quote.near_frame_price !== null && (
                          <div>
                            <p className="text-xs text-admin-text-tertiary">
                              Precio
                            </p>
                            <p className="font-semibold text-admin-success">
                              {formatCurrency(quote.near_frame_price || 0)}
                            </p>
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Detalles del Marco
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-admin-text-tertiary">Nombre</p>
                    <p className="font-medium">{quote.frame_name || "—"}</p>
                  </div>
                  {quote.frame_brand && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Marca</p>
                      <p className="font-medium">{quote.frame_brand}</p>
                    </div>
                  )}
                  {quote.frame_model && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Modelo</p>
                      <p className="font-medium">{quote.frame_model}</p>
                    </div>
                  )}
                  {quote.frame_color && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Color</p>
                      <p className="font-medium">{quote.frame_color}</p>
                    </div>
                  )}
                  {quote.frame_size && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">Tamaño</p>
                      <p className="font-medium">{quote.frame_size}</p>
                    </div>
                  )}
                  {quote.frame_sku && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">SKU</p>
                      <p className="font-medium">{quote.frame_sku}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lens Details */}
          {quote.presbyopia_solution === "two_separate" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Far Lens (Lejos) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Lente de Lejos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quote.lens_type && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Tipo de Lente
                        </p>
                        <p className="font-medium">
                          {getLensTypeLabel(quote.lens_type)}
                        </p>
                      </div>
                    )}
                    {quote.far_lens_family && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs text-blue-800 font-semibold mb-1">
                          Familia de lente
                        </p>
                        <p className="text-sm text-blue-900">
                          {quote.far_lens_family.name}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Costo del Lente
                      </p>
                      <p className="font-semibold text-admin-success">
                        {formatCurrency(quote.far_lens_cost || 0)}
                      </p>
                    </div>
                    <div className="text-xs text-admin-text-tertiary">
                      <p className="mb-1">Solución para Presbicia:</p>
                      <Badge variant="outline">
                        Dos lentes separados - Lejos
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Near Lens (Cerca) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Lente de Cerca
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {quote.lens_type && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Tipo de Lente
                        </p>
                        <p className="font-medium">
                          {getLensTypeLabel(quote.lens_type)}
                        </p>
                      </div>
                    )}
                    {quote.near_lens_family && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs text-blue-800 font-semibold mb-1">
                          Familia de lente
                        </p>
                        <p className="text-sm text-blue-900">
                          {quote.near_lens_family.name}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Costo del Lente
                      </p>
                      <p className="font-semibold text-admin-success">
                        {formatCurrency(quote.near_lens_cost || 0)}
                      </p>
                    </div>
                    <div className="text-xs text-admin-text-tertiary">
                      <p className="mb-1">Solución para Presbicia:</p>
                      <Badge variant="outline">
                        Dos lentes separados - Cerca
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Detalles del Lente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quote.lens_type && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Tipo de Lente
                      </p>
                      <p className="font-medium">
                        {getLensTypeLabel(quote.lens_type)}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-admin-text-tertiary">
                      Familia de lente
                    </p>
                    <p className="font-medium">
                      {quote.lens_family?.name || "—"}
                    </p>
                  </div>
                  {quote.lens_material && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Material
                      </p>
                      <p className="font-medium">{quote.lens_material}</p>
                    </div>
                  )}
                  {quote.lens_index && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Índice de Refracción
                      </p>
                      <p className="font-medium">{quote.lens_index}</p>
                    </div>
                  )}
                  {quote.lens_treatments &&
                    quote.lens_treatments.length > 0 && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Tratamientos
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {quote.lens_treatments.map(
                            (treatment: string, idx: number) => (
                              <Badge key={idx} variant="outline">
                                {treatment}
                              </Badge>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {quote.lens_tint_color && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Color del Tinte
                      </p>
                      <p className="font-medium">{quote.lens_tint_color}</p>
                    </div>
                  )}
                  {quote.lens_tint_percentage && (
                    <div>
                      <p className="text-xs text-admin-text-tertiary">
                        Porcentaje de Tinte
                      </p>
                      <p className="font-medium">
                        {quote.lens_tint_percentage}%
                      </p>
                    </div>
                  )}
                  {quote.presbyopia_solution &&
                    quote.presbyopia_solution !== "none" && (
                      <div>
                        <p className="text-xs text-admin-text-tertiary">
                          Solución para Presbicia
                        </p>
                        <Badge variant="outline">
                          {quote.presbyopia_solution === "progressive"
                            ? "Progresivo"
                            : quote.presbyopia_solution === "bifocal"
                              ? "Bifocal"
                              : quote.presbyopia_solution === "trifocal"
                                ? "Trifocal"
                                : quote.presbyopia_solution}
                        </Badge>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notas y Observaciones</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.notes && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Notas Internas
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">
                    {quote.notes}
                  </p>
                </div>
              )}
              {quote.customer_notes && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Notas para el Cliente
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">
                    {quote.customer_notes}
                  </p>
                </div>
              )}
              {quote.terms_and_conditions && (
                <div>
                  <p className="text-sm text-admin-text-tertiary mb-1">
                    Términos y Condiciones
                  </p>
                  <p className="font-medium whitespace-pre-wrap text-sm text-admin-text-primary bg-admin-bg-tertiary border border-admin-border-secondary/50 p-3 rounded-lg">
                    {quote.terms_and_conditions}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Tab */}
        <TabsContent className="space-y-6" value="pricing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Desglose de Precios
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {quote.presbyopia_solution === "two_separate" ? (
                  <>
                    {/* Two separate lenses pricing breakdown */}
                    <div className="space-y-1 pb-2 border-b">
                      <p className="text-sm font-semibold text-admin-text-tertiary mb-2">
                        Marco y Lente de Lejos:
                      </p>
                      <div className="flex justify-between pl-4">
                        <span className="text-xs text-admin-text-tertiary">
                          Marco de Lejos:
                        </span>
                        <span className="text-xs font-medium">
                          {formatCurrency(quote.frame_cost)}
                        </span>
                      </div>
                      <div className="flex justify-between pl-4">
                        <span className="text-xs text-admin-text-tertiary">
                          Lente de Lejos:
                        </span>
                        <span className="text-xs font-medium">
                          {formatCurrency(quote.far_lens_cost || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1 pb-2 border-b">
                      <p className="text-sm font-semibold text-admin-text-tertiary mb-2">
                        Marco y Lente de Cerca:
                      </p>
                      {quote.customer_own_near_frame ? (
                        <div className="flex justify-between pl-4">
                          <span className="text-xs text-admin-text-tertiary">
                            Marco de Cerca:
                          </span>
                          <span className="text-xs font-medium">
                            $0 (Cliente trae marco)
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-between pl-4">
                          <span className="text-xs text-admin-text-tertiary">
                            Marco de Cerca:
                          </span>
                          <span className="text-xs font-medium">
                            {quote.near_frame_cost !== undefined &&
                            quote.near_frame_cost !== null
                              ? formatCurrency(quote.near_frame_cost)
                              : formatCurrency(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pl-4">
                        <span className="text-xs text-admin-text-tertiary">
                          Lente de Cerca:
                        </span>
                        <span className="text-xs font-medium">
                          {formatCurrency(quote.near_lens_cost || 0)}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo de Tratamientos:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.treatments_cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo de Mano de Obra:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.labor_cost)}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Single lens pricing breakdown */}
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo de Marco:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.frame_cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo de Lente:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.lens_cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo de Tratamientos:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.treatments_cost)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-admin-text-tertiary">
                        Costo de Mano de Obra:
                      </span>
                      <span className="font-medium">
                        {formatCurrency(quote.labor_cost)}
                      </span>
                    </div>
                  </>
                )}
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span className="font-medium">
                    {formatCurrency(quote.subtotal)}
                  </span>
                </div>
                {quote.discount_amount > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Descuento ({quote.discount_percentage}%):</span>
                    <span className="font-medium">
                      -{formatCurrency(quote.discount_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-admin-text-tertiary">IVA (19%):</span>
                  <span className="font-medium">
                    {formatCurrency(quote.tax_amount)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-admin-success">
                    {formatCurrency(quote.total_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
