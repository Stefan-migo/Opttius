/**
 * Cash Register — Daily Cash Closure Management Page
 *
 * Handles cash closure operations, order listing, payment summaries, and actions.
 * State managed via useCashRegister hook; rendering delegated to 4 section components.
 */
"use client";

import { Calendar, DollarSign, RefreshCw } from "lucide-react";
import Link from "next/link";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, formatDate } from "@/lib/utils";

import { CashRegisterActionsSection } from "./CashRegisterActionsSection";
import { CashRegisterClosureSection } from "./CashRegisterClosureSection";
import { CashRegisterOrderDialog } from "./CashRegisterOrderDialog";
import { CashRegisterOrdersSection } from "./CashRegisterOrdersSection";
import { CashRegisterPaymentSection } from "./CashRegisterPaymentSection";
import { useCashRegister } from "./useCashRegister";

export default function CashRegisterPage() {
  const h = useCashRegister();

  // Early returns
  if (h.fieldOperationIdFromUrl && h.loadingFieldOperation) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary" />
      </div>
    );
  }

  if (h.fieldOperationIdFromUrl && !h.fieldOperation) {
    return (
      <div className="space-y-6">
        <p className="text-admin-text-secondary">Operativo no encontrado.</p>
        <Link href="/admin/cash-register">
          <Button variant="outline">Volver a Caja</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 min-w-0">
      {/* Operativo mode banner */}
      {h.isOperativoMode && h.fieldOperation && (
        <div className="rounded-lg border border-admin-accent-primary/30 bg-admin-accent-primary/10 px-4 py-2 text-sm text-admin-text-primary">
          Modo operativo: <strong>{h.fieldOperation.name}</strong>
        </div>
      )}

      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-epoch-primary">
            {h.isOperativoMode && h.fieldOperation
              ? `Caja - ${h.fieldOperation.name}`
              : "Caja"}
          </h1>
          <p className="text-sm text-admin-text-tertiary mt-1">
            {h.isGlobalView
              ? "Gestión de caja - Todas las sucursales"
              : h.isOperativoMode
                ? "Caja independiente del operativo en terreno"
                : "Gestión de caja diaria"}
          </p>
        </div>
        <CashRegisterActionsSection
          isOperativoMode={h.isOperativoMode}
          fieldOperationIdFromUrl={h.fieldOperationIdFromUrl}
          effectiveBranchId={h.effectiveBranchId}
          isSuperAdmin={h.isSuperAdmin}
          closing={h.closing}
          closingEnabled={!!h.dailySummary}
          handleCloseCashRegister={h.handleCloseCashRegister}
          setShowCloseDialog={h.setShowCloseDialog}
        />
      </div>

      {/* Cash Status Card */}
      {!h.isGlobalView && (
        <Card
          className={
            h.isCashOpen
              ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
              : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
          }
        >
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="flex items-center gap-2">
                <DollarSign
                  className={`h-5 w-5 ${h.isCashOpen ? "text-green-600" : "text-red-600"}`}
                />
                Estado de Caja
              </span>
              {h.checkingCashStatus ? (
                <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
              ) : (
                <Badge
                  className="w-fit text-sm px-3 py-1"
                  variant={h.isCashOpen ? "default" : "destructive"}
                >
                  {h.isCashOpen ? "Abierta" : "Cerrada"}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {h.checkingCashStatus ? (
              <div className="text-center py-4">
                <RefreshCw className="h-6 w-6 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Verificando estado...</p>
              </div>
            ) : h.isCashOpen ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Monto Inicial:</span>
                  <span className="font-semibold text-green-700">
                    {formatCurrency(h.openingCash)}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  La caja está abierta y lista para realizar ventas.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-lg p-4">
                  <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                    La caja está cerrada
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                    Debe abrir la caja antes de realizar ventas en el POS.
                  </p>
                  <div className="space-y-3">
                    <Label htmlFor="opening_cash">Monto Inicial de Caja</Label>
                    <Input
                      className="w-full sm:max-w-xs h-12"
                      id="opening_cash"
                      min="0"
                      placeholder="0"
                      step="0.01"
                      type="number"
                      value={h.openingCashInput}
                      onChange={(e) => h.setOpeningCashInput(e.target.value)}
                    />
                    <Button
                      className="w-full sm:w-auto h-12"
                      disabled={h.openingCashRegister || !h.openingCashInput}
                      onClick={h.handleOpenCashRegister}
                    >
                      {h.openingCashRegister ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Abriendo...
                        </>
                      ) : (
                        <>
                          <DollarSign className="h-4 w-4 mr-2" />
                          Abrir Caja
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Summary Card */}
      {h.effectiveBranchId && h.dailySummary && (
        <Card className="bg-admin-bg-tertiary">
          <CardHeader className="pb-2 pt-4 sm:pt-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0" />
              Resumen del Día - {formatDate(new Date())}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Total Ventas
                </p>
                <p className="text-base sm:text-lg font-bold text-epoch-primary mt-0.5">
                  {formatCurrency(h.dailySummary.total_sales)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Transacciones
                </p>
                <p className="text-base sm:text-lg font-bold text-epoch-primary mt-0.5">
                  {h.dailySummary.total_transactions}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Efectivo Esperado
                </p>
                <p className="text-base sm:text-lg font-bold text-admin-success mt-0.5">
                  {formatCurrency(h.dailySummary.expected_cash)}
                </p>
              </div>
              <div>
                <p className="text-[10px] sm:text-xs text-admin-text-tertiary uppercase tracking-wide">
                  Ventas Efectivo
                </p>
                <p className="text-base sm:text-lg font-bold text-epoch-primary mt-0.5">
                  {formatCurrency(h.dailySummary.cash_sales)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs className="space-y-4" defaultValue="orders">
        <TabsList className="flex flex-col sm:flex-row h-auto w-full sm:w-auto">
          <TabsTrigger
            className="w-full sm:w-auto data-[state=active]:bg-admin-accent-secondary data-[state=active]:text-[#1A2B23]"
            value="closures"
          >
            Cierres de Caja
          </TabsTrigger>
          <TabsTrigger
            className="w-full sm:w-auto data-[state=active]:bg-admin-accent-secondary data-[state=active]:text-[#1A2B23]"
            value="orders"
            onClick={() => h.setOrdersTab(true)}
          >
            Ventas / Órdenes
          </TabsTrigger>
          <TabsTrigger
            className="w-full sm:w-auto data-[state=active]:bg-admin-accent-secondary data-[state=active]:text-[#1A2B23]"
            value="credit_notes"
            onClick={() => h.fetchCreditNotes()}
          >
            Notas de Crédito
          </TabsTrigger>
        </TabsList>

        <TabsContent value="closures">
          <CashRegisterClosureSection
            loading={h.loading}
            closures={h.closures}
            closuresCurrentPage={h.closuresCurrentPage}
            closuresItemsPerPage={h.closuresItemsPerPage}
            closuresTotalCount={h.closuresTotalCount}
            effectiveBranchId={h.effectiveBranchId}
            isOperativoMode={h.isOperativoMode}
            isSuperAdmin={h.isSuperAdmin}
            reopening={h.reopening}
            getStatusBadge={h.getStatusBadge}
            handleReopenCash={h.handleReopenCash}
            setClosuresCurrentPage={h.setClosuresCurrentPage}
            setClosuresItemsPerPage={h.setClosuresItemsPerPage}
          />
        </TabsContent>

        <TabsContent value="orders">
          <CashRegisterOrdersSection
            orders={h.orders}
            loadingOrders={h.loadingOrders}
            ordersCurrentPage={h.ordersCurrentPage}
            ordersItemsPerPage={h.ordersItemsPerPage}
            ordersTotalCount={h.ordersTotalCount}
            orderFilters={h.orderFilters}
            orderSearchTerm={h.orderSearchTerm}
            orderProductFilter={h.orderProductFilter}
            isGlobalView={h.isGlobalView}
            isSuperAdmin={h.isSuperAdmin}
            creditNotes={h.creditNotes}
            loadingCreditNotes={h.loadingCreditNotes}
            orderFiltersExpanded={h.orderFiltersExpanded}
            fetchOrders={h.fetchOrders}
            fetchCreditNotes={h.fetchCreditNotes}
            handleCancelOrder={h.handleCancelOrder}
            handleDeleteOrder={h.handleDeleteOrder}
            setOrdersTab={h.setOrdersTab}
            setOrderFilters={h.setOrderFilters}
            setOrderSearchTerm={h.setOrderSearchTerm}
            setOrderProductFilter={h.setOrderProductFilter}
            setOrdersCurrentPage={h.setOrdersCurrentPage}
            setOrdersItemsPerPage={h.setOrdersItemsPerPage}
            setOrderFiltersExpanded={h.setOrderFiltersExpanded}
            setSelectedOrderForAction={h.setSelectedOrderForAction}
            setOrderActionDialog={h.setOrderActionDialog}
            setOrderActionReason={h.setOrderActionReason}
            setRefundMethod={h.setRefundMethod}
          />
        </TabsContent>

        <TabsContent value="credit_notes">
          <CashRegisterOrdersSection
            orders={h.orders}
            loadingOrders={h.loadingOrders}
            ordersCurrentPage={h.ordersCurrentPage}
            ordersItemsPerPage={h.ordersItemsPerPage}
            ordersTotalCount={h.ordersTotalCount}
            orderFilters={h.orderFilters}
            orderSearchTerm={h.orderSearchTerm}
            orderProductFilter={h.orderProductFilter}
            isGlobalView={h.isGlobalView}
            isSuperAdmin={h.isSuperAdmin}
            creditNotes={h.creditNotes}
            loadingCreditNotes={h.loadingCreditNotes}
            orderFiltersExpanded={h.orderFiltersExpanded}
            fetchOrders={h.fetchOrders}
            fetchCreditNotes={h.fetchCreditNotes}
            handleCancelOrder={h.handleCancelOrder}
            handleDeleteOrder={h.handleDeleteOrder}
            setOrdersTab={h.setOrdersTab}
            setOrderFilters={h.setOrderFilters}
            setOrderSearchTerm={h.setOrderSearchTerm}
            setOrderProductFilter={h.setOrderProductFilter}
            setOrdersCurrentPage={h.setOrdersCurrentPage}
            setOrdersItemsPerPage={h.setOrdersItemsPerPage}
            setOrderFiltersExpanded={h.setOrderFiltersExpanded}
            setSelectedOrderForAction={h.setSelectedOrderForAction}
            setOrderActionDialog={h.setOrderActionDialog}
            setOrderActionReason={h.setOrderActionReason}
            setRefundMethod={h.setRefundMethod}
          />
        </TabsContent>
      </Tabs>

      {/* Close Cash Register Dialog */}
      <Dialog open={h.showCloseDialog} onOpenChange={h.setShowCloseDialog}>
        <DialogContent className="max-w-[calc(100vw-1rem)] sm:max-w-2xl md:max-w-4xl lg:max-w-6xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6 gap-4">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              Cerrar Caja
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Complete los datos para cerrar la caja del día
            </DialogDescription>
          </DialogHeader>

          <CashRegisterPaymentSection
            loadingSummary={h.loadingSummary}
            dailySummary={h.dailySummary}
            movements={h.movements}
            loadingMovements={h.loadingMovements}
            movementFilter={h.movementFilter}
            movementTypeFilter={h.movementTypeFilter}
            openingCash={h.openingCash}
            actualCash={h.actualCash}
            cardMachineDebit={h.cardMachineDebit}
            cardMachineCredit={h.cardMachineCredit}
            transferTotal={h.transferTotal}
            notes={h.notes}
            discrepancies={h.discrepancies}
            cashDifference={h.cashDifference}
            isOperativoMode={h.isOperativoMode}
            fieldOperationIdFromUrl={h.fieldOperationIdFromUrl}
            setOpeningCash={h.setOpeningCash}
            setActualCash={h.setActualCash}
            setCardMachineDebit={h.setCardMachineDebit}
            setCardMachineCredit={h.setCardMachineCredit}
            setTransferTotal={h.setTransferTotal}
            setNotes={h.setNotes}
            setDiscrepancies={h.setDiscrepancies}
            setMovementFilter={h.setMovementFilter}
            setMovementTypeFilter={h.setMovementTypeFilter}
          />

          <CashRegisterActionsSection
            isOperativoMode={h.isOperativoMode}
            fieldOperationIdFromUrl={h.fieldOperationIdFromUrl}
            effectiveBranchId={h.effectiveBranchId}
            isSuperAdmin={h.isSuperAdmin}
            closing={h.closing}
            closingEnabled={!!h.dailySummary}
            handleCloseCashRegister={h.handleCloseCashRegister}
            setShowCloseDialog={h.setShowCloseDialog}
          />
        </DialogContent>
      </Dialog>

      {/* Order Action Dialog (cancel/delete) — sibling to Close Dialog */}
      <CashRegisterOrderDialog
        orderActionDialog={h.orderActionDialog}
        selectedOrderForAction={h.selectedOrderForAction}
        orderActionReason={h.orderActionReason}
        refundMethod={h.refundMethod}
        processingOrderAction={h.processingOrderAction}
        setOrderActionDialog={h.setOrderActionDialog}
        setSelectedOrderForAction={h.setSelectedOrderForAction}
        setOrderActionReason={h.setOrderActionReason}
        setRefundMethod={h.setRefundMethod}
        handleCancelOrder={h.handleCancelOrder}
        handleDeleteOrder={h.handleDeleteOrder}
      />
    </div>
  );
}
