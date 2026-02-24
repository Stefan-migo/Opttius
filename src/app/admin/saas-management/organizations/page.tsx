"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogTrigger,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Building2,
  Plus,
  Search,
  Eye,
  Edit,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Crown,
  Users,
  MapPin,
  Loader2,
  ArrowLeft,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/saas-management/dashboard")}
            title="Volver al dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Gestión de Organizaciones
            </h1>
            <p className="text-muted-foreground mt-2">
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
                  value={newOrgData.name}
                  onChange={(e) =>
                    setNewOrgData({ ...newOrgData, name: e.target.value })
                  }
                  placeholder="Ej: Óptica Centro"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Slug *</label>
                <Input
                  value={newOrgData.slug}
                  onChange={(e) =>
                    setNewOrgData({
                      ...newOrgData,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="optica-centro"
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
              <Button onClick={handleCreateOrganization} disabled={creating}>
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
      <Card className="admin-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o slug..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="rounded-xl pl-10"
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
                  <Button variant="outline" size="sm">
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
                variant="ghost"
                size="sm"
                onClick={() => setSelectedOrgs(new Set())}
              >
                Limpiar selección
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabla de organizaciones */}
      <Card className="admin-card">
        <CardHeader>
          <CardTitle>Organizaciones ({totalCount})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : error ? (
            <div className="text-center py-12 text-red-600">{error}</div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No se encontraron organizaciones
            </div>
          ) : (
            <>
              <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={
                            selectedOrgs.size === organizations.length &&
                            organizations.length > 0
                          }
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
                      <TableHead>Organización</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Usuarios</TableHead>
                      <TableHead>Sucursales</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedOrgs.has(org.id)}
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
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-gray-500">
                              {org.slug}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getTierBadge(org.subscription_tier)}
                        </TableCell>
                        <TableCell>{getStatusBadge(org.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-gray-400" />
                            {org.stats?.activeUsers || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {org.stats?.branches || 0}
                          </div>
                        </TableCell>
                        <TableCell>
                          {org.owner ? (
                            <div>
                              <div className="text-sm">
                                {org.owner.first_name} {org.owner.last_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {org.owner.email}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sin owner</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {formatDate(org.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
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
                                onClick={() => handleDeleteClick(org)}
                                className="text-red-600 focus:text-red-600"
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
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
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
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setOrgToDelete(null);
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
