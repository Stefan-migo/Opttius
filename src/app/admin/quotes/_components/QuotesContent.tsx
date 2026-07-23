"use client";

import { FileText, Plus, RefreshCw, Search, Settings } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBranch } from "@/hooks/useBranch";

const CreateQuoteForm = dynamic(() => import("@/components/admin/CreateQuoteForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-12">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-epoch-primary mx-auto" />
        <p className="text-admin-text-tertiary">Cargando formulario...</p>
      </div>
    </div>
  ),
  ssr: false,
});

import { quoteService } from "@/lib/api/services";
import type { Quote, UpdateQuoteData } from "@/lib/api/services/quoteService";
import { appLogger } from '@/lib/logger';

import { DeleteQuoteDialog } from "./_components/DeleteQuoteDialog";
import { QuotesTable } from "./_components/QuotesTable";

export default function QuotesContent() {
  const searchParams = useSearchParams();
  const fieldOperationIdFromUrl = searchParams.get("field_operation_id");
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;
  const [operativoName, setOperativoName] = useState<string | null>(null);
  const [operativoBranchId, setOperativoBranchId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!fieldOperationIdFromUrl) {
      setOperativoName(null);
      setOperativoBranchId(null);
      return;
    }
    fetch(`/api/admin/field-operations/${fieldOperationIdFromUrl}`)
      .then((r) => r.json())
      .then((j) => {
        const fo = j?.data?.fieldOperation;
        setOperativoName(fo?.name ?? null);
        setOperativoBranchId(fo?.branch_id ?? null);
      })
      .catch(() => {
        setOperativoName(null);
        setOperativoBranchId(null);
      });
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
      appLogger.error("Error fetching quotes:", error);
      toast.error("Error al cargar presupuestos");
    } finally {
      setLoading(false);
    }
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
    } catch (error: unknown) {
      appLogger.error("Error deleting quote:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar presupuesto");
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
            className="text-sm text-admin-accent-primary hover:underline font-medium"
            href={`/admin/field-operations/${fieldOperationIdFromUrl}`}
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
              aria-label="Configuración"
              className="h-9 w-9 sm:w-auto sm:px-3"
              size="sm"
              variant="outline"
            >
              <Settings className="h-4 w-4 sm:mr-2 shrink-0" />
              <span className="hidden sm:inline">Configuración</span>
            </Button>
          </Link>
          <Button
            className="h-9 gap-1.5"
            size="sm"
            onClick={() => setShowCreateQuote(true)}
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
                  className="pl-10 w-full"
                  placeholder="Buscar por número, cliente, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
            <QuotesTable
              currentPage={currentPage}
              fieldOperationIdFromUrl={fieldOperationIdFromUrl}
              filteredQuotes={filteredQuotes}
              totalPages={totalPages}
              totalQuotes={totalQuotes}
              onDeleteClick={handleDeleteClick}
              onPageChange={setCurrentPage}
              onStatusChange={async (quoteId, newStatus) => {
                try {
                  await quoteService.updateQuote(quoteId, { status: newStatus as UpdateQuoteData["status"] });
                  setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, status: newStatus as Quote["status"] } : q));
                  toast.success("Estado actualizado");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Error al actualizar estado");
                }
              }}
            />
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
            initialBranchId={operativoBranchId ?? undefined}
            initialFieldOperationId={fieldOperationIdFromUrl || undefined}
            onCancel={() => setShowCreateQuote(false)}
            onSuccess={handleQuoteCreated}
          />
        </DialogContent>
      </Dialog>

      <DeleteQuoteDialog
        deleting={deleting}
        open={deleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setQuoteToDelete(null); }}
      />
    </div>
  );
}
