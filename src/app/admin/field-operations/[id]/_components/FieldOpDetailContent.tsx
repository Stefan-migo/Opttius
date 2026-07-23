"use client";

import { RefreshCw } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";
import type { Quote } from "@/lib/api/services";
import type { Customer } from "@/lib/api/services/customerService";

import { FieldOpDeliveryTab } from "./FieldOpDeliveryTab";
import * as DL from "./FieldOpDetailDataLayer";
import {
  AddCustomerDialog,
  ConfirmDeleteDialog,
  CreatePrescriptionDialog,
  CreateQuoteDialog,
  OpenCashDialog,
} from "./FieldOpDetailDialogs";
import type { FieldOperation, MobileStockItem, WorkOrderItem } from "./FieldOpDetailTypes";
import FieldOpHeader from "./FieldOpHeader";
import FieldOpInventorySection from "./FieldOpInventorySection";
import FieldOpPatientRegistrations from "./FieldOpPatientRegistrations";
import { FieldOpQuotesTab } from "./FieldOpQuotesTab";
import FieldOpStatsCards from "./FieldOpStatsCards";
import FieldOpSummarySection from "./FieldOpSummarySection";
import FieldOpWorkOrdersSection from "./FieldOpWorkOrdersSection";

export default function FieldOpDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = [
    "resumen", "clientes", "presupuestos", "trabajos", "entrega", "stock",
  ].includes(tabFromUrl || "") ? tabFromUrl! : "resumen";
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
  const [deliverSelectedIds, setDeliverSelectedIds] = useState<Set<string>>(new Set());
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [quoteInitialCustomerId, setQuoteInitialCustomerId] = useState<string | undefined>(undefined);
  const [showCreatePrescription, setShowCreatePrescription] = useState(false);
  const [prescriptionCustomerId, setPrescriptionCustomerId] = useState<string | null>(null);
  const [deleteCustomerId, setDeleteCustomerId] = useState<string | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);
  const [deleteQuoteId, setDeleteQuoteId] = useState<string | null>(null);
  const [deletingQuote, setDeletingQuote] = useState(false);
  const [cashStatus, setCashStatus] = useState<{ isOpen: boolean; session?: { opening_cash_amount?: number } } | null>(null);
  const [loadingCashStatus, setLoadingCashStatus] = useState(false);
  const [showOpenCashDialog, setShowOpenCashDialog] = useState(false);
  const [openingCashAmount, setOpeningCashAmount] = useState("");
  const [openingCash, setOpeningCash] = useState(false);
  const [returningStock, setReturningStock] = useState(false);

  const doFetchDetail = () =>
    DL.fetchDetail(id, currentBranchId, setOperation, setMobileStock, setLoading, () => router.push("/admin/field-operations"));

  useEffect(() => { if (id) doFetchDetail(); }, [id]);

  useEffect(() => { if (operation) DL.fetchWorkOrders(id, currentBranchId, setWorkOrders, setWorkOrdersLoading); }, [operation?.id]);

  useEffect(() => {
    if (operation) {
      DL.fetchCustomers(id, operation.branch_id, setCustomers, setCustomersLoading);
      DL.fetchQuotes(id, operation.branch_id, setQuotes, setQuotesLoading);
    }
  }, [operation?.id]);

  useEffect(() => {
    if (operation) DL.fetchCashStatus(operation.branch_id, id, setCashStatus, setLoadingCashStatus);
  }, [operation?.id, operation?.branch_id]);

  if (loading || !operation)
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );

  const handleStatusChange = (newStatus: string) =>
    DL.handleStatusChange(newStatus, operation, id, currentBranchId, setUpdatingStatus, setOperation, doFetchDetail);
  const handleReturnStock = () =>
    DL.handleReturnStock(operation, id, mobileStock, setReturningStock, doFetchDetail);
  const handleDeliver = () =>
    DL.handleDeliver(deliverSelectedIds, deliverRecipient, deliverNotes, id, currentBranchId, setDeliverLoading, setDeliverRecipient, setDeliverNotes, setDeliverSelectedIds, () => { doFetchDetail(); DL.fetchWorkOrders(id, currentBranchId, setWorkOrders, setWorkOrdersLoading); });
  const handleDeleteCustomer = () =>
    DL.handleDeleteCustomer(deleteCustomerId!, setDeletingCustomer, setDeleteCustomerId, () => DL.fetchCustomers(id, operation.branch_id, setCustomers, setCustomersLoading));
  const handleDeleteQuoteClick = (quoteId: string) => setDeleteQuoteId(quoteId);
  const handleDeleteQuoteConfirm = () =>
    DL.handleDeleteQuote(deleteQuoteId!, setDeletingQuote, setDeleteQuoteId, () => DL.fetchQuotes(id, operation.branch_id, setQuotes, setQuotesLoading));

  const readyForPickupOrders = workOrders.filter((wo) => wo.status === "ready_for_pickup");
  const operativoReturnUrl = `/admin/field-operations/${id}?tab=clientes`;

  const statusLabels: Record<string, string> = {
    draft: "Borrador", prepared: "Preparado", in_progress: "En terreno", completed: "Completado", cancelled: "Cancelado",
  };
  const statusLabel = statusLabels[operation.status] || operation.status;

  return (
    <div className="space-y-6">
      <FieldOpHeader
        handleStatusChange={handleStatusChange}
        mobileStock={mobileStock}
        operation={operation}
        updatingStatus={updatingStatus}
      />

      <FieldOpStatsCards
        cashStatus={cashStatus}
        id={id}
        loadingCashStatus={loadingCashStatus}
        operation={operation}
        onAddCustomer={() => setShowAddCustomer(true)}
        onCreateQuote={() => setShowCreateQuote(true)}
        onOpenCash={() => setShowOpenCashDialog(true)}
      />

      <Tabs className="space-y-4 sm:space-y-6" defaultValue={defaultTab}>
        <TabsList className="flex w-full justify-start md:justify-center gap-1 sm:gap-2 h-auto p-1 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-admin-accent-primary/30 rounded-xl border border-admin-border-primary/20 bg-admin-bg-tertiary/50">
          <TabsTrigger className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" value="resumen">Resumen</TabsTrigger>
          <TabsTrigger className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" value="clientes">Clientes</TabsTrigger>
          <TabsTrigger className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" value="presupuestos">Presupuestos</TabsTrigger>
          <TabsTrigger className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" value="trabajos">Trabajos</TabsTrigger>
          <TabsTrigger className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" value="entrega">Entrega</TabsTrigger>
          <TabsTrigger className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]" value="stock">Stock Móvil</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="resumen">
          <FieldOpSummarySection operation={operation} statusLabel={statusLabel} />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="clientes">
          <FieldOpPatientRegistrations
            customers={customers}
            customersLoading={customersLoading}
            operativoReturnUrl={operativoReturnUrl}
            onAddCustomer={() => setShowAddCustomer(true)}
            onDeleteCustomer={(customerId) => setDeleteCustomerId(customerId)}
            onPrescription={(customerId) => { setPrescriptionCustomerId(customerId); setShowCreatePrescription(true); }}
            onQuote={(customerId) => { setQuoteInitialCustomerId(customerId); setShowCreateQuote(true); }}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="presupuestos">
          <FieldOpQuotesTab
            fieldOperationId={id}
            quotes={quotes}
            quotesLoading={quotesLoading}
            onCreateQuote={() => setShowCreateQuote(true)}
            onDeleteQuote={handleDeleteQuoteClick}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="stock">
          <FieldOpInventorySection
            id={id}
            mobileStock={mobileStock}
            returningStock={returningStock}
            onReturnStock={handleReturnStock}
          />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="trabajos">
          <FieldOpWorkOrdersSection workOrders={workOrders} workOrdersLoading={workOrdersLoading} />
        </TabsContent>

        <TabsContent className="space-y-4 mt-4 sm:mt-6" value="entrega">
          <FieldOpDeliveryTab
            deliverLoading={deliverLoading}
            deliverNotes={deliverNotes}
            deliverRecipient={deliverRecipient}
            deliverSelectedIds={deliverSelectedIds}
            readyForPickupOrders={readyForPickupOrders}
            onDeliver={handleDeliver}
            onDeliverNotesChange={setDeliverNotes}
            onDeliverRecipientChange={setDeliverRecipient}
            onDeliverSelectedIdsChange={setDeliverSelectedIds}
          />
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        description="Esta acción no se puede deshacer. El cliente será eliminado permanentemente."
        loading={deletingCustomer}
        open={deleteCustomerId !== null}
        title="¿Eliminar cliente?"
        onCancel={() => setDeleteCustomerId(null)}
        onConfirm={handleDeleteCustomer}
      />
      <ConfirmDeleteDialog
        description="Esta acción no se puede deshacer. El presupuesto será eliminado permanentemente."
        loading={deletingQuote}
        open={deleteQuoteId !== null}
        title="¿Eliminar presupuesto?"
        onCancel={() => setDeleteQuoteId(null)}
        onConfirm={handleDeleteQuoteConfirm}
      />
      <AddCustomerDialog
        branchId={operation.branch_id}
        fieldOperationId={id}
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        onSuccess={() => { setShowAddCustomer(false); DL.fetchCustomers(id, operation.branch_id, setCustomers, setCustomersLoading); }}
      />
      <CreateQuoteDialog
        branchId={operation.branch_id}
        fieldOperationId={id}
        initialCustomerId={quoteInitialCustomerId}
        open={showCreateQuote}
        onCancel={() => setQuoteInitialCustomerId(undefined)}
        onOpenChange={setShowCreateQuote}
        onSuccess={() => { setShowCreateQuote(false); setQuoteInitialCustomerId(undefined); DL.fetchQuotes(id, operation.branch_id, setQuotes, setQuotesLoading); DL.fetchWorkOrders(id, currentBranchId, setWorkOrders, setWorkOrdersLoading); }}
      />
      <OpenCashDialog
        amount={openingCashAmount}
        loading={openingCash}
        open={showOpenCashDialog}
        onAmountChange={setOpeningCashAmount}
        onConfirm={() => DL.handleOpenCash(openingCashAmount, id, operation.branch_id, setOpeningCash, setShowOpenCashDialog, setOpeningCashAmount, () => DL.fetchCashStatus(operation.branch_id, id, setCashStatus, setLoadingCashStatus))}
        onOpenChange={(o) => { setShowOpenCashDialog(o); if (!o) setOpeningCashAmount(""); }}
      />
      <CreatePrescriptionDialog
        customerId={prescriptionCustomerId}
        open={showCreatePrescription}
        onCancel={() => setPrescriptionCustomerId(null)}
        onOpenChange={(o) => { setShowCreatePrescription(o); if (!o) setPrescriptionCustomerId(null); }}
        onSuccess={() => { setShowCreatePrescription(false); setPrescriptionCustomerId(null); DL.fetchCustomers(id, operation.branch_id, setCustomers, setCustomersLoading); }}
      />
    </div>
  );
}
