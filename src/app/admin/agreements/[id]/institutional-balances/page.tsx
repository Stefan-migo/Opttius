"use client";

import { ArrowLeft, Check, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AgreementInstitutionalBalance,
  agreementService,
} from "@/lib/api/services/agreementService";
import { handleApiError } from "@/lib/api/services/errorService";
import { success } from "@/lib/api/services/notificationService";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function InstitutionalBalancesPage() {
  const params = useParams();
  const agreementId = params.id as string;

  const [balances, setBalances] = useState<AgreementInstitutionalBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reconcileOpen, setReconcileOpen] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [paymentRef, setPaymentRef] = useState("");
  const [emitInvoice, setEmitInvoice] = useState(true);

  useEffect(() => {
    if (agreementId) fetchBalances();
  }, [agreementId]);

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const data = await agreementService.getInstitutionalBalances(
        agreementId,
        "pending",
      );
      setBalances(data);
      setError(null);
    } catch (err) {
      const errorObj = handleApiError(err, "Cobranza pendiente");
      setError(errorObj?.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === balances.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(balances.map((b) => b.id)));
    }
  };

  const handleReconcile = async () => {
    if (selectedIds.size === 0) return;
    setReconciling(true);
    try {
      const result = await agreementService.reconcileBalances({
        balance_ids: Array.from(selectedIds),
        paid_at: new Date().toISOString(),
        payment_reference: paymentRef || undefined,
        emit_invoice: emitInvoice,
      });
      success(
        result.invoice
          ? `Factura ${result.invoice.folio} generada. ${result.reconciled_count} balance(s) conciliado(s)`
          : `${result.reconciled_count} balance(s) conciliado(s)`,
      );
      setReconcileOpen(false);
      setSelectedIds(new Set());
      setPaymentRef("");
      setEmitInvoice(true);
      fetchBalances();
    } catch (err) {
      handleApiError(err, "Conciliar");
    } finally {
      setReconciling(false);
    }
  };

  const pendingTotal = balances.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href={`/admin/agreements/${agreementId}`}>
            <Button size="icon" variant="ghost">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-admin-text-primary">
              Cobranza pendiente
            </h1>
            <p className="text-sm text-admin-text-tertiary">
              Ventas institucionales por cobrar
            </p>
          </div>
        </div>
        <Button
          disabled={selectedIds.size === 0}
          onClick={() => setReconcileOpen(true)}
        >
          <Check className="h-4 w-4 mr-2" />
          Conciliar seleccionados ({selectedIds.size})
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Total pendiente: {formatCurrency(pendingTotal)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-admin-accent-primary" />
            </div>
          ) : balances.length === 0 ? (
            <p className="text-admin-text-tertiary py-8 text-center">
              No hay cobranza pendiente
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <input
                      checked={
                        selectedIds.size === balances.length &&
                        balances.length > 0
                      }
                      type="checkbox"
                      onChange={selectAll}
                    />
                  </TableHead>
                  <TableHead>Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balances.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <input
                        checked={selectedIds.has(b.id)}
                        type="checkbox"
                        onChange={() => toggleSelect(b.id)}
                      />
                    </TableCell>
                    <TableCell>{b.order_number || b.order_id}</TableCell>
                    <TableCell>{b.customer_name || "-"}</TableCell>
                    <TableCell>{formatCurrency(b.amount)}</TableCell>
                    <TableCell>
                      {b.order_created_at
                        ? formatDate(b.order_created_at)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={reconcileOpen} onOpenChange={setReconcileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliar cobranza</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-admin-text-tertiary">
            Marcar {selectedIds.size} balance(s) como pagado(s).
          </p>
          <div>
            <label className="text-sm font-medium">Referencia de pago</label>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="Nº transferencia, cheque, etc."
              type="text"
              value={paymentRef}
              onChange={(e) => setPaymentRef(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              checked={emitInvoice}
              id="emit-invoice"
              type="checkbox"
              onChange={(e) => setEmitInvoice(e.target.checked)}
            />
            <label className="text-sm" htmlFor="emit-invoice">
              Generar factura a institución
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReconcileOpen(false)}>
              Cancelar
            </Button>
            <Button disabled={reconciling} onClick={handleReconcile}>
              {reconciling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
