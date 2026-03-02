"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Eye,
  FileText,
  Calendar,
  User,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  RefreshCw,
  Settings,
  Trash2,
  ShoppingCart,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useBranch } from "@/hooks/useBranch";

// Lazy load CreateQuoteForm to reduce initial bundle size
const CreateQuoteForm = dynamic(
  () => import("@/components/admin/CreateQuoteForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epoch-primary mx-auto"></div>
          <p className="text-admin-text-tertiary">Cargando formulario...</p>
        </div>
      </div>
    ),
    ssr: false,
  },
);
import { formatDate, formatCurrency } from "@/lib/utils";
import { quoteService, Quote } from "@/lib/api/services";
import type { UpdateQuoteData } from "@/lib/api/services/quoteService";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";

export default function QuotesPage() {
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;
  const [operativoName, setOperativoName] = useState<string | null>(null);

  useEffect(() => {
    if (!fieldOperationIdFromUrl) {
      setOperativoName(null);
      return;
    }
    fetch(`/api/admin/field-operations/${fieldOperationIdFromUrl}`)
      .then((r) => r.json())
      .then((j) => setOperativoName(j?.data?.fieldOperation?.name ?? null))
      .catch(() => setOperativoName(null));
  }, [fieldOperationIdFromUrl]);

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateQuote, setShowCreateQuote] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const quotesPerPage = 20;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, [
    currentPage,
    statusFilter,
    currentBranchId,
    isGlobalView,
    fieldOperationIdFromUrl,
  ]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);

      const result = await quoteService.getQuotes({
        page: currentPage,
        limit: quotesPerPage,
        status: statusFilter !== "all" ? statusFilter : undefined,
        branch_id:
          isGlobalView && isSuperAdmin
            ? "global"
            : currentBranchId || undefined,
        search: searchTerm || undefined,
        field_operation_id: fieldOperationIdFromUrl || undefined,
      });

      setQuotes(result.data);
      setTotalPages(result.pagination.totalPages || 1);
      setTotalQuotes(result.pagination.total || 0);
    } catch (error) {
      console.error("Error fetching quotes:", error);
      toast.error("Error al cargar presupuestos");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, isConverted: boolean = false) => {
    // Always show the current status (which should be 'accepted' when converted)
    const displayStatus = status;

    const config: Record<string, { variant: any; label: string; icon: any }> = {
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

    const statusConfig = config[displayStatus] || {
      variant: "outline",
      label: displayStatus,
      icon: FileText,
    };
    const Icon = statusConfig.icon;

    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {statusConfig.label}
      </Badge>
    );
  };

  const filteredQuotes = quotes.filter((quote) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        quote.quote_number.toLowerCase().includes(searchLower) ||
        quote.customer?.email?.toLowerCase().includes(searchLower) ||
        `${quote.customer?.first_name || ""} ${quote.customer?.last_name || ""}`
          .toLowerCase()
          .includes(searchLower) ||
        quote.frame_name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const handleQuoteCreated = () => {
    setShowCreateQuote(false);
    fetchQuotes();
  };

  const handleDeleteClick = (quoteId: string) => {
    setQuoteToDelete(quoteId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!quoteToDelete) return;

    setDeleting(true);
    try {
      await quoteService.deleteQuote(quoteToDelete);

      toast.success("Presupuesto eliminado exitosamente");
      setDeleteDialogOpen(false);
      setQuoteToDelete(null);
      fetchQuotes();
    } catch (error: any) {
      console.error("Error deleting quote:", error);
      toast.error(error.message || "Error al eliminar presupuesto");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Operativo mode banner */}
      {fieldOperationIdFromUrl && (
        <div className="flex items-center justify-between gap-2 px-4 py-2 rounded-xl bg-admin-accent-primary/20 border border-admin-accent-primary/30">
          <span className="text-sm font-medium text-admin-text-primary">
            Presupuestos del operativo: {operativoName || "..."}
          </span>
          <Link
            href={`/admin/field-operations/${fieldOperationIdFromUrl}`}
            className="text-sm text-admin-accent-primary hover:underline font-medium"
          >
            Volver al operativo
          </Link>
        </div>
      )}

      {/* Header - multi-row */}
      <div className="flex flex-col gap-2 sm:gap-3">
        <div>
          <h1
            className="text-xl sm:text-2xl lg:text-3xl font-bold text-epoch-primary"
            data-tour="quotes-header"
          >
            Presupuestos
          </h1>
          <p className="text-xs sm:text-sm text-admin-text-tertiary">
            {isGlobalView
              ? "Gestiona presupuestos de todas las sucursales"
              : "Gestiona presupuestos para trabajos de lentes"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/quotes/settings">
            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 sm:w-auto sm:px-3"
              aria-label="Configuración"
            >
              <Settings className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Configuración</span>
            </Button>
          </Link>
          <Button
            onClick={() => setShowCreateQuote(true)}
            size="sm"
            className="h-9 gap-1.5"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm">Nuevo Presupuesto</span>
          </Button>
        </div>
      </div>

      {/* Filters - search wider, filter smaller on mobile */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
                <Input
                  placeholder="Buscar por número, cliente, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <div className="w-[140px] sm:w-[160px] md:w-[180px] shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="sent">Enviado</SelectItem>
                  <SelectItem value="accepted">Aceptado</SelectItem>
                  <SelectItem value="rejected">Rechazado</SelectItem>
                  <SelectItem value="expired">Expirado</SelectItem>
                  <SelectItem value="converted_to_work">Convertido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle>Presupuestos ({totalQuotes})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
              <p className="text-admin-text-tertiary">
                Cargando presupuestos...
              </p>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-epoch-primary mb-2">
                No hay presupuestos
              </h3>
              <p className="text-admin-text-tertiary mb-4">
                {searchTerm
                  ? "No se encontraron presupuestos que coincidan con la búsqueda"
                  : "Comienza creando tu primer presupuesto"}
              </p>
              {!searchTerm && (
                <Button onClick={() => setShowCreateQuote(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Presupuesto
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Marco</TableHead>
                      <TableHead>Lente</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Convertido</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          {quote.quote_number}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {quote.customer?.first_name || ""}{" "}
                              {quote.customer?.last_name || ""}
                            </div>
                            <div className="text-sm text-admin-text-tertiary">
                              {quote.customer?.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{quote.frame_name || "-"}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {quote.lens_type || "-"}
                            </div>
                            <div className="text-sm text-admin-text-tertiary">
                              {quote.lens_material || ""}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold text-admin-success">
                          {formatCurrency(quote.total_amount)}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const isConverted =
                              quote.status === "accepted" &&
                              !!quote.converted_to_work_order_id;
                            // Always show the current status (which should be 'accepted' when converted)
                            const displayStatus = quote.status;

                            return (
                              <Select
                                value={displayStatus}
                                disabled={isConverted}
                                onValueChange={async (value) => {
                                  const newStatus = value as
                                    | "draft"
                                    | "sent"
                                    | "accepted"
                                    | "rejected"
                                    | "expired"
                                    | "converted_to_work";
                                  if (isConverted) {
                                    toast.error(
                                      "No se puede cambiar el estado de un presupuesto convertido",
                                    );
                                    return;
                                  }

                                  try {
                                    await quoteService.updateQuote(quote.id, {
                                      status:
                                        newStatus as UpdateQuoteData["status"],
                                    });

                                    // Update local state
                                    setQuotes((prev) =>
                                      prev.map((q) =>
                                        q.id === quote.id
                                          ? {
                                              ...q,
                                              status:
                                                newStatus as Quote["status"],
                                            }
                                          : q,
                                      ),
                                    );
                                    toast.success("Estado actualizado");
                                  } catch (error) {
                                    console.error(
                                      "Error updating status:",
                                      error,
                                    );
                                    const errorMessage =
                                      error instanceof Error
                                        ? error.message
                                        : "Error al actualizar estado";
                                    toast.error(errorMessage);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-auto border-0 p-0 h-auto bg-transparent hover:bg-transparent focus:ring-0 focus:ring-offset-0 shadow-none [&>svg]:hidden [&_svg]:hidden [&_[data-radix-select-icon]]:hidden">
                                  <SelectValue asChild>
                                    <div
                                      className={`cursor-pointer ${isConverted ? "cursor-not-allowed opacity-75" : ""}`}
                                    >
                                      {getStatusBadge(
                                        displayStatus,
                                        isConverted,
                                      )}
                                    </div>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="draft">
                                    <div className="flex items-center gap-2">
                                      <FileText className="h-3 w-3" />
                                      Borrador
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="sent">
                                    <div className="flex items-center gap-2">
                                      <Send className="h-3 w-3" />
                                      Enviado
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="accepted">
                                    <div className="flex items-center gap-2">
                                      <CheckCircle className="h-3 w-3" />
                                      Aceptado
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="rejected">
                                    <div className="flex items-center gap-2">
                                      <XCircle className="h-3 w-3" />
                                      Rechazado
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="expired">
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-3 w-3" />
                                      Expirado
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {quote.converted_to_work_order_id ? (
                            <Badge
                              variant="default"
                              className="flex items-center gap-1 bg-green-600"
                            >
                              <RefreshCw className="h-3 w-3" />
                              Convertido
                            </Badge>
                          ) : (
                            <span className="text-admin-text-tertiary text-sm">
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{formatDate(quote.quote_date)}</div>
                            {quote.expiration_date && (
                              <div
                                className={`text-xs ${
                                  new Date(quote.expiration_date) < new Date()
                                    ? "text-red-500"
                                    : "text-admin-text-tertiary"
                                }`}
                              >
                                Exp: {formatDate(quote.expiration_date)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link href={`/admin/quotes/${quote.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Button>
                            </Link>
                            {quote.status !== "accepted" &&
                              !quote.converted_to_work_order_id && (
                                <Link href={`/admin/pos?quoteId=${quote.id}`}>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  >
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                    Cargar al POS
                                  </Button>
                                </Link>
                              )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteClick(quote.id)}
                              disabled={
                                quote.status === "accepted" ||
                                !!quote.converted_to_work_order_id
                              }
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-admin-text-tertiary">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateQuote} onOpenChange={setShowCreateQuote}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Crea un presupuesto para un trabajo de lentes
            </DialogDescription>
          </DialogHeader>
          <CreateQuoteForm
            onSuccess={handleQuoteCreated}
            onCancel={() => setShowCreateQuote(false)}
            initialFieldOperationId={fieldOperationIdFromUrl || undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
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
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setQuoteToDelete(null);
              }}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
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
    </div>
  );
}
