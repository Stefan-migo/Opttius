"use client";

import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Crown,
  DollarSign,
  Edit,
  FileText,
  Heart,
  Package,
  ShoppingBag,
  Star,
  TrendingUp,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";

import { CustomerInfoCard } from "@/components/admin/CustomerInfoCard";
import { OrdersHistoryCard } from "@/components/admin/OrdersHistoryCard";
import { PrescriptionManagementCard } from "@/components/admin/PrescriptionManagementCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import type { Appointment, Prescription } from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/utils";

// Lazy load large form components to reduce initial bundle size
const CreatePrescriptionForm = dynamic(
  () => import("@/components/admin/CreatePrescriptionForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

const CreateAppointmentForm = dynamic(
  () => import("@/components/admin/CreateAppointmentForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

const CreateQuoteForm = dynamic(
  () => import("@/components/admin/CreateQuoteForm"),
  {
    loading: () => (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-admin-text-primary" />
      </div>
    ),
    ssr: false,
  },
);

export default function CustomerDetailPage() {
  const router = useRouter();
  const {
    customerId,
    customer,
    loading,
    error,
    expandedOrders,
    showCreatePrescription,
    editingPrescription,
    showCreateAppointment,
    editingAppointment,
    showCreateQuote,
    fetchCustomer,
    toggleOrderExpansion,
    setShowCreatePrescription,
    setEditingPrescription,
    setShowCreateAppointment,
    setEditingAppointment,
    setShowCreateQuote,
  } = useCustomerDetail();

  const getSegmentBadge = (segment: string) => {
    type BadgeVariant =
      | "default"
      | "secondary"
      | "outline"
      | "destructive"
      | "healty"
      | null
      | undefined;
    const variants: Record<
      string,
      {
        variant: BadgeVariant;
        label: string;
        icon: React.ComponentType<{ className?: string }>;
        color: string;
      }
    > = {
      new: {
        variant: "secondary",
        label: "Nuevo",
        icon: Star,
        color: "text-yellow-600",
      },
      "first-time": {
        variant: "outline",
        label: "Primera Compra",
        icon: Package,
        color: "text-blue-600",
      },
      regular: {
        variant: "default",
        label: "Regular",
        icon: CheckCircle,
        color: "text-green-600",
      },
      vip: {
        variant: "secondary",
        label: "VIP",
        icon: Crown,
        color: "text-purple-600",
      },
      "at-risk": {
        variant: "destructive",
        label: "En Riesgo",
        icon: AlertTriangle,
        color: "text-red-600",
      },
    };

    const config = variants[segment] || variants["new"];
    const Icon = config.icon;

    return (
      <Badge className="flex items-center gap-1" variant={config.variant}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getOrderStatusBadge = (status: string) => {
    type BadgeVariant =
      | "default"
      | "secondary"
      | "outline"
      | "destructive"
      | "healty"
      | null
      | undefined;
    const config: Record<string, { variant: BadgeVariant; label: string }> = {
      pending: { variant: "outline", label: "Pendiente" },
      processing: { variant: "secondary", label: "Procesando" },
      shipped: { variant: "default", label: "Enviado" },
      delivered: { variant: "default", label: "Entregado" },
      cancelled: { variant: "destructive", label: "Cancelado" },
      refunded: { variant: "destructive", label: "Reembolsado" },
    };

    const statusConfig = config[status] || {
      variant: "outline",
      label: status,
    };
    return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button className="min-h-[44px]" size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
              Cargando cliente...
            </h1>
          </div>
          <p className="text-sm text-admin-text-tertiary">
            Obteniendo información del cliente
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card className="animate-pulse" key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              className="min-h-[44px]"
              size="sm"
              variant="outline"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary">
              Error
            </h1>
          </div>
          <p className="text-sm text-admin-text-tertiary">
            No se pudo cargar la información del cliente
          </p>
        </div>
        <Card>
          <CardContent className="text-center py-16">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-700 mb-2">
              Error al cargar cliente
            </h3>
            <p className="text-admin-text-tertiary mb-4">
              {error || "Cliente no encontrado"}
            </p>
            <Button onClick={fetchCustomer}>Reintentar</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const customerName =
    customer.first_name && customer.last_name
      ? `${customer.first_name} ${customer.last_name}`
      : "Sin nombre";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button
            className="min-h-[44px] shrink-0"
            size="sm"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary truncate">
            {customerName}
          </h1>
        </div>
        <p className="text-sm text-admin-text-tertiary">
          {customer.email || "Sin email"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {customer.analytics?.segment &&
            getSegmentBadge(customer.analytics.segment)}
          {customer.is_convenio_client && (
            <Badge
              className="border-admin-accent-primary/50 text-admin-accent-primary"
              variant="outline"
            >
              <FileText className="h-3 w-3 mr-1" />
              Cliente convenio
            </Badge>
          )}
          <Link href={`/admin/customers/${customer.id}/edit`}>
            <Button className="min-h-[44px]">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-admin-success shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm text-admin-text-tertiary">
                  Total Gastado
                </p>
                <p className="text-lg sm:text-2xl font-bold text-admin-success truncate">
                  {formatCurrency(customer.analytics?.totalSpent || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-primary shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm text-admin-text-tertiary">
                  Total Pedidos
                </p>
                <p className="text-lg sm:text-2xl font-bold text-admin-text-primary">
                  {customer.analytics?.orderCount || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-admin-accent-primary shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm text-admin-text-tertiary">
                  Ticket Promedio
                </p>
                <p className="text-lg sm:text-2xl font-bold text-admin-accent-primary truncate">
                  {formatCurrency(customer.analytics?.avgOrderValue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 shrink-0" />
              <div className="ml-3 sm:ml-4 min-w-0">
                <p className="text-xs sm:text-sm text-admin-text-tertiary">
                  Cliente Desde
                </p>
                <p className="text-base sm:text-lg font-bold text-red-500">
                  {formatDate(customer.created_at)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content - Tabs */}
      <Tabs className="space-y-4 sm:space-y-6" defaultValue="overview">
        <TabsList className="flex w-full justify-start md:justify-center gap-1 sm:gap-2 h-auto p-1 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-epoch-primary/30 rounded-xl border border-epoch-primary/10 bg-epoch-background/50">
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="overview"
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="prescriptions"
          >
            Recetas
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="appointments"
          >
            Citas
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="quotes"
          >
            Presupuestos
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="purchases"
          >
            Compras
          </TabsTrigger>
          <TabsTrigger
            className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
            value="analytics"
          >
            Analíticas
          </TabsTrigger>
          {customer.agreement_usage && customer.agreement_usage.length > 0 && (
            <TabsTrigger
              className="flex-shrink-0 text-xs sm:text-sm px-3 py-2 min-h-[44px]"
              value="convenios"
            >
              Convenios
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="overview"
        >
          <CustomerInfoCard customer={customer} />

          {/* Recent Orders */}
          {customer.orders && customer.orders.length > 0 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Pedidos Recientes
                  </div>
                  <Link href={`/admin/customers/${customer.id}?tab=orders`}>
                    <Button size="sm" variant="outline">
                      Ver todos
                    </Button>
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customer.orders.slice(0, 5).map((order) => (
                    <div
                      className="flex items-center justify-between p-3 border rounded-lg"
                      key={(order as Record<string, unknown>).id as string}
                    >
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">
                            #
                            {
                              (order as Record<string, unknown>)
                                .order_number as string
                            }
                          </p>
                          <p className="text-sm text-admin-text-tertiary">
                            {formatDate(
                              (order as Record<string, unknown>)
                                .created_at as string,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <p className="font-medium">
                            {formatCurrency(
                              (order as Record<string, unknown>)
                                .total_amount as number,
                            )}
                          </p>
                          {getOrderStatusBadge(
                            (order as Record<string, unknown>).status as string,
                          )}
                        </div>
                        <Link
                          href={`/admin/orders/${(order as Record<string, unknown>).id as string}`}
                        >
                          <Button size="sm" variant="outline">
                            Ver
                          </Button>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="prescriptions"
        >
          <PrescriptionManagementCard
            customer={customer}
            section="prescriptions"
            onNew={() => {
              setEditingPrescription(null);
              setShowCreatePrescription(true);
            }}
            onEdit={(item) => {
              setEditingPrescription(item as Prescription);
              setShowCreatePrescription(true);
            }}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="appointments"
        >
          <PrescriptionManagementCard
            customer={customer}
            section="appointments"
            onNew={() => {
              setEditingAppointment(null);
              setShowCreateAppointment(true);
            }}
            onEdit={(item) => {
              setEditingAppointment(item as Appointment);
              setShowCreateAppointment(true);
            }}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="quotes"
        >
          <PrescriptionManagementCard
            customer={customer}
            section="quotes"
            onNew={() => setShowCreateQuote(true)}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="purchases"
        >
          <OrdersHistoryCard
            customer={customer}
            expandedOrders={expandedOrders}
            toggleOrderExpansion={toggleOrderExpansion}
          />
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="analytics"
        >
          {/* Empty State for No Orders */}
          {customer.analytics?.orderCount === 0 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardContent className="text-center py-16">
                <TrendingUp className="h-16 w-16 text-admin-text-tertiary mx-auto mb-4 opacity-50" />
                <h3 className="text-xl font-semibold text-admin-text-primary mb-2">
                  Sin Datos de Analíticas
                </h3>
                <p className="text-admin-text-tertiary mb-6 max-w-md mx-auto">
                  Este cliente aún no ha realizado ningún pedido. Las analíticas
                  estarán disponibles una vez que realice su primera compra a
                  través del POS.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Customer Analytics Content */}
          {(customer.analytics?.orderCount ?? 0) > 0 && (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Favorite Products */}
                {customer.analytics?.favoriteProducts &&
                  customer.analytics.favoriteProducts.length > 0 && (
                    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                      <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="flex items-center text-admin-text-primary">
                          <Heart className="h-5 w-5 mr-2" />
                          Productos Favoritos
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-6 pt-0">
                        <div className="space-y-3">
                          {customer.analytics.favoriteProducts.slice(0, 5).map(
                            (
                              item: {
                                product?: {
                                  id: string;
                                  name?: string;
                                  featured_image?: string;
                                };
                                quantity: number;
                                totalSpent: number;
                              },
                              index: number,
                            ) => (
                              <div
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-[#AE000010] transition-colors"
                                key={index}
                              >
                                <div className="flex items-center space-x-3 min-w-0">
                                  {item.product?.featured_image ? (
                                    <img
                                      alt={item.product.name || "Product"}
                                      className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border border-admin-border-primary/20 shrink-0"
                                      src={item.product.featured_image}
                                    />
                                  ) : (
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-admin-bg-primary rounded border border-admin-border-primary/20 flex items-center justify-center shrink-0">
                                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-admin-text-tertiary" />
                                    </div>
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-medium text-admin-text-primary truncate">
                                      {item.product?.name || "Producto"}
                                    </p>
                                    <p className="text-xs sm:text-sm text-admin-text-tertiary">
                                      {item.quantity}{" "}
                                      {item.quantity === 1
                                        ? "unidad"
                                        : "unidades"}{" "}
                                      compradas
                                    </p>
                                  </div>
                                </div>
                                <div className="text-left sm:text-right shrink-0">
                                  <p className="font-medium text-admin-success">
                                    {formatCurrency(item.totalSpent)}
                                  </p>
                                  <p className="text-xs text-admin-text-tertiary">
                                    {formatCurrency(
                                      item.totalSpent / item.quantity,
                                    )}{" "}
                                    por unidad
                                  </p>
                                </div>
                              </div>
                            ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                {/* Order Status Distribution */}
                {customer.analytics?.orderStatusCounts && (
                  <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="flex items-center text-admin-text-primary">
                        <Activity className="h-5 w-5 mr-2" />
                        Distribución de Estados
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 pt-0">
                      <div className="space-y-3">
                        {Object.entries(
                          customer.analytics.orderStatusCounts,
                        ).map(([status, count]) => (
                          <div
                            className="flex items-center justify-between"
                            key={status}
                          >
                            <div className="flex items-center space-x-2">
                              {getOrderStatusBadge(status)}
                            </div>
                            <span className="font-medium">
                              {count as number} pedidos
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Monthly Spending Chart */}
              {customer.analytics?.monthlySpending &&
                customer.analytics.monthlySpending.length > 0 && (
                  <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          Tendencia de Gastos (Últimos 12 meses)
                        </div>
                        <div className="text-sm font-normal text-admin-text-tertiary">
                          Total: {formatCurrency(customer.analytics.totalSpent)}
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        {customer.analytics.monthlySpending.map(
                          (month: unknown, index: number) => {
                            const m = month as Record<string, unknown>;
                            return (
                              <div
                                className={`text-center p-3 border rounded-lg transition-all hover:shadow-md ${
                                  (m.amount as number) > 0
                                    ? "bg-admin-success/10 border-admin-success/30"
                                    : "bg-gray-50"
                                }`}
                                key={index}
                              >
                                <p className="text-xs font-medium text-admin-text-tertiary mb-1">
                                  {m.month as string}
                                </p>
                                <p className="font-bold text-sm text-admin-text-primary">
                                  {formatCurrency(m.amount as number)}
                                </p>
                                <p className="text-xs text-admin-text-tertiary mt-1">
                                  {m.orders as number}{" "}
                                  {(m.orders as number) === 1
                                    ? "pedido"
                                    : "pedidos"}
                                </p>
                              </div>
                            );
                          },
                        )}
                      </div>

                      {/* Summary Stats */}
                      <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Promedio Mensual
                          </p>
                          <p className="font-bold text-lg text-admin-text-primary">
                            {formatCurrency(customer.analytics.totalSpent / 12)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Mejor Mes
                          </p>
                          <p className="font-bold text-lg text-admin-success">
                            {formatCurrency(
                              Math.max(
                                ...customer.analytics.monthlySpending.map(
                                  (m: { amount: number }) => m.amount,
                                ),
                              ),
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-admin-text-tertiary">
                            Meses Activos
                          </p>
                          <p className="font-bold text-lg text-admin-accent-primary">
                            {
                              customer.analytics.monthlySpending.filter(
                                (m: { amount: number }) => m.amount > 0,
                              ).length
                            }
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
            </>
          )}
        </TabsContent>

        {customer.agreement_usage && customer.agreement_usage.length > 0 && (
          <TabsContent
            className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
            value="convenios"
          >
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-admin-text-primary">
                  <FileText className="h-5 w-5 mr-2" />
                  Convenios utilizados
                </CardTitle>
                <p className="text-sm text-admin-text-tertiary mt-1">
                  Historial de compras bajo convenio
                </p>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Convenio</TableHead>
                      <TableHead>Órdenes</TableHead>
                      <TableHead>Última compra</TableHead>
                      <TableHead>Total copago</TableHead>
                      <TableHead>Total institucional</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.agreement_usage.map(
                      (u: {
                        agreement_id: string;
                        agreement_name: string | null;
                        order_count: number;
                        last_order_at: string;
                        total_copago: number;
                        total_institutional: number;
                      }) => (
                        <TableRow key={u.agreement_id}>
                          <TableCell>
                            <Link
                              className="font-medium text-admin-accent-primary hover:underline"
                              href={`/admin/agreements/${u.agreement_id}`}
                            >
                              {u.agreement_name || "Sin nombre"}
                            </Link>
                          </TableCell>
                          <TableCell>{u.order_count}</TableCell>
                          <TableCell className="text-admin-text-tertiary">
                            {formatDate(u.last_order_at)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(u.total_copago)}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(u.total_institutional)}
                          </TableCell>
                        </TableRow>
                      ),
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Create/Edit Prescription Dialog */}
      <Dialog
        open={showCreatePrescription}
        onOpenChange={setShowCreatePrescription}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-7xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle>
              {editingPrescription ? "Editar Receta" : "Nueva Receta"}
            </DialogTitle>
            <DialogDescription>
              {editingPrescription
                ? "Modifica los datos de la receta oftalmológica"
                : "Crea una nueva receta oftalmológica para este cliente"}
            </DialogDescription>
          </DialogHeader>
          <CreatePrescriptionForm
            customerId={customerId}
            initialData={editingPrescription || undefined}
            onCancel={() => {
              setShowCreatePrescription(false);
              setEditingPrescription(null);
            }}
            onSuccess={() => {
              setShowCreatePrescription(false);
              setEditingPrescription(null);
              fetchCustomer();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create/Edit Appointment Dialog */}
      <Dialog
        open={showCreateAppointment}
        onOpenChange={setShowCreateAppointment}
      >
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? "Editar Cita" : "Nueva Cita"}
            </DialogTitle>
            <DialogDescription>
              {editingAppointment
                ? "Modifica los detalles de la cita"
                : "Crea una nueva cita para este cliente"}
            </DialogDescription>
          </DialogHeader>
          <CreateAppointmentForm
            initialCustomerId={customerId}
            initialData={editingAppointment || undefined}
            onCancel={() => {
              setShowCreateAppointment(false);
              setEditingAppointment(null);
            }}
            onSuccess={() => {
              setShowCreateAppointment(false);
              setEditingAppointment(null);
              fetchCustomer();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Create Quote Dialog */}
      <Dialog open={showCreateQuote} onOpenChange={setShowCreateQuote}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Presupuesto</DialogTitle>
            <DialogDescription>
              Crea un presupuesto para este cliente
            </DialogDescription>
          </DialogHeader>
          <CreateQuoteForm
            initialCustomerId={customerId}
            initialFieldOperationId={customer?.field_operation_id ?? undefined}
            onCancel={() => setShowCreateQuote(false)}
            onSuccess={() => {
              setShowCreateQuote(false);
              fetchCustomer();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
