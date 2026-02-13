"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { extractDataFromResponse, extractPaginationFromResponse } from "@/lib/api/response-helpers";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  MessageSquare,
  Plus,
  ArrowRight,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Send,
  User,
  Package,
  Calendar,
  Receipt,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createOpticalInternalSupportTicketSchema,
  createOpticalInternalSupportMessageSchema,
} from "@/lib/api/validation/zod-schemas";
import type { z } from "zod";
import { useBranch } from "@/hooks/useBranch";

type TicketForm = z.infer<typeof createOpticalInternalSupportTicketSchema>;
type MessageForm = z.infer<typeof createOpticalInternalSupportMessageSchema>;

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  last_response_at: string | null;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  assigned_to_user?: {
    id: string;
    email: string;
    role: string;
  } | null;
  branch?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

const statusLabels: Record<string, string> = {
  open: "Abierto",
  assigned: "Asignado",
  in_progress: "En Progreso",
  waiting_customer: "Esperando Cliente",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  assigned: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-purple-100 text-purple-800",
  waiting_customer: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-800",
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const priorityLabels: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const categoryLabels: Record<string, string> = {
  lens_issue: "Problema con Lente",
  frame_issue: "Problema con Marco",
  prescription_issue: "Problema con Receta",
  delivery_issue: "Problema con Entrega",
  payment_issue: "Problema con Pago",
  appointment_issue: "Problema con Cita",
  customer_complaint: "Queja del Cliente",
  quality_issue: "Problema de Calidad",
  other: "Otro",
};

export default function OpticalInternalSupportPage() {
  const router = useRouter();
  const { currentBranchId } = useBranch();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [customers, setCustomers] = useState<
    Array<{ id: string; first_name: string; last_name: string; email: string }>
  >([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    category: "all",
    branch_id: "all",
    customer_id: "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const {
    register: registerTicket,
    handleSubmit: handleSubmitTicket,
    formState: { errors: ticketErrors },
    reset: resetTicket,
    watch: watchTicket,
    setValue: setTicketValue,
  } = useForm<any>({
    resolver: zodResolver(createOpticalInternalSupportTicketSchema),
    defaultValues: {
      priority: "medium",
      category: "other",
      branch_id: currentBranchId || undefined,
    },
  });

  // Cargar clientes cuando se abre el diálogo
  useEffect(() => {
    if (showCreateDialog) {
      loadCustomers();
    }
  }, [showCreateDialog]);

  // Actualizar branch_id cuando cambia currentBranchId
  useEffect(() => {
    if (currentBranchId && !watchTicket("branch_id")) {
      setTicketValue("branch_id", currentBranchId);
    }
  }, [currentBranchId, setTicketValue, watchTicket]);

  useEffect(() => {
    loadTickets();
  }, [filters, pagination.page, currentBranchId]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    try {
      const response = await fetch("/api/admin/customers?limit=100");
      if (response.ok) {
        const data = await response.json();
        setCustomers(extractDataFromResponse<any>(data));
      }
    } catch (err) {
      console.error("Error loading customers:", err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (filters.status && filters.status !== "all")
        params.append("status", filters.status);
      if (filters.priority && filters.priority !== "all")
        params.append("priority", filters.priority);
      if (filters.category && filters.category !== "all")
        params.append("category", filters.category);
      if (filters.branch_id && filters.branch_id !== "all")
        params.append("branch_id", filters.branch_id);
      if (filters.customer_id && filters.customer_id !== "all")
        params.append("customer_id", filters.customer_id);
      if (filters.search) params.append("search", filters.search);

      const response = await fetch(
        `/api/admin/optical-support/tickets?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar tickets");
      }

      const data = await response.json();
      const tickets = extractDataFromResponse<Ticket>(data);
      const paginationData = extractPaginationFromResponse(data);
      setTickets(tickets);
      setPagination((prev) => ({
        ...prev,
        total: paginationData.total || 0,
        totalPages: paginationData.totalPages || 0,
      }));
    } catch (err) {
      toast.error("Error al cargar tickets");
    } finally {
      setLoadingTickets(false);
    }
  };

  const onSubmitTicket: SubmitHandler<any> = async (data) => {
    setCreatingTicket(true);
    try {
      const response = await fetch("/api/admin/optical-support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Error al crear ticket");
      }

      const result = await response.json();
      toast.success("Ticket creado exitosamente");
      setShowCreateDialog(false);
      resetTicket();
      loadTickets();
      // Redirigir al ticket creado
      if (result.ticket?.id) {
        router.push(`/admin/support/tickets/${result.ticket.id}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear ticket");
    } finally {
      setCreatingTicket(false);
    }
  };

  const openTicketsCount = tickets.filter(
    (t) => t.status !== "resolved" && t.status !== "closed",
  ).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Soporte Interno</h1>
          <p className="text-gray-600 mt-2">
            Gestiona problemas internos con clientes (lentes, entregas, pagos,
            etc.)
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Ticket
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold">{pagination.total}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Abiertos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {openTicketsCount}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">En Progreso</p>
                <p className="text-2xl font-bold text-purple-600">
                  {tickets.filter((t) => t.status === "in_progress").length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resueltos</p>
                <p className="text-2xl font-bold text-green-600">
                  {
                    tickets.filter(
                      (t) => t.status === "resolved" || t.status === "closed",
                    ).length
                  }
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={filters.status}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, status: value, page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={filters.priority}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, priority: value, page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  {Object.entries(priorityLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={filters.category}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, category: value, page: 1 }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Select
                value={filters.customer_id}
                onValueChange={(value) =>
                  setFilters((prev) => ({
                    ...prev,
                    customer_id: value,
                    page: 1,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los clientes</SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.first_name} {customer.last_name} (
                      {customer.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ticket #, asunto..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      search: e.target.value,
                      page: 1,
                    }))
                  }
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={loadTickets}
                  title="Refrescar"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets ({pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTickets ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No hay tickets</p>
              <p className="text-sm mb-4">
                {(filters.status && filters.status !== "all") ||
                  (filters.priority && filters.priority !== "all") ||
                  (filters.category && filters.category !== "all") ||
                  filters.search
                  ? "No hay tickets que coincidan con los filtros"
                  : "Crea tu primer ticket de soporte interno"}
              </p>
              {(!filters.status || filters.status === "all") &&
                (!filters.priority || filters.priority === "all") &&
                (!filters.category || filters.category !== "all") &&
                !filters.search && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Ticket
                  </Button>
                )}
            </div>
          ) : (
            <div className="space-y-2">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/admin/support/tickets/${ticket.id}`}
                >
                  <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-semibold text-sm">
                          {ticket.ticket_number}
                        </span>
                        <Badge className={statusColors[ticket.status]}>
                          {statusLabels[ticket.status]}
                        </Badge>
                        <Badge className={priorityColors[ticket.priority]}>
                          {priorityLabels[ticket.priority]}
                        </Badge>
                        <Badge variant="outline">
                          {categoryLabels[ticket.category]}
                        </Badge>
                        {ticket.branch && (
                          <Badge variant="outline" className="text-xs">
                            {ticket.branch.name}
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900">
                        {ticket.subject}
                      </h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
                        {ticket.customer && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ticket.customer.first_name}{" "}
                            {ticket.customer.last_name}
                          </span>
                        )}
                        {ticket.assigned_to_user && (
                          <span>
                            Asignado a: {ticket.assigned_to_user.email}
                          </span>
                        )}
                        <span>
                          {new Date(ticket.created_at).toLocaleDateString(
                            "es-CL",
                          )}
                        </span>
                        {ticket.last_response_at && (
                          <span>
                            Última respuesta:{" "}
                            {new Date(
                              ticket.last_response_at,
                            ).toLocaleDateString("es-CL")}
                          </span>
                        )}
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-gray-400" />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-gray-600">
                Página {pagination.page} de {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.max(1, prev.page - 1),
                    }))
                  }
                  disabled={pagination.page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(prev.totalPages, prev.page + 1),
                    }))
                  }
                  disabled={pagination.page === pagination.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear Ticket de Soporte Interno</DialogTitle>
            <DialogDescription>
              Registra un problema interno relacionado con un cliente (lente,
              entrega, pago, etc.)
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={handleSubmitTicket(onSubmitTicket)}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">
                  Categoría <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watchTicket("category")}
                  onValueChange={(value) => setTicketValue("category", value as any)}
                >
                  <SelectTrigger
                    id="category"
                    className={ticketErrors.category ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ticketErrors.category && (
                  <p className="text-sm text-red-500">
                    {String(ticketErrors.category.message)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">
                  Prioridad <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={watchTicket("priority")}
                  onValueChange={(value) => setTicketValue("priority", value as any)}
                >
                  <SelectTrigger
                    id="priority"
                    className={ticketErrors.priority ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Selecciona una prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ticketErrors.priority && (
                  <p className="text-sm text-red-500">
                    {String(ticketErrors.priority.message)}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer_id">Cliente (opcional)</Label>
              <Select
                value={watchTicket("customer_id") || "__none__"}
                onValueChange={(value) =>
                  setTicketValue(
                    "customer_id",
                    value === "__none__" ? undefined : value,
                  )
                }
              >
                <SelectTrigger id="customer_id">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sin cliente</SelectItem>
                  {loadingCustomers ? (
                    <SelectItem value="__loading__" disabled>
                      Cargando clientes...
                    </SelectItem>
                  ) : (
                    customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.first_name} {customer.last_name} (
                        {customer.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                Si el problema está relacionado con un cliente específico
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">
                Asunto <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                {...registerTicket("subject")}
                placeholder="Resumen breve del problema"
                className={ticketErrors.subject ? "border-red-500" : ""}
              />
              {ticketErrors.subject && (
                <p className="text-sm text-red-500">
                  {String(ticketErrors.subject.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Descripción <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                {...registerTicket("description")}
                placeholder="Describe el problema en detalle..."
                rows={6}
                className={ticketErrors.description ? "border-red-500" : ""}
              />
              {ticketErrors.description && (
                <p className="text-sm text-red-500">
                  {String(ticketErrors.description.message)}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Mínimo 10 caracteres. Describe el problema y cómo se resolvió o
                se está resolviendo.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={creatingTicket}>
                {creatingTicket ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Crear Ticket
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
