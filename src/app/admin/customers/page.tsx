"use client";

import { useState, useEffect } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  UserPlus,
  Star,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Package,
  CreditCard,
  TrendingUp,
  Search,
  Filter,
  Eye,
  Edit,
  AlertTriangle,
  CheckCircle,
  Crown,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBranch } from "@/hooks/useBranch";
import { customerService, Customer } from "@/lib/api/services/customerService";
import { handleApiError } from "@/lib/services/errorService";
import { success } from "@/lib/services/notificationService";

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
}

export default function CustomersPage() {
  const router = useRouter();
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Debounce search term (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch customers data
  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [
    currentPage,
    statusFilter,
    currentBranchId,
    isGlobalView,
    debouncedSearchTerm,
  ]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);

      const { data, pagination } = await customerService.getCustomers({
        page: currentPage,
        limit: 20,
        search: debouncedSearchTerm ? debouncedSearchTerm : undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        branchId: currentBranchId || undefined,
        isGlobalView,
        isSuperAdmin,
      });

      setCustomers(data);
      setTotalPages(pagination.totalPages || 1);
      setError(null);
    } catch (err) {
      console.error("Error fetching customers:", err);
      const errorObj = handleApiError(err, "Customers List");
      setError(errorObj?.message || "Error al cargar clientes");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const branchIdParam = currentBranchId as string | undefined;
      const statsData = await customerService.getCustomerStats(
        branchIdParam,
        isGlobalView,
        isSuperAdmin,
      );
      setStats(statsData);
    } catch (err) {
      console.error("Error fetching customer stats:", err);
      handleApiError(err, "Customer Stats");
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);

  if (loading && customers.length === 0) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
            Gestión de Clientes
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            Cargando información de clientes...
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
            Gestión de Clientes
          </h1>
          <p className="text-sm text-admin-text-tertiary">
            Error al cargar los datos
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar clientes
            </h3>
            <p className="text-admin-text-tertiary mb-4">{error}</p>
            <Button onClick={fetchCustomers}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
          Gestión de Clientes
        </h1>
        <p className="text-sm text-admin-text-tertiary">
          Administra los clientes de tu sucursal
        </p>
        <div className="flex justify-end">
          <Button
            onClick={() => router.push("/admin/customers/new")}
            className="min-h-[44px]"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Cliente
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats &&
        (() => {
          const currentBranch = branches?.find((b) => b.id === currentBranchId);
          const statsLabel = isGlobalView
            ? "Todas las sucursales"
            : currentBranch
              ? `Sucursal: ${currentBranch.name}`
              : "Sucursal seleccionada";

          return (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-primary shrink-0" />
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Total Clientes
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-admin-text-primary">
                        {stats.totalCustomers}
                      </p>
                      <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 truncate">
                        {statsLabel}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-admin-success shrink-0" />
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Clientes Activos
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-admin-success">
                        {stats.activeCustomers || stats.totalCustomers}
                      </p>
                      <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 truncate">
                        {statsLabel}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] col-span-2 sm:col-span-1">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center">
                    <ArrowUpRight className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-primary shrink-0" />
                    <div className="ml-3 sm:ml-4 min-w-0">
                      <p className="text-xs sm:text-sm text-admin-text-tertiary">
                        Nuevos Este Mes
                      </p>
                      <p className="text-lg sm:text-2xl font-bold text-admin-text-primary">
                        {stats.newCustomersThisMonth}
                      </p>
                      <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 truncate">
                        {statsLabel}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}

      {/* Filters */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4" />
                <Input
                  data-tour="customers-search"
                  placeholder="Buscar por nombre, email, teléfono o RUT..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset to first page when searching
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      fetchCustomers();
                    }
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Lista de Clientes ({customers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>RUT</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Users className="h-12 w-12 text-admin-text-tertiary mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-admin-text-primary mb-2">
                        No se encontraron clientes
                      </h3>
                      <p className="text-admin-text-tertiary">
                        Ajusta los filtros o agrega nuevos clientes.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="hover:bg-[#AE000025] transition-colors"
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {customer.first_name && customer.last_name
                              ? `${customer.first_name} ${customer.last_name}`
                              : customer.first_name ||
                                customer.last_name ||
                                "Sin nombre"}
                          </div>
                          {customer.email && (
                            <div className="text-sm text-admin-text-tertiary">
                              {customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          {customer.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-1 text-admin-text-tertiary" />
                              <span className="text-admin-text-tertiary">
                                {customer.email}
                              </span>
                            </div>
                          )}
                          {customer.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-1 text-admin-text-tertiary" />
                              <span className="text-admin-text-tertiary">
                                {customer.phone}
                              </span>
                            </div>
                          )}
                          {!customer.email && !customer.phone && (
                            <span className="text-xs text-admin-text-tertiary">
                              Sin contacto
                            </span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell>
                        {customer.rut ? (
                          <span className="text-sm">{customer.rut}</span>
                        ) : (
                          <span className="text-xs text-admin-text-tertiary">
                            -
                          </span>
                        )}
                      </TableCell>

                      <TableCell>
                        {customer.is_active !== false ? (
                          <Badge
                            variant="default"
                            className="bg-admin-success text-white"
                            style={{ color: "var(--admin-accent-secondary)" }}
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="text-sm text-admin-text-tertiary">
                        {new Date(customer.created_at).toLocaleDateString(
                          "es-AR",
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex space-x-2">
                          <Link href={`/admin/customers/${customer.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </Link>
                          <Link href={`/admin/customers/${customer.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 space-x-2">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Anterior
              </Button>

              <span className="text-sm text-admin-text-tertiary">
                Página {currentPage} de {totalPages}
              </span>

              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
