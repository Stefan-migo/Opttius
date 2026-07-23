"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { CreditNotesSection } from "./_components/CreditNotesSection";
import { OrderFilters } from "./_components/OrderFilters";
import { OrdersTable } from "./_components/OrdersTable";

interface OrdersSectionProps {
  orders: unknown[];
  loadingOrders: boolean;
  ordersCurrentPage: number;
  ordersItemsPerPage: number;
  ordersTotalCount: number;
  orderFilters: {
    payment_status: string;
    payment_method: string;
    date_from: string;
    date_to: string;
  };
  orderSearchTerm: string;
  orderProductFilter: string;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  creditNotes: unknown[];
  loadingCreditNotes: boolean;
  orderFiltersExpanded: boolean;
  selectedOrderForAction: unknown;
  orderActionDialog: "cancel" | "delete" | null;
  orderActionReason: string;
  refundMethod: string;
  processingOrderAction: boolean;
  fetchOrders: () => Promise<void>;
  fetchCreditNotes: () => Promise<void>;
  handleCancelOrder: (
    orderId: string,
    reason: string,
    method: string,
  ) => Promise<void>;
  handleDeleteOrder: (orderId: string) => Promise<void>;
  setOrdersTab: (v: boolean) => void;
  setOrderFilters: (
    v:
      | {
          payment_status: string;
          payment_method: string;
          date_from: string;
          date_to: string;
        }
      | ((prev: {
          payment_status: string;
          payment_method: string;
          date_from: string;
          date_to: string;
        }) => {
          payment_status: string;
          payment_method: string;
          date_from: string;
          date_to: string;
        }),
  ) => void;
  setOrderSearchTerm: (v: string) => void;
  setOrderProductFilter: (v: string) => void;
  setOrdersCurrentPage: (v: number) => void;
  setOrdersItemsPerPage: (v: number) => void;
  setOrderFiltersExpanded: (v: boolean) => void;
  setSelectedOrderForAction: (v: unknown) => void;
  setOrderActionDialog: (v: "cancel" | "delete" | null) => void;
  setOrderActionReason: (v: string) => void;
  setRefundMethod: (v: string) => void;
}

export function CashRegisterOrdersSection(props: OrdersSectionProps) {
  const {
    orders,
    loadingOrders,
    ordersCurrentPage,
    ordersItemsPerPage,
    ordersTotalCount,
    orderFilters,
    orderSearchTerm,
    orderProductFilter,
    isGlobalView,
    isSuperAdmin,
    creditNotes,
    loadingCreditNotes,
    orderFiltersExpanded,
    fetchOrders,
    setOrderFilters,
    setOrderSearchTerm,
    setOrderProductFilter,
    setOrdersCurrentPage,
    setOrdersItemsPerPage,
    setOrderFiltersExpanded,
    setSelectedOrderForAction,
    setOrderActionDialog,
  } = props;

  return (
    <>
      {/* Orders Tab */}
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] min-w-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Ventas / Órdenes</CardTitle>
            <Button size="sm" variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <OrderFilters
            fetchOrders={fetchOrders}
            orderFilters={orderFilters}
            orderFiltersExpanded={orderFiltersExpanded}
            orderProductFilter={orderProductFilter}
            orderSearchTerm={orderSearchTerm}
            setOrderFilters={setOrderFilters}
            setOrderFiltersExpanded={setOrderFiltersExpanded}
            setOrderProductFilter={setOrderProductFilter}
            setOrderSearchTerm={setOrderSearchTerm}
          />

          <OrdersTable
            isGlobalView={isGlobalView}
            isSuperAdmin={isSuperAdmin}
            loadingOrders={loadingOrders}
            orders={orders}
            ordersCurrentPage={ordersCurrentPage}
            ordersItemsPerPage={ordersItemsPerPage}
            ordersTotalCount={ordersTotalCount}
            setOrdersCurrentPage={setOrdersCurrentPage}
            setOrdersItemsPerPage={setOrdersItemsPerPage}
            onCancelOrder={(order) => {
              setSelectedOrderForAction(order);
              setOrderActionDialog("cancel");
            }}
            onDeleteOrder={(order) => {
              setSelectedOrderForAction(order);
              setOrderActionDialog("delete");
            }}
          />
        </CardContent>
      </Card>

      <CreditNotesSection
        creditNotes={creditNotes}
        loadingCreditNotes={loadingCreditNotes}
      />
    </>
  );
}
