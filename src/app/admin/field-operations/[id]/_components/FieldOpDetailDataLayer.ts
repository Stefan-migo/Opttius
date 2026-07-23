import { toast } from "sonner";

import { posService, type Quote,quoteService } from "@/lib/api/services";
import {
  type Customer,
  customerService,
} from "@/lib/api/services/customerService";
import { getBranchAndOperativoHeaders, getBranchHeader } from "@/lib/utils/branch";

import type { FieldOperation, MobileStockItem, WorkOrderItem } from "./FieldOpDetailTypes";

export async function fetchWorkOrders(
  id: string,
  currentBranchId: string | null | undefined,
  setWorkOrders: (items: WorkOrderItem[]) => void,
  setWorkOrdersLoading: (loading: boolean) => void,
) {
  setWorkOrdersLoading(true);
  try {
    const headers = getBranchHeader(currentBranchId);
    const res = await fetch(`/api/admin/field-operations/${id}/work-orders`, {
      headers,
    });
    if (!res.ok) throw new Error("Error al cargar trabajos");
    const json = await res.json();
    const items = json?.data ?? json ?? [];
    setWorkOrders(Array.isArray(items) ? items : []);
  } catch {
    toast.error("Error al cargar trabajos");
    setWorkOrders([]);
  } finally {
    setWorkOrdersLoading(false);
  }
}

export async function fetchCustomers(
  id: string,
  branchId: string,
  setCustomers: (items: Customer[]) => void,
  setCustomersLoading: (loading: boolean) => void,
) {
  setCustomersLoading(true);
  try {
    const { data } = await customerService.getCustomers({
      branchId,
      fieldOperationId: id,
      limit: 100,
    });
    setCustomers(data || []);
  } catch {
    toast.error("Error al cargar clientes");
    setCustomers([]);
  } finally {
    setCustomersLoading(false);
  }
}

export async function fetchQuotes(
  id: string,
  branchId: string | undefined,
  setQuotes: (items: Quote[]) => void,
  setQuotesLoading: (loading: boolean) => void,
) {
  setQuotesLoading(true);
  try {
    const result = await quoteService.getQuotes({
      branch_id: branchId,
      field_operation_id: id,
      limit: 100,
    });
    setQuotes(result.data || []);
  } catch {
    toast.error("Error al cargar presupuestos");
    setQuotes([]);
  } finally {
    setQuotesLoading(false);
  }
}

export async function fetchCashStatus(
  branchId: string,
  fieldOpId: string,
  setCashStatus: (
    status: { isOpen: boolean; session?: { opening_cash_amount?: number } } | null,
  ) => void,
  setLoadingCashStatus: (loading: boolean) => void,
) {
  setLoadingCashStatus(true);
  try {
    const status = await posService.getCashStatus(branchId, fieldOpId);
    setCashStatus({
      isOpen: status?.isOpen ?? false,
      session: status?.session,
    });
  } catch {
    setCashStatus(null);
  } finally {
    setLoadingCashStatus(false);
  }
}

export async function fetchDetail(
  id: string,
  currentBranchId: string | null | undefined,
  setOperation: (op: FieldOperation | null) => void,
  setMobileStock: (stock: MobileStockItem[]) => void,
  setLoading: (loading: boolean) => void,
  onError?: () => void,
) {
  try {
    setLoading(true);
    const headers = getBranchHeader(currentBranchId);
    const response = await fetch(`/api/admin/field-operations/${id}`, {
      headers,
    });
    if (!response.ok) throw new Error("Error al cargar operativo");
    const data = await response.json();
    setOperation(data?.data?.fieldOperation || null);
    setMobileStock(data?.data?.mobileStock || []);
  } catch {
    toast.error("Error al cargar operativo");
    onError?.();
  } finally {
    setLoading(false);
  }
}

