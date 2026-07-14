"use client";

import {
  RefreshCw,
  Trash2,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import AddCustomerForm from "@/components/admin/AddCustomerForm";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";
import { posService, type Quote, quoteService } from "@/lib/api/services";
import {
  type Customer,
  customerService,
} from "@/lib/api/services/customerService";
import { getBranchHeader } from "@/lib/utils/branch";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";

import FieldOpHeader from "./FieldOpHeader";
import FieldOpStatsCards from "./FieldOpStatsCards";
import FieldOpSummarySection from "./FieldOpSummarySection";
import FieldOpPatientRegistrations from "./FieldOpPatientRegistrations";
import FieldOpInventorySection from "./FieldOpInventorySection";
import FieldOpWorkOrdersSection from "./FieldOpWorkOrdersSection";
import { FieldOpQuotesTab } from "./FieldOpQuotesTab";
import { FieldOpDeliveryTab } from "./FieldOpDeliveryTab";

const CreateQuoteForm = dynamic(
  () => import("@/components/admin/CreateQuoteForm"),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
      </div>
    ),
    ssr: false,
  },
);

const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
      </div>
    ),
    ssr: false,
  },
);

interface FieldOperation {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  branch_id: string;
  status: string;
  created_at: string;
}

interface MobileStockItem {
  id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  products?: { id: string; name: string; sku: string | null };
}

interface WorkOrderItem {
  id: string;
  work_order_number: string;
  status: string;
  total_amount: number;
  payment_status?: string;
  frame_name?: string;
  lens_type?: string;
  lens_material?: string;
  lab_name?: string;
  customer?: { first_name?: string; last_name?: string; email?: string };
}

