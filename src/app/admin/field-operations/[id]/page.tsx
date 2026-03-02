"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Package,
  Truck,
  ClipboardList,
  RefreshCw,
  ShoppingCart,
  Users,
  FileText,
  ExternalLink,
  UserPlus,
  Plus,
  Pencil,
  Trash2,
  Stethoscope,
  FilePlus,
} from "lucide-react";
import Link from "next/link";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { formatDate, formatPrice } from "@/lib/utils";
import { formatRUT } from "@/lib/utils/rut";
import { toast } from "sonner";
import {
  customerService,
  type Customer,
} from "@/lib/api/services/customerService";
import { quoteService, type Quote } from "@/lib/api/services";
import AddCustomerForm from "@/components/admin/AddCustomerForm";

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

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  draft: { label: "Borrador", variant: "outline" },
  prepared: { label: "Preparado", variant: "secondary" },
  in_progress: { label: "En terreno", variant: "default" },
  completed: { label: "Completado", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

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
  customer?: { first_name?: string; last_name?: string; email?: string };
}

export default function FieldOperationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const tabFromUrl = searchParams.get("tab");
  const defaultTab = [
    "resumen",
    "clientes",
    "presupuestos",
    "stock",
    "trabajos",
    "entrega",
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

  const statusConfig = STATUS_CONFIG[operation.status] || {
    label: operation.status,
    variant: "outline" as const,
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === operation.status) return;
    setUpdatingStatus(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };
      const response = await fetch(`/api/admin/field-operations/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error("Error al actualizar estado");
      setOperation((prev) => (prev ? { ...prev, status: newStatus } : null));
      toast.success("Estado actualizado");
    } catch {
      toast.error("Error al actualizar estado");
    } finally {
      setUpdatingStatus(false);
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
    } catch (e: any) {
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
    } catch (err: any) {
      toast.error(err?.message || "Error al eliminar cliente");
    } finally {
      setDeletingCustomer(false);
    }
  };

  const operativoReturnUrl = `/admin/field-operations/${id}?tab=clientes`;

  return (
    <div className="space-y-6">
      <Link
        href="/admin/field-operations"
        className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-admin-text-primary min-h-[44px] items-center"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" />
        Volver a operativos
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary tracking-tight truncate">
            {operation.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-admin-text-tertiary">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4 shrink-0" />
              {formatDate(operation.scheduled_date)}
            </span>
            {operation.location && (
              <span className="flex items-center gap-1 truncate max-w-full">
                <MapPin className="h-4 w-4 shrink-0" />
                {operation.location}
              </span>
            )}
          </div>
        </div>
        <Select
          value={operation.status}
          onValueChange={handleStatusChange}
          disabled={updatingStatus}
        >
          <SelectTrigger className="w-[160px] min-h-[44px] shrink-0 text-admin-text-primary border-admin-border-primary/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_CONFIG).map(([value, { label }]) => (
              <SelectItem
                key={value}
                value={value}
                className="text-admin-text-primary"
              >
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Link
          href={`/admin/pos?field_operation_id=${id}`}
          className="block rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] p-4 min-h-[44px] flex items-center gap-3"
        >
          <ShoppingCart className="h-5 w-5 shrink-0 text-admin-accent-primary" />
          <span className="font-medium text-admin-text-primary">Abrir POS</span>
          <ExternalLink className="h-4 w-4 ml-auto text-admin-text-tertiary" />
        </Link>
        <button
          type="button"
          onClick={() => setShowAddCustomer(true)}
          className="block w-full rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] p-4 min-h-[44px] flex items-center gap-3 text-left"
        >
          <Users className="h-5 w-5 shrink-0 text-admin-accent-primary" />
          <span className="font-medium text-admin-text-primary">Clientes</span>
          <UserPlus className="h-4 w-4 ml-auto text-admin-text-tertiary" />
        </button>
        <button
          type="button"
          onClick={() => setShowCreateQuote(true)}
          className="block w-full rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] p-4 min-h-[44px] flex items-center gap-3 text-left"
        >
          <FileText className="h-5 w-5 shrink-0 text-admin-accent-primary" />
          <span className="font-medium text-admin-text-primary">
            Presupuestos
          </span>
          <Plus className="h-4 w-4 ml-auto text-admin-text-tertiary" />
        </button>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4 sm:space-y-6">
        <TabsList className="flex w-full justify-start md:justify-center gap-1 sm:gap-2 h-auto p-1 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-admin-accent-primary/30 rounded-xl border border-admin-border-primary/20 bg-admin-bg-tertiary/50">
          <TabsTrigger
            value="resumen"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            value="clientes"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
          >
            Clientes
          </TabsTrigger>
          <TabsTrigger
            value="presupuestos"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
          >
            Presupuestos
          </TabsTrigger>
          <TabsTrigger
            value="stock"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
          >
            Stock Móvil
          </TabsTrigger>
          <TabsTrigger
            value="trabajos"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
          >
            Trabajos
          </TabsTrigger>
          <TabsTrigger
            value="entrega"
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
          >
            Entrega
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-4 mt-4 sm:mt-6">
          <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-admin-border-primary/20">
              <h3 className="text-admin-text-primary font-semibold">
                Información del operativo
              </h3>
            </div>
            <div className="p-4 sm:p-6 pt-0 space-y-2 text-admin-text-primary">
              <p>
                <strong>Nombre:</strong> {operation.name}
              </p>
              <p>
                <strong>Fecha:</strong> {formatDate(operation.scheduled_date)}
              </p>
              <p>
                <strong>Ubicación:</strong> {operation.location || "—"}
              </p>
              <p>
                <strong>Estado:</strong> {statusConfig.label}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="clientes" className="space-y-4 mt-4 sm:mt-6">
          <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-admin-border-primary/20 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
                <Users className="h-5 w-5 shrink-0" />
                Clientes del operativo
              </h3>
              <Button
                size="sm"
                onClick={() => setShowAddCustomer(true)}
                className="min-h-[44px] bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Nuevo cliente
              </Button>
            </div>
            <div className="overflow-x-auto">
              {customersLoading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
                </div>
              ) : customers.length === 0 ? (
                <p className="p-6 text-admin-text-tertiary text-sm">
                  No hay clientes vinculados a este operativo. Agregue un
                  cliente desde el botón arriba.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Nombre
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Email
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Teléfono
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        RUT
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((c) => (
                      <TableRow key={c.id} className="hover:bg-[#AE000025]">
                        <TableCell className="font-medium text-admin-text-primary">
                          {[c.first_name, c.last_name]
                            .filter(Boolean)
                            .join(" ") || "—"}
                        </TableCell>
                        <TableCell className="text-admin-text-tertiary">
                          {c.email || "—"}
                        </TableCell>
                        <TableCell className="text-admin-text-tertiary">
                          {c.phone || "—"}
                        </TableCell>
                        <TableCell className="text-admin-text-tertiary font-mono">
                          {c.rut ? formatRUT(c.rut) : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/admin/customers/${c.id}`}
                              className="text-admin-accent-primary hover:underline text-sm font-medium"
                            >
                              Ver
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setPrescriptionCustomerId(c.id);
                                setShowCreatePrescription(true);
                              }}
                              className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-admin-accent-primary text-sm"
                              title="Nueva receta"
                            >
                              <Stethoscope className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuoteInitialCustomerId(c.id);
                                setShowCreateQuote(true);
                              }}
                              className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-admin-accent-primary text-sm"
                              title="Nuevo presupuesto"
                            >
                              <FilePlus className="h-4 w-4" />
                            </button>
                            <Link
                              href={`/admin/customers/${c.id}/edit?return_to=${encodeURIComponent(operativoReturnUrl)}`}
                              className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-admin-accent-primary text-sm"
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteCustomerId(c.id)}
                              className="inline-flex items-center gap-1 text-admin-text-tertiary hover:text-red-500 text-sm"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="presupuestos" className="space-y-4 mt-4 sm:mt-6">
          <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-admin-border-primary/20 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
                <FileText className="h-5 w-5 shrink-0" />
                Presupuestos del operativo
              </h3>
              <Button
                size="sm"
                onClick={() => setShowCreateQuote(true)}
                className="min-h-[44px] bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo presupuesto
              </Button>
            </div>
            <div className="overflow-x-auto">
              {quotesLoading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
                </div>
              ) : quotes.length === 0 ? (
                <p className="p-6 text-admin-text-tertiary text-sm">
                  No hay presupuestos vinculados a este operativo. Cree uno
                  desde el botón arriba.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Nº
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Estado
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold text-right">
                        Total
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotes.map((q) => (
                      <TableRow key={q.id} className="hover:bg-[#AE000025]">
                        <TableCell className="font-medium text-admin-text-primary font-mono text-sm">
                          {q.quote_number || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {q.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-admin-text-primary">
                          {formatPrice(q.total_amount ?? 0)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/quotes/${q.id}`}
                            className="text-admin-accent-primary hover:underline text-sm font-medium"
                          >
                            Ver
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4 mt-4 sm:mt-6">
          <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-admin-border-primary/20">
              <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
                <Package className="h-5 w-5 shrink-0" />
                Stock en bodega móvil
              </h3>
            </div>
            <div className="p-4 sm:p-6 pt-0">
              {mobileStock.length === 0 ? (
                <p className="py-4 text-admin-text-tertiary">
                  No hay productos en la bodega móvil.{" "}
                  <Link
                    href={`/admin/field-operations/${id}/prepare`}
                    className="text-admin-accent-primary hover:underline"
                  >
                    Transferir stock
                  </Link>
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-admin-text-tertiary font-semibold">
                          Producto
                        </TableHead>
                        <TableHead className="text-admin-text-tertiary font-semibold">
                          SKU
                        </TableHead>
                        <TableHead className="text-admin-text-tertiary font-semibold text-right">
                          Cantidad
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mobileStock.map((item) => (
                        <TableRow
                          key={item.id}
                          className="hover:bg-[#AE000025]"
                        >
                          <TableCell className="font-medium text-admin-text-primary">
                            {item.products?.name || "—"}
                          </TableCell>
                          <TableCell className="text-admin-text-tertiary">
                            {item.products?.sku || "—"}
                          </TableCell>
                          <TableCell className="text-right text-admin-text-primary">
                            {item.quantity}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="trabajos" className="space-y-4 mt-4 sm:mt-6">
          <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-admin-border-primary/20">
              <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
                <ClipboardList className="h-5 w-5 shrink-0" />
                Trabajos del operativo
              </h3>
            </div>
            <div className="overflow-x-auto">
              {workOrdersLoading ? (
                <div className="p-8 flex justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-admin-text-tertiary" />
                </div>
              ) : workOrders.length === 0 ? (
                <p className="p-6 text-admin-text-tertiary text-sm">
                  No hay trabajos vinculados a este operativo.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Cliente
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Nº OT
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Estado
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold text-right">
                        Monto
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workOrders.map((wo) => (
                      <TableRow key={wo.id} className="hover:bg-[#AE000025]">
                        <TableCell className="text-admin-text-primary">
                          {wo.customer
                            ? `${wo.customer.first_name || ""} ${wo.customer.last_name || ""}`.trim() ||
                              wo.customer.email ||
                              "—"
                            : "—"}
                        </TableCell>
                        <TableCell className="text-admin-text-primary font-mono text-sm">
                          {wo.work_order_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {wo.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-admin-text-primary">
                          {formatPrice(wo.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/work-orders/${wo.id}`}
                            className="text-admin-accent-primary hover:underline text-sm font-medium"
                          >
                            Ver
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="entrega" className="space-y-4 mt-4 sm:mt-6">
          <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] p-4 sm:p-6">
            <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold mb-4">
              <Truck className="h-5 w-5 shrink-0" />
              Entrega en empresa
            </h3>
            {readyForPickupOrders.length === 0 ? (
              <p className="text-admin-text-tertiary text-sm">
                No hay trabajos listos para retiro (ready_for_pickup). Los
                trabajos aparecerán aquí cuando estén listos para entrega.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-admin-text-primary text-sm">
                    Trabajos a entregar
                  </Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border border-admin-border-primary/20 rounded-lg p-2">
                    {readyForPickupOrders.map((wo) => (
                      <label
                        key={wo.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#AE000010] cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={deliverSelectedIds.has(wo.id)}
                          onChange={(e) => {
                            setDeliverSelectedIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(wo.id);
                              else next.delete(wo.id);
                              return next;
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-admin-text-primary text-sm">
                          {wo.work_order_number} —{" "}
                          {wo.customer
                            ? `${wo.customer.first_name || ""} ${wo.customer.last_name || ""}`.trim() ||
                              "—"
                            : "—"}{" "}
                          ({formatPrice(wo.total_amount)})
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-admin-text-primary text-sm">
                    Nombre del receptor *
                  </Label>
                  <Input
                    value={deliverRecipient}
                    onChange={(e) => setDeliverRecipient(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className="mt-1 h-11 min-h-[44px] border-admin-border-primary/30"
                  />
                </div>
                <div>
                  <Label className="text-admin-text-primary text-sm">
                    Notas (opcional)
                  </Label>
                  <Input
                    value={deliverNotes}
                    onChange={(e) => setDeliverNotes(e.target.value)}
                    placeholder="Observaciones de la entrega"
                    className="mt-1 h-11 min-h-[44px] border-admin-border-primary/30"
                  />
                </div>
                <Button
                  onClick={handleDeliver}
                  disabled={
                    deliverLoading ||
                    deliverSelectedIds.size === 0 ||
                    !deliverRecipient.trim()
                  }
                  className="min-h-[44px] rounded-xl bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23]"
                >
                  {deliverLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Registrar entrega
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Customer Confirmation Dialog */}
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
              variant="outline"
              onClick={() => setDeleteCustomerId(null)}
              disabled={deletingCustomer}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCustomer}
              disabled={deletingCustomer}
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

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo cliente del operativo</DialogTitle>
            <DialogDescription>
              El cliente quedará vinculado a este operativo en terreno.
            </DialogDescription>
          </DialogHeader>
          <AddCustomerForm
            fieldOperationId={id}
            branchId={operation.branch_id}
            onSuccess={() => {
              setShowAddCustomer(false);
              fetchCustomers();
            }}
            onCancel={() => setShowAddCustomer(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Create Quote Dialog */}
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
            onSuccess={() => {
              setShowCreateQuote(false);
              setQuoteInitialCustomerId(undefined);
              fetchQuotes();
              fetchWorkOrders();
            }}
            onCancel={() => {
              setShowCreateQuote(false);
              setQuoteInitialCustomerId(undefined);
            }}
            initialCustomerId={quoteInitialCustomerId}
            initialFieldOperationId={id}
          />
        </DialogContent>
      </Dialog>

      {/* Create Prescription Dialog */}
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
              onSuccess={() => {
                setShowCreatePrescription(false);
                setPrescriptionCustomerId(null);
                fetchCustomers();
              }}
              onCancel={() => {
                setShowCreatePrescription(false);
                setPrescriptionCustomerId(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
