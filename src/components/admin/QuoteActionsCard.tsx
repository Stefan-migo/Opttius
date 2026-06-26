"use client";

import {
  ArrowLeft,
  Calculator,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Quote } from "@/hooks/useQuote";

interface QuoteActionsCardProps {
  quote: Quote;
  loadingToPos: boolean;
  sending: boolean;
  showSendDialog: boolean;
  sendEmail: string;
  onLoadToPOS: () => void;
  onPrint: () => void;
  onSendQuote: () => void;
  onShowSendDialog: (open: boolean) => void;
  onSendEmailChange: (email: string) => void;
  onBack: () => void;
}

function StatusBadge({ status }: { status: string }) {
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
  const Icon = statusConfig.icon as React.ComponentType<{ className?: string }>;

  return (
    <Badge
      className="flex items-center gap-1"
      variant={
        statusConfig.variant as
          | "outline"
          | "default"
          | "secondary"
          | "destructive"
      }
    >
      <Icon className="h-3 w-3" />
      {statusConfig.label}
    </Badge>
  );
}

export function QuoteActionsCard({
  quote,
  loadingToPos,
  sending,
  showSendDialog,
  sendEmail,
  onLoadToPOS,
  onPrint,
  onSendQuote,
  onShowSendDialog,
  onSendEmailChange,
  onBack,
}: QuoteActionsCardProps) {
  const customerName =
    quote.customer?.first_name && quote.customer?.last_name
      ? `${quote.customer.first_name} ${quote.customer.last_name}`
      : "Sin nombre";

  return (
    <>
      {/* Header - multi-row */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Volver"
            className="h-9 w-9 shrink-0"
            size="icon"
            variant="outline"
            onClick={onBack}
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
          <StatusBadge status={quote.status} />
          {!quote.converted_to_work_order_id && (
            <Button
              className="h-9 gap-1.5"
              disabled={loadingToPos}
              size="sm"
              onClick={onLoadToPOS}
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
            onClick={() => onShowSendDialog(true)}
          >
            <Send className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Enviar Presupuesto</span>
          </Button>
          <Button
            aria-label="Imprimir"
            className="h-9 w-9 sm:w-auto sm:px-3"
            size="sm"
            variant="outline"
            onClick={onPrint}
          >
            <Printer className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Imprimir</span>
          </Button>
        </div>
      </div>

      {/* Send Quote Dialog */}
      <Dialog open={showSendDialog} onOpenChange={onShowSendDialog}>
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
                onChange={(e) => onSendEmailChange(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onShowSendDialog(false)}>
              Cancelar
            </Button>
            <Button disabled={sending || !sendEmail} onClick={onSendQuote}>
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
    </>
  );
}
