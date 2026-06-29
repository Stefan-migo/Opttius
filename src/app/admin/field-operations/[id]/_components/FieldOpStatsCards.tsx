"use client";

import {
  Banknote,
  ExternalLink,
  FileText,
  Plus,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { formatPrice } from "@/lib/utils";

interface FieldOperation {
  id: string;
  name: string;
  scheduled_date: string;
  location: string | null;
  branch_id: string;
  status: string;
  created_at: string;
}

interface FieldOpStatsCardsProps {
  id: string;
  operation: FieldOperation;
  cashStatus: {
    isOpen: boolean;
    session?: { opening_cash_amount?: number };
  } | null;
  loadingCashStatus: boolean;
  onOpenCash: () => void;
  onAddCustomer: () => void;
  onCreateQuote: () => void;
}

export default function FieldOpStatsCards({
  id,
  operation,
  cashStatus,
  loadingCashStatus,
  onOpenCash,
  onAddCustomer,
  onCreateQuote,
}: FieldOpStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* Cash status card */}
      <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] p-4 min-h-[44px] flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Banknote className="h-5 w-5 shrink-0 text-admin-accent-primary" />
          <span className="font-medium text-admin-text-primary">
            Caja del operativo
          </span>
        </div>
        {loadingCashStatus ? (
          <div className="h-5 w-20 rounded bg-admin-bg-primary/50 animate-pulse" />
        ) : cashStatus?.isOpen ? (
          <>
            <p className="text-sm text-admin-text-secondary">
              Caja abierta
              {typeof cashStatus.session?.opening_cash_amount === "number" && (
                <span className="ml-1">
                  · Inicial:{" "}
                  {formatPrice(cashStatus.session.opening_cash_amount)}
                </span>
              )}
            </p>
            <Link
              className="text-sm font-medium text-admin-accent-primary hover:underline"
              href={`/admin/cash-register?field_operation_id=${id}`}
            >
              Cerrar caja →
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-admin-text-secondary">Caja cerrada</p>
            <button
              className="text-sm font-medium text-admin-accent-primary hover:underline text-left"
              type="button"
              onClick={onOpenCash}
            >
              Abrir caja
            </button>
          </>
        )}
      </div>

      {/* POS link */}
      <Link
        className="block rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] p-4 min-h-[44px] flex items-center gap-3"
        href={`/admin/pos?field_operation_id=${id}`}
      >
        <ShoppingCart className="h-5 w-5 shrink-0 text-admin-accent-primary" />
        <span className="font-medium text-admin-text-primary">Abrir POS</span>
        <ExternalLink className="h-4 w-4 ml-auto text-admin-text-tertiary" />
      </Link>

      {/* Customers button */}
      <button
        className="block w-full rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] p-4 min-h-[44px] flex items-center gap-3 text-left"
        type="button"
        onClick={onAddCustomer}
      >
        <Users className="h-5 w-5 shrink-0 text-admin-accent-primary" />
        <span className="font-medium text-admin-text-primary">Clientes</span>
        <UserPlus className="h-4 w-4 ml-auto text-admin-text-tertiary" />
      </button>

      {/* Quotes button */}
      <button
        className="block w-full rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] p-4 min-h-[44px] flex items-center gap-3 text-left"
        type="button"
        onClick={onCreateQuote}
      >
        <FileText className="h-5 w-5 shrink-0 text-admin-accent-primary" />
        <span className="font-medium text-admin-text-primary">
          Presupuestos
        </span>
        <Plus className="h-4 w-4 ml-auto text-admin-text-tertiary" />
      </button>
    </div>
  );
}
