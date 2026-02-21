"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  extractDataFromResponse,
  extractPaginationFromResponse,
} from "@/lib/api/response-helpers";
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
  Search,
  Building2,
  User,
  Loader2,
  ArrowRight,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  MessageSquare,
  Filter,
  RefreshCw,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { SupportMetrics } from "@/components/admin/saas-support/SupportMetrics";

interface SearchResult {
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    status: string;
    subscription_tier: string;
  }>;
  users: Array<{
    id: string;
    email: string;
    role: string;
    is_active: boolean;
    organization_id?: string;
    organization?: {
      id: string;
      name: string;
      slug: string;
    };
    profiles?: {
      first_name?: string;
      last_name?: string;
    };
  }>;
}

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  assigned_to_user?: {
    id: string;
    email: string;
    role: string;
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

const categoryLabels: Record<string, string> = {
  technical: "Técnico",
  billing: "Facturación",
  feature_request: "Funcionalidad",
  bug_report: "Bug",
  account: "Cuenta",
  other: "Otro",
};

export default function SupportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"tickets" | "metrics" | "search">(
    "tickets",
  );

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult>({
    organizations: [],
    users: [],
  });
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Tickets state
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [filters, setFilters] = useState({
    status: "all",
    priority: "all",
    category: "all",
    search: "",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Load tickets
  useEffect(() => {
    loadTickets();
  }, [filters, pagination.page]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      // Solo agregar filtros si no son "all"
      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }
      if (filters.priority && filters.priority !== "all") {
        params.append("priority", filters.priority);
      }
      if (filters.category && filters.category !== "all") {
        params.append("category", filters.category);
      }
      if (filters.search) {
        params.append("search", filters.search);
      }

      const response = await fetch(
        `/api/admin/saas-management/support/tickets?${params.toString()}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar tickets");
      }

      const data = await response.json();
      const paginationData = extractPaginationFromResponse(data);
      setTickets(extractDataFromResponse(data));
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

  // Search functionality
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults({ organizations: [], users: [] });
        setHasSearched(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      const response = await fetch(
        `/api/admin/saas-management/support/search?q=${encodeURIComponent(searchQuery)}`,
      );

      if (!response.ok) {
        throw new Error("Error en la búsqueda");
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err) {
      toast.error("Error al realizar búsqueda");
      setSearchResults({ organizations: [], users: [] });
    } finally {
      setSearching(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      active: "default",
      suspended: "secondary",
      cancelled: "destructive",
    };

    const Icon = status === "active" ? CheckCircle2 : XCircle;

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

  return (
    <div className="space-y-6 p-6 bg-epoch-background min-h-screen">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/saas-management/dashboard")}
          title="Volver al dashboard"
          className="rounded-none text-epoch-primary hover:bg-epoch-primary/10"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
            Panel de Soporte
          </h1>
          <p className="text-epoch-primary/80 mt-2">
            Gestión de tickets de soporte SaaS y búsqueda rápida
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-epoch-primary/20">
        <Button
          variant={activeTab === "tickets" ? "default" : "ghost"}
          onClick={() => setActiveTab("tickets")}
          className={`rounded-none rounded-b-none ${activeTab === "tickets" ? "bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase" : "text-epoch-primary"}`}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          Tickets de Soporte
        </Button>
        <Button
          variant={activeTab === "search" ? "default" : "ghost"}
          onClick={() => setActiveTab("search")}
          className={`rounded-none rounded-b-none ${activeTab === "search" ? "bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase" : "text-epoch-primary"}`}
        >
          <Search className="h-4 w-4 mr-2" />
          Búsqueda Rápida
        </Button>
      </div>

      {/* Metrics Tab */}
      {activeTab === "metrics" && (
        <div className="space-y-6">
          <SupportMetrics />
        </div>
      )}

      {/* Tickets Tab */}
      {activeTab === "tickets" && (
        <div className="space-y-6">
          {/* Filters */}
          <Card className="rounded-none border border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
                <Filter className="h-5 w-5 text-epoch-accent" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Estado</label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        status: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-none focus:border-epoch-primary focus:ring-epoch-primary/20">
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
                      setFilters((prev) => ({
                        ...prev,
                        priority: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-none focus:border-epoch-primary focus:ring-epoch-primary/20">
                      <SelectValue placeholder="Todas las prioridades" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las prioridades</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Categoría</label>
                  <Select
                    value={filters.category}
                    onValueChange={(value) =>
                      setFilters((prev) => ({
                        ...prev,
                        category: value,
                        page: 1,
                      }))
                    }
                  >
                    <SelectTrigger className="rounded-none focus:border-epoch-primary focus:ring-epoch-primary/20">
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
                  <label className="text-sm font-medium">Buscar</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ticket #, asunto, email..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters((prev) => ({
                          ...prev,
                          search: e.target.value,
                          page: 1,
                        }))
                      }
                      className="rounded-none focus:border-epoch-primary focus:ring-epoch-primary/20"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={loadTickets}
                      title="Refrescar"
                      className="rounded-none border-admin-border-primary/20"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tickets List */}
          <Card className="rounded-none border border-border">
            <CardHeader>
              <CardTitle className="font-display text-epoch-primary">
                Tickets ({pagination.total})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTickets ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-epoch-primary" />
                </div>
              ) : tickets.length === 0 ? (
                <div className="text-center py-12 text-epoch-primary/70">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-epoch-accent" />
                  <p>No hay tickets que coincidan con los filtros</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/admin/saas-management/support/tickets/${ticket.id}`}
                    >
                      <div className="flex items-center justify-between p-4 border rounded-none hover:bg-epoch-primary/5 cursor-pointer transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono font-semibold text-sm">
                              {ticket.ticket_number}
                            </span>
                            <Badge className={statusColors[ticket.status]}>
                              {statusLabels[ticket.status]}
                            </Badge>
                            <Badge className={priorityColors[ticket.priority]}>
                              {ticket.priority}
                            </Badge>
                            <Badge variant="outline">
                              {categoryLabels[ticket.category]}
                            </Badge>
                          </div>
                          <h3 className="font-medium text-epoch-primary">
                            {ticket.subject}
                          </h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-epoch-primary/70">
                            {ticket.organization && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-4 w-4" />
                                {ticket.organization.name}
                              </span>
                            )}
                            {ticket.assigned_to_user && (
                              <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {ticket.assigned_to_user.email}
                              </span>
                            )}
                            <span>
                              {new Date(ticket.created_at).toLocaleDateString(
                                "es-CL",
                              )}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-5 w-5 text-epoch-accent" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t">
                  <p className="text-sm text-epoch-primary/80">
                    Página {pagination.page} de {pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-none border-admin-border-primary/20"
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
                      className="rounded-none border-admin-border-primary/20"
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
        </div>
      )}

      {/* Search Tab */}
      {activeTab === "search" && (
        <div className="space-y-6">
          {/* Búsqueda */}
          <Card className="rounded-none border border-border">
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-epoch-accent" />
                <Input
                  placeholder="Buscar por nombre, slug, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-none focus:border-epoch-primary focus:ring-epoch-primary/20"
                />
              </div>
              {searching && (
                <div className="flex items-center gap-2 mt-4 text-sm text-epoch-primary/80">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Resultados */}
          {hasSearched && !searching && (
            <div className="space-y-6">
              {/* Organizaciones */}
              {searchResults.organizations.length > 0 && (
                <Card className="rounded-none border border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
                      <Building2 className="h-5 w-5 text-epoch-accent" />
                      Organizaciones ({searchResults.organizations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {searchResults.organizations.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-4 border rounded-none hover:bg-epoch-primary/5 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-epoch-primary">
                                {org.name}
                              </h3>
                              {getStatusBadge(org.status)}
                              <Badge variant="outline">
                                {org.subscription_tier}
                              </Badge>
                            </div>
                            <p className="text-sm text-epoch-primary/70 mt-1">
                              {org.slug}
                            </p>
                          </div>
                          <Link
                            href={`/admin/saas-management/organizations/${org.id}`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-none border-admin-border-primary/20"
                            >
                              Ver detalles
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Usuarios */}
              {searchResults.users.length > 0 && (
                <Card className="rounded-none border border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
                      <User className="h-5 w-5 text-epoch-accent" />
                      Usuarios ({searchResults.users.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {searchResults.users.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-4 border rounded-none hover:bg-epoch-primary/5 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-epoch-primary">
                                {user.profiles?.first_name}{" "}
                                {user.profiles?.last_name}
                              </h3>
                              <Badge variant="outline">{user.role}</Badge>
                              {user.is_active ? (
                                <Badge variant="default">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Activo
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactivo
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-epoch-primary/70 mt-1">
                              {user.email}
                            </p>
                            {user.organization && (
                              <p className="text-xs text-epoch-primary/60 mt-1">
                                Organización: {user.organization.name}
                              </p>
                            )}
                          </div>
                          <Link
                            href={`/admin/saas-management/users/${user.id}`}
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-none border-admin-border-primary/20"
                            >
                              Ver detalles
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sin resultados */}
              {searchResults.organizations.length === 0 &&
                searchResults.users.length === 0 && (
                  <Card className="rounded-none border border-border">
                    <CardContent className="pt-6">
                      <div className="text-center py-8 text-epoch-primary/70">
                        No se encontraron resultados para "{searchQuery}"
                      </div>
                    </CardContent>
                  </Card>
                )}
            </div>
          )}

          {/* Instrucciones iniciales */}
          {!hasSearched && (
            <Card className="rounded-none border border-border">
              <CardContent className="pt-6">
                <div className="text-center py-8 text-epoch-primary/70">
                  <Search className="h-12 w-12 mx-auto mb-4 text-epoch-accent" />
                  <p className="text-lg font-medium mb-2">
                    Busca organizaciones o usuarios
                  </p>
                  <p className="text-sm">
                    Ingresa al menos 2 caracteres para comenzar la búsqueda
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
