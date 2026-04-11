"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  MapPin,
  MoreVertical,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDate } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscription_tier: string;
  status: string;
  owner_id?: string;
  created_at: string;
  updated_at: string;
  stats?: {
    activeUsers: number;
    branches: number;
  };
  subscriptions?: Array<{
    id: string;
    status: string;
    current_period_start?: string;
    current_period_end?: string;
  }>;
  owner?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function OrganizationsPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Crear organización
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newOrgData, setNewOrgData] = useState({
    name: "",
    slug: "",
    subscription_tier: "basic",
    status: "active",
    owner_id: "",
  });

  // Bulk actions
  const [selectedOrgs, setSelectedOrgs] = useState<Set<string>>(new Set());

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orgToDelete, setOrgToDelete] = useState<Organization | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, [currentPage, tierFilter, statusFilter, searchTerm]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
      });

      if (tierFilter !== "all") params.append("tier", tierFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (searchTerm) params.append("search", searchTerm);

      const response = await fetch(
        `/api/admin/saas-management/organizations?${params}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar organizaciones");
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalCount(data.pagination?.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar organizaciones");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async () => {
    if (!newOrgData.name || !newOrgData.slug) {
      toast.error("Nombre y slug son requeridos");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/saas-management/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrgData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear organización");
      }

      toast.success("Organización creada exitosamente");
      setShowCreateDialog(false);
      setNewOrgData({
        name: "",
        slug: "",
        subscription_tier: "basic",
        status: "active",
        owner_id: "",
      });
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setCreating(false);
    }
  };

  const handleAction = async (
    orgId: string,
    action: "suspend" | "activate" | "cancel" | "change_tier",
    value?: string,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgId}/actions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, value }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar acción");
      }

      toast.success("Acción realizada exitosamente");
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleBulkAction = async (
    action: "suspend" | "activate" | "cancel" | "change_tier",
    value?: string,
  ) => {
    if (selectedOrgs.size === 0) {
      toast.error("Selecciona al menos una organización");
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/saas-management/organizations/bulk-actions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            organization_ids: Array.from(selectedOrgs),
            value,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al realizar acción masiva");
      }

      toast.success(
        `Acción realizada en ${data.updated} organización(es) exitosamente`,
      );
      setSelectedOrgs(new Set());
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    }
  };

  const handleDeleteClick = (org: Organization) => {
    setOrgToDelete(org);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orgToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/organizations/${orgToDelete.id}`,
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirm: true }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar organización");
      }

      toast.success(
        `Organización "${orgToDelete.name}" eliminada completamente junto con todos sus datos relacionados`,
      );
      setDeleteDialogOpen(false);
      setOrgToDelete(null);
      fetchOrganizations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      suspended: "secondary",
      cancelled: "destructive",
    };

    const icons: Record<string, typeof CheckCircle2> = {
      active: CheckCircle2,
      suspended: Pause,
      cancelled: XCircle,
    };

    const Icon = icons[status] || CheckCircle2;

    return (
      <Badge variant={variants[status] || "default"}>
        <Icon className="h-3 w-3 mr-1" />
        {status === "active"
          ? "Activa"
          : status === "suspended"
            ? "Suspendida"
            : "Cancelada"}
      </Badge>
    );
  };

  const getTierBadge = (tier: string) => {
    const colors: Record<string, string> = {
      basic: "bg-gray-100 text-gray-800",
      pro: "bg-blue-100 text-blue-800",
      premium: "bg-purple-100 text-purple-800",
    };

    return (
      <Badge className={colors[tier] || colors.basic}>
        {tier === "basic"
          ? "Básico"
          : tier === "pro"
            ? "Pro"
            : tier === "premium"
              ? "Premium"
              : tier}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            size="icon"
            title="Volver al dashboard"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight">
              Gestión de Organizaciones
            </h1>
            <p className="text-white/50 mt-2">
              Administra todas las organizaciones del sistema
            </p>
          </div>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Organización
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nueva Organización</DialogTitle>
              <DialogDescription>
                Completa los datos para crear una nueva organización
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Ej: Óptica Centro"
                  value={newOrgData.name}
                  onChange={(e) =>
                    setNewOrgData({ ...newOrgData, name: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slug *</label>
                <Input
                  placeholder="optica-centro"
                  value={newOrgData.slug}
                  onChange={(e) =>
                    setNewOrgData({
                      ...newOrgData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                />
                <p className="text-xs text-gray-500 mt-1">
                  Solo letras minúsculas, números y guiones
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Tier</label>
                <Select
                  value={newOrgData.subscription_tier}
                  onValueChange={(value) =>
                    setNewOrgData({ ...newOrgData, subscription_tier: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancelar
              </Button>
              <Button disabled={creating} onClick={handleCreateOrganization}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros y búsqueda */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  className="rounded-xl pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  placeholder="Buscar por nombre o slug..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="rounded-xl w-[180px]">
                <SelectValue placeholder="Filtrar por tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tiers</SelectItem>
                <SelectItem value="basic">Básico</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-xl w-[180px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="active">Activa</SelectItem>
                <SelectItem value="suspended">Suspendida</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions */}
          {selectedOrgs.size > 0 && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedOrgs.size} seleccionada(s)
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    Acciones masivas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("activate")}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Activar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction("suspend")}>
                    <Pause className="h-4 w-4 mr-2" />
                    Suspender
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("change_tier", "basic")}
                  >
                    Cambiar a Básico
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("change_tier", "pro")}
                  >
                    Cambiar a Pro
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleBulkAction("change_tier", "premium")}
                  >
                    Cambiar a Premium
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedOrgs(new Set())}
              >
                Limpiar selección
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de organizaciones */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            Organizaciones ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#C5A059]" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-400">{error}</div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              No se encontraron organizaciones
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-white/5">
                      <TableHead className="w-12 text-white/70">
                        <input
                          checked={
                            selectedOrgs.size === organizations.length &&
                            organizations.length > 0
                          }
                          type="checkbox"
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedOrgs(
                                new Set(organizations.map((org) => org.id)),
                              );
                            } else {
                              setSelectedOrgs(new Set());
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead className="text-white/70">
                        Organización
                      </TableHead>
                      <TableHead className="text-white/70">Tier</TableHead>
                      <TableHead className="text-white/70">Estado</TableHead>
                      <TableHead className="text-white/70">Usuarios</TableHead>
                      <TableHead className="text-white/70">
                        Sucursales
                      </TableHead>
                      <TableHead className="text-white/70">Owner</TableHead>
                      <TableHead className="text-white/70">Creada</TableHead>
                      <TableHead className="text-right text-white/70">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow
                        key={org.id}
                        className="border-white/10 hover:bg-white/5"
                      >
                        <TableCell>
                          <input
                            checked={selectedOrgs.has(org.id)}
                            type="checkbox"
                            onChange={(e) => {
                              const newSelected = new Set(selectedOrgs);
                              if (e.target.checked) {
                                newSelected.add(org.id);
                              } else {
                                newSelected.delete(org.id);
                              }
                              setSelectedOrgs(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-white">
                              {org.name}
                            </div>
                            <div className="text-sm text-white/40">
                              {org.slug}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTierBadge(org.subscription_tier)}
                        </TableCell>
                        <TableCell>{getStatusBadge(org.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-white/70">
                            <Users className="h-4 w-4" />
                            {org.stats?.activeUsers || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-white/70">
                            <MapPin className="h-4 w-4" />
                            {org.stats?.branches || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.owner ? (
                            <div>
                              <div className="text-sm text-white">
                                {org.owner.first_name} {org.owner.last_name}
                              </div>
                              <div className="text-xs text-white/40">
                                {org.owner.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/40">Sin owner</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-white/50">
                          {formatDate(org.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() =>
                                  router.push(
                                    `/admin/saas-management/organizations/${org.id}`,
                                  )
                                }
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {org.status === "active" ? (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(org.id, "suspend")
                                  }
                                >
                                  <Pause className="h-4 w-4 mr-2" />
                                  Suspender
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleAction(org.id, "activate")
                                  }
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Activar
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(org.id, "change_tier", "basic")
                                }
                              >
                                Cambiar a Básico
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(org.id, "change_tier", "pro")
                                }
                              >
                                Cambiar a Pro
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleAction(org.id, "change_tier", "premium")
                                }
                              >
                                Cambiar a Premium
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600 focus:text-red-600"
                                onClick={() => handleDeleteClick(org)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Eliminar Organización
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-gray-600">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      disabled={currentPage === 1}
                      size="sm"
                      variant="outline"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Anterior
                    </Button>
                    <Button
                      disabled={currentPage === totalPages}
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación de Organización
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-4 mt-4">
                <p className="font-semibold text-lg">
                  ¿Estás seguro de que deseas eliminar la organización{" "}
                  <span className="text-red-600">
                    &quot;{orgToDelete?.name}&quot;
                  </span>
                  ?
                </p>

                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-red-800 dark:text-red-300 mb-2">
                        ⚠️ Esta acción es IRREVERSIBLE
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                        Se eliminará <strong>PERMANENTEMENTE</strong>:
                      </p>
                      <ul className="text-sm text-red-700 dark:text-red-400 list-disc list-inside space-y-1">
                        <li>La organización y todos sus datos</li>
                        <li>
                          Todas las sucursales (
                          {orgToDelete?.stats?.branches || 0})
                        </li>
                        <li>
                          Todos los usuarios asociados (
                          {orgToDelete?.stats?.activeUsers || 0})
                        </li>
                        <li>Todas las suscripciones</li>
                        <li>Todos los productos</li>
                        <li>Todos los clientes</li>
                        <li>Todas las órdenes</li>
                        <li>Todos los presupuestos</li>
                        <li>Todos los trabajos de laboratorio</li>
                        <li>Todos los pagos</li>
                        <li>Y cualquier otro dato relacionado</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Esta acción no se puede deshacer. Por favor, confirma que
                  realmente deseas eliminar esta organización.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={deleting}
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setOrgToDelete(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              disabled={deleting}
              variant="destructive"
              onClick={handleDeleteConfirm}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sí, Eliminar Permanentemente
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