export async function handleStatusChange(
  newStatus: string,
  operation: FieldOperation,
  id: string,
  currentBranchId: string | null | undefined,
  setUpdatingStatus: (v: boolean) => void,
  setOperation: (op: FieldOperation | null | ((prev: FieldOperation | null) => FieldOperation | null)) => void,
  onCompleted?: () => void,
) {
  if (newStatus === operation.status) return;
  setUpdatingStatus(true);
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(operation?.branch_id
        ? getBranchAndOperativoHeaders(operation.branch_id, id)
        : getBranchHeader(currentBranchId)),
    };
    const response = await fetch(`/api/admin/field-operations/${id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: newStatus }),
    });
    if (!response.ok) throw new Error("Error al actualizar estado");
    setOperation((prev) => (prev ? { ...prev, status: newStatus } : null));
    toast.success("Estado actualizado");
    if (newStatus === "completed") onCompleted?.();
  } catch {
    toast.error("Error al actualizar estado");
  } finally {
    setUpdatingStatus(false);
  }
}

export async function handleOpenCash(
  openingCashAmount: string,
  id: string,
  branchId: string,
  setOpeningCash: (v: boolean) => void,
  setShowOpenCashDialog: (v: boolean) => void,
  setOpeningCashAmount: (v: string) => void,
  onCashOpened?: () => void,
) {
  const amount = parseFloat(openingCashAmount);
  if (isNaN(amount) || amount < 0) {
    toast.error("Ingrese un monto válido");
    return;
  }
  setOpeningCash(true);
  try {
    const headers = getBranchAndOperativoHeaders(branchId, id);
    const res = await fetch("/api/admin/cash-register/open", {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        opening_cash_amount: amount,
        field_operation_id: id,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || "Error al abrir caja");
    }
    toast.success("Caja abierta");
    setShowOpenCashDialog(false);
    setOpeningCashAmount("");
    onCashOpened?.();
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Error al abrir caja");
  } finally {
    setOpeningCash(false);
  }
}

export async function handleReturnStock(
  operation: FieldOperation,
  id: string,
  mobileStock: MobileStockItem[],
  setReturningStock: (v: boolean) => void,
  onComplete: () => void,
) {
  if (!operation?.branch_id || !id || mobileStock.length === 0) return;
  setReturningStock(true);
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...getBranchAndOperativoHeaders(operation.branch_id, id),
    };
    const res = await fetch(
      `/api/admin/field-operations/${id}/return-stock`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: mobileStock.map((m) => ({
            product_id: m.product_id,
            quantity: m.quantity,
          })),
        }),
      },
    );
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || "Error al devolver stock");
    }
    toast.success("Stock sobrante devuelto a la sucursal");
    onComplete();
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Error al devolver stock");
  } finally {
    setReturningStock(false);
  }
}

export async function handleDeliver(
  deliverSelectedIds: Set<string>,
  deliverRecipient: string,
  deliverNotes: string,
  id: string,
  currentBranchId: string | null | undefined,
  setDeliverLoading: (v: boolean) => void,
  setDeliverRecipient: (v: string) => void,
  setDeliverNotes: (v: string) => void,
  setDeliverSelectedIds: (v: Set<string>) => void,
  onSettled?: () => void,
) {
  if (deliverSelectedIds.size === 0 || !deliverRecipient.trim()) {
    toast.error("Seleccione al menos un trabajo y el nombre del receptor");
    return;
  }
  setDeliverLoading(true);
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...getBranchHeader(currentBranchId),
    };
    const res = await fetch(`/api/admin/field-operations/${id}/deliver`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        work_order_ids: Array.from(deliverSelectedIds),
        recipient_name: deliverRecipient.trim(),
        notes: deliverNotes.trim() || null,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || "Error al registrar entrega");
    }
    toast.success("Entrega registrada");
    setDeliverRecipient("");
    setDeliverNotes("");
    setDeliverSelectedIds(new Set());
    onSettled?.();
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : "Error al registrar entrega");
  } finally {
    setDeliverLoading(false);
  }
}

export async function handleDeleteCustomer(
  deleteCustomerId: string,
  setDeletingCustomer: (v: boolean) => void,
  setDeleteCustomerId: (v: string | null) => void,
  onDeleted: () => void,
) {
  setDeletingCustomer(true);
  try {
    await customerService.deleteCustomer(deleteCustomerId);
    toast.success("Cliente eliminado");
    setDeleteCustomerId(null);
    onDeleted();
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : "Error al eliminar cliente");
  } finally {
    setDeletingCustomer(false);
  }
}

export async function handleDeleteQuote(
  deleteQuoteId: string,
  setDeletingQuote: (v: boolean) => void,
  setDeleteQuoteId: (v: string | null) => void,
  onDeleted: () => void,
) {
  setDeletingQuote(true);
  try {
    await quoteService.deleteQuote(deleteQuoteId);
    toast.success("Presupuesto eliminado");
    setDeleteQuoteId(null);
    onDeleted();
  } catch (err: unknown) {
    toast.error(err instanceof Error ? err.message : "Error al eliminar presupuesto");
  } finally {
    setDeletingQuote(false);
  }
}