export default function FieldOpDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = [
    "resumen",
    "clientes",
    "presupuestos",
    "trabajos",
    "entrega",
    "stock",
  ].includes(tabFromUrl || "")
    ? tabFromUrl!
    : "resumen";
  const { currentBranchId } = useBranch();
  const [operation, setOperation] = useState<FieldOperation | null>(null);
  const [mobileStock, setMobileStock] = useState<MobileStockItem[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deliverLoading, setDeliverLoading] = useState(false);
  const [deliverRecipient, setDeliverRecipient] = useState("");
  const [deliverNotes, setDeliverNotes] = useState("");
  const [deliverSelectedIds, setDeliverSelectedIds] = useState<Set<string>>(
    new Set(),
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [quoteInitialCustomerId, setQuoteInitialCustomerId] = useState<
    string | undefined
  >(undefined);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [prescriptionCustomerId, setPrescriptionCustomerId] = useState<
    string | null
  >(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [cashStatus, setCashStatus] = useState<{
    isOpen: boolean;
    session?: { opening_cash_amount?: number };
  } | null>(null);
  const [loadingCashStatus, setLoadingCashStatus] = useState(false);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [openingCashAmount, setOpeningCashAmount] = useState("");
  const [openingCash, setOpeningCash] = useState(false);
  const [returningStock, setReturningStock] = useState(false);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchWorkOrders = async () => {
    if (!id) return;
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
  };

  useEffect(() => {
    if (operation) fetchWorkOrders();
  }, [operation?.id]);

  const fetchCustomers = async () => {
    if (!id || !operation) return;
    setCustomersLoading(true);
    try {
      const { data } = await customerService.getCustomers({
        branchId: operation.branch_id,
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
  };

  const fetchQuotes = async () => {
    if (!id) return;
    setQuotesLoading(true);
    try {
      const result = await quoteService.getQuotes({
        branch_id: operation?.branch_id,
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
  };

  const fetchCashStatus = async () => {
    if (!operation?.branch_id || !id) return;
    setLoadingCashStatus(true);
    try {
      const status = await posService.getCashStatus(operation.branch_id, id);
      setCashStatus({
        isOpen: status?.isOpen ?? false,
        session: status?.session,
      });
    } catch {
      setCashStatus(null);
    } finally {
      setLoadingCashStatus(false);
    }
  };

  useEffect(() => {
    if (operation) fetchCashStatus();
  }, [operation?.id, operation?.branch_id]);

  const handleOpenCash = async () => {
    const amount = parseFloat(openingCashAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error("Ingrese un monto válido");
      return;
    }
    if (!operation?.branch_id || !id) return;
    setOpeningCash(true);
    try {
      const headers = getBranchAndOperativoHeaders(operation.branch_id, id);
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
      fetchCashStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al abrir caja");
    } finally {
      setOpeningCash(false);
    }
  };

  useEffect(() => {
    if (operation) {
      fetchCustomers();
      fetchQuotes();
    }
  }, [operation?.id]);

  const fetchDetail = async () => {
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
    } catch (error) {
      toast.error("Error al cargar operativo");
      router.push("/admin/field-operations");
    } finally {
      setLoading(false);
    }
  };

  if (loading || !operation) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
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
      if (newStatus === "completed") fetchDetail();
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReturnStock = async () => {
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
      fetchDetail();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al devolver stock");
    } finally {
      setReturningStock(false);
    }
  };

  const handleDeliver = async () => {
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
      fetchWorkOrders();
      fetchDetail();
    } catch (e: unknown) {
      toast.error(e?.message || "Error al registrar entrega");
    } finally {
      setDeliverLoading(false);
    }
  };

  const readyForPickupOrders = workOrders.filter(
    (wo) => wo.status === "ready_for_pickup",
  );

  const handleDeleteCustomer = async () => {
    if (!deleteCustomerId) return;
    setDeletingCustomer(true);
    try {
      await customerService.deleteCustomer(deleteCustomerId);
      toast.success("Cliente eliminado");
      setDeleteCustomerId(null);
      fetchCustomers();
    } catch (err: unknown) {
      toast.error(err?.message || "Error al eliminar cliente");
    } finally {
      setDeletingCustomer(false);
    }
  };

  const handleDeleteQuoteClick = (quoteId: string) => {
    setDeleteQuoteId(quoteId);
  };

  const handleDeleteQuoteConfirm = async () => {
    if (!deleteQuoteId) return;
    setDeletingQuote(true);
    try {
      await quoteService.deleteQuote(deleteQuoteId);
      toast.success("Presupuesto eliminado");
      setDeleteQuoteId(null);
      fetchQuotes();
    } catch (err: unknown) {
      toast.error(err?.message || "Error al eliminar presupuesto");
    } finally {
      setDeletingQuote(false);
    }
  };

  const operativoReturnUrl = `/admin/field-operations/${id}?tab=clientes`;

  const statusLabels: Record<string, string> = {
    draft: "Borrador",
    prepared: "Preparado",
    in_progress: "En terreno",
    completed: "Completado",
    cancelled: "Cancelado",
  };
  const statusLabel = statusLabels[operation.status] || operation.status;

  return (
    <div className="space-y-6">
      <FieldOpHeader
        operation={operation}
        updatingStatus={updatingStatus}
        handleStatusChange={handleStatusChange}
        mobileStock={mobileStock}
      />

      <FieldOpStatsCards
        id={id}
        operation={operation}
        cashStatus={cashStatus}
        loadingCashStatus={loadingCashStatus}
        onOpenCash={() => setShowOpenCashDialog(true)}
        onAddCustomer={() => setShowAddCustomer(true)}
        onCreateQuote={() => setShowCreateQuote(true)}
      />

      <Tabs className="space-y-4 sm:space-y-6" defaultValue={defaultTab}>
        <TabsList className="flex w-full justify-start md:justify-center gap-1 sm:gap-2 h-auto p-1 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-admin-accent-primary/30 rounded-xl border border-admin-border-primary/20 bg-admin-bg-tertiary/50">
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="resumen"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="clientes"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="presupuestos"
          >
            Presupuestos
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="trabajos"
          >
            Trabajos
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="entrega"
          >
            Entrega
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="stock"
          >
            Stock Móvil
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="resumen">
          <FieldOpSummarySection
            operation={operation}
            statusLabel={statusLabel}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="clientes">
          <FieldOpPatientRegistrations
            customers={customers}
            customersLoading={customersLoading}
            onAddCustomer={() => setShowAddCustomer(true)}
            operativoReturnUrl={operativoReturnUrl}
            onPrescription={(customerId) => {
              setPrescriptionCustomerId(customerId);
              setShowCreatePrescription(true);
            }}
            onQuote={(customerId) => {
              setQuoteInitialCustomerId(customerId);
              setShowCreateQuote(true);
            }}
            onDeleteCustomer={(customerId) => setDeleteCustomerId(customerId)}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="presupuestos">
          <FieldOpQuotesTab
            quotes={quotes}
            quotesLoading={quotesLoading}
            fieldOperationId={id}
            onCreateQuote={() => setShowCreateQuote(true)}
            onDeleteQuote={handleDeleteQuoteClick}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="stock">
          <FieldOpInventorySection
            mobileStock={mobileStock}
            id={id}
            returningStock={returningStock}
            onReturnStock={handleReturnStock}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="trabajos">
          <FieldOpWorkOrdersSection
            workOrders={workOrders}
            workOrdersLoading={workOrdersLoading}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="entrega">
          <FieldOpDeliveryTab
            readyForPickupOrders={readyForPickupOrders}
            deliverSelectedIds={deliverSelectedIds}
            deliverRecipient={deliverRecipient}
            deliverNotes={deliverNotes}
            deliverLoading={deliverLoading}
            onDeliverSelectedIdsChange={setDeliverSelectedIds}
            onDeliverRecipientChange={setDeliverRecipient}
            onDeliverNotesChange={setDeliverNotes}
            onDeliver={handleDeliver}
          />
        </TabsContent>
      </Tabs>

      <Dialog
        open={deleteCustomerId !== null}
        onOpenChange={(open) => !open && setDeleteCustomerId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar cliente?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El cliente será eliminado
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={deletingCustomer}
              variant="outline"
              onClick={() => setDeleteCustomerId(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={deletingCustomer}
              variant="destructive"
              onClick={handleDeleteCustomer}
            >
              {deletingCustomer ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteQuoteId !== null}
        onOpenChange={(open) => !open && setDeleteQuoteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Eliminar presupuesto?</DialogTitle>
            <DialogDescription>
              Esta acción no se puede deshacer. El presupuesto será eliminado
              permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={deletingQuote}
              variant="outline"
              onClick={() => setDeleteQuoteId(null)}
            >
              Cancelar
            </Button>
            <Button
              disabled={deletingQuote}
              variant="destructive"
              onClick={handleDeleteQuoteConfirm}
            >
              {deletingQuote ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente del operativo</DialogTitle>
            <DialogDescription>
              El cliente quedará vinculado a este operativo en terreno.
            </DialogDescription>
          </DialogHeader>
          <AddCustomerForm
            branchId={operation.branch_id}
            fieldOperationId={id}
            onCancel={() => setShowAddCustomer(false)}
            onSuccess={() => {
              setShowAddCustomer(false);
              fetchCustomers();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreateQuote}
        onOpenChange={(open) => {
          setShowCreateQuote(open);
          if (!open) setQuoteInitialCustomerId(undefined);
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo presupuesto</DialogTitle>
            <DialogDescription>
              {quoteInitialCustomerId
                ? "Presupuesto para el cliente seleccionado."
                : "Solo se mostrarán clientes vinculados a este operativo."}
            </DialogDescription>
          </DialogHeader>
          <CreateQuoteForm
            initialBranchId={operation?.branch_id}
            initialCustomerId={quoteInitialCustomerId}
            initialFieldOperationId={id}
            onCancel={() => {
              setShowCreateQuote(false);
              setQuoteInitialCustomerId(undefined);
            }}
            onSuccess={() => {
              setShowCreateQuote(false);
              setQuoteInitialCustomerId(undefined);
              fetchQuotes();
              fetchWorkOrders();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={showOpenCashDialog}
        onOpenChange={(open) => {
          setShowOpenCashDialog(open);
          if (!open) setOpeningCashAmount("");
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir caja del operativo</DialogTitle>
            <DialogDescription>
              Ingrese el monto inicial de efectivo para abrir la caja.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label
                className="text-sm font-medium text-admin-text-primary"
                htmlFor="opening-cash"
              >
                Monto inicial
              </label>
              <Input
                className="mt-1"
                id="opening-cash"
                min={0}
                placeholder="0"
                step={0.01}
                type="number"
                value={openingCashAmount}
                onChange={(e) => setOpeningCashAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={openingCash}
              variant="outline"
              onClick={() => {
                setShowOpenCashDialog(false);
                setOpeningCashAmount("");
              }}
            >
              Cancelar
            </Button>
            <Button disabled={openingCash} onClick={handleOpenCash}>
              {openingCash ? "Abriendo…" : "Abrir caja"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showCreatePrescription}
        onOpenChange={(open) => {
          setShowCreatePrescription(open);
          if (!open) setPrescriptionCustomerId(null);
        }}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva receta</DialogTitle>
            <DialogDescription>
              Crear receta para el cliente del operativo.
            </DialogDescription>
          </DialogHeader>
          {prescriptionCustomerId && (
            <CreatePrescriptionForm
              customerId={prescriptionCustomerId}
              onCancel={() => {
                setShowCreatePrescription(false);
                setPrescriptionCustomerId(null);
              }}
              onSuccess={() => {
                setShowCreatePrescription(false);
                setPrescriptionCustomerId(null);
                fetchCustomers();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
