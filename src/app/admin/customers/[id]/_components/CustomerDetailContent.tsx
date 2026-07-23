"use client";

import { AlertTriangle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { CustomerInfoCard } from "@/components/admin/CustomerInfoCard";
import { OrdersHistoryCard } from "@/components/admin/OrdersHistoryCard";
import { PrescriptionManagementCard } from "@/components/admin/PrescriptionManagementCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomerDetail } from "@/hooks/useCustomerDetail";
import type { Appointment, Prescription } from "@/lib/api/services";

import { CustomerAnalyticsTab } from "./CustomerAnalyticsTab";
import { CustomerConveniosTab } from "./CustomerConveniosTab";
import { CustomerDetailDialogs } from "./CustomerDetailDialogs";
import { CustomerHeader } from "./CustomerHeader";
import { CustomerRecentOrders } from "./CustomerRecentOrders";
import { CustomerStatsCards } from "./CustomerStatsCards";

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
            <CustomerRecentOrders
              customerId={customer.id}
              orders={customer.orders as Record<string, unknown>[]}
            />
          )}
        </TabsContent>

        <TabsContent
          className="space-y-4 sm:space-y-6 mt-4 sm:mt-6"
          value="prescriptions"
        >
          <PrescriptionManagementCard
            customer={customer}
            section="prescriptions"
            onEdit={(item) => {
              setEditingPrescription(item as Prescription);
              setShowCreatePrescription(true);
            }}
            onNew={() => {
              setEditingPrescription(null);
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
            onEdit={(item) => {
              setEditingAppointment(item as Appointment);
              setShowCreateAppointment(true);
            }}
            onNew={() => {
              setEditingAppointment(null);
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
          <TabsContent className="space-y-4 sm:space-y-6 mt-4 sm:mt-6" value="convenios">
            <CustomerConveniosTab usage={customer.agreement_usage as never} />
          </TabsContent>
        )}
      </Tabs>

      <CustomerDetailDialogs
        customerId={customerId}
        editingAppointment={editingAppointment}
        editingPrescription={editingPrescription}
        fieldOperationId={customer?.field_operation_id ?? undefined}
        showCreateAppointment={showCreateAppointment}
        showCreatePrescription={showCreatePrescription}
        showCreateQuote={showCreateQuote}
        onCloseAppointment={() => {
          setShowCreateAppointment(false);
          setEditingAppointment(null);
        }}
        onClosePrescription={() => {
          setShowCreatePrescription(false);
          setEditingPrescription(null);
        }}
        onCloseQuote={() => setShowCreateQuote(false)}
        onSuccess={() => fetchCustomer()}
      />
    </div>
  );
}
