"use client";

import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  Package,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
import { CustomerAnalyticsTab } from "./CustomerAnalyticsTab";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerStatsCards } from "./CustomerStatsCards";

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

function getOrderStatusBadge(status: string) {
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
}

export default function CustomerDetailContent() {
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

  return (
    <div className="space-y-6">
      <CustomerHeader customer={customer} onBack={() => router.back()} />

      <CustomerStatsCards customer={customer} />

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
          <CustomerAnalyticsTab customer={customer} />
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
