"use client";

import { RefreshCw } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { formatCurrency, formatDateTime } from "@/lib/utils";

import CashRegisterHeader from "./_components/CashRegisterHeader";
import CashRegisterSummary from "./_components/CashRegisterSummary";
import CashRegisterMovements from "./_components/CashRegisterMovements";

interface CashClosure {
  id: string;
  branch_id: string;
  closure_date: string;
  closed_by: string;
  opening_cash_amount: number;
  total_sales: number;
  total_transactions: number;
  cash_sales: number;
  debit_card_sales: number;
  credit_card_sales: number;
  installments_sales: number;
  other_payment_sales: number;
  expected_cash: number;
  actual_cash: number | null;
  cash_difference: number;
  card_machine_debit_total: number;
  card_machine_credit_total: number;
  card_machine_difference: number;
  total_subtotal: number;
  total_tax: number;
  total_discounts: number;
  closing_cash_amount: number | null;
  notes: string | null;
  discrepancies: string | null;
  status: "draft" | "confirmed" | "reviewed" | "closed" | "reopened";
  opened_at: string;
  closed_at: string;
  confirmed_at: string | null;
  reopened_at?: string | null;
  reopened_by?: string | null;
  reopen_count?: number;
  reopen_notes?: string | null;
  pos_session_id?: string;
  branch?: {
    id: string;
    name: string;
    code: string;
  };
  closed_by_user?: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  total_amount: number;
  payment_method_type: string;
  created_at: string;
  order_items?: Array<{
    id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>;
}

interface Movement {
  id: string;
  movement_type: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_rut: string | null;
  payment_method: string;
  payment_method_code: string;
  amount: number;
  payment_status: string;
  paid_at: string;
  notes: string | null;
  order_total: number;
  order_payment_status: string | null;
}

export default function CashClosureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const closureId = params.id as string;

  const [closure, setClosure] = useState<CashClosure | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [movementFilter, setMovementFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClosure();
  }, [closureId]);

  useEffect(() => {
    if (closure?.pos_session_id) {
      fetchMovements(closure.pos_session_id);
    }
  }, [closure?.pos_session_id]);

  const fetchClosure = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/cash-register/closures/${closureId}`,
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setClosure(data.closure);
        setOrders(extractDataFromResponse(data));
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al cargar el cierre de caja");
        router.push("/admin/cash-register");
      }
    } catch (error: unknown) {
      console.error("Error fetching closure:", error);
      toast.error("Error al cargar el cierre de caja");
      router.push("/admin/cash-register");
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async (sessionId: string) => {
    setLoadingMovements(true);
    try {
      const response = await fetch(
        `/api/admin/cash-register/session-movements?session_id=${sessionId}`,
        { credentials: "include" },
      );

      if (response.ok) {
        const data = await response.json();
        setMovements(data.movements || []);
      } else {
        console.error("Error fetching movements");
      }
    } catch (error: unknown) {
      console.error("Error fetching movements:", error);
    } finally {
      setLoadingMovements(false);
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Efectivo",
      debit_card: "Tarjeta Débito",
      credit_card: "Tarjeta Crédito",
      installments: "Cuotas",
      transfer: "Transferencia",
      check: "Cheque",
      other: "Otro",
    };
    return labels[method] || method;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-epoch-primary mx-auto mb-4" />
          <p className="text-admin-text-tertiary">Cargando cierre de caja...</p>
        </div>
      </div>
    );
  }

  if (!closure) {
    return null;
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-0 min-w-0">
      <CashRegisterHeader
        closureDate={closure.closure_date}
        formatDateTime={formatDateTime}
        reopenedAt={closure.reopened_at}
        status={closure.status}
      />

      <CashRegisterSummary
        closure={closure}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
      />

      <CashRegisterMovements
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
        getPaymentMethodLabel={getPaymentMethodLabel}
        loadingMovements={loadingMovements}
        movementFilter={movementFilter}
        movements={movements}
        onMovementFilterChange={setMovementFilter}
        orders={orders}
        posSessionId={closure.pos_session_id}
      />
    </div>
  );
}
