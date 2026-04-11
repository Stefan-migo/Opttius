"use client";

import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CreditCard,
  DollarSign,
  Loader2,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

import { POSBranchSelector } from "./POSBranchSelector";

export interface POSHeaderProps {
  // Branch
  currentBranchId?: string | null;
  isSuperAdmin?: boolean;
  branches?: Array<{ id: string; name: string }>;
  onBranchChange?: (branchId: string) => void;

  // Operativo
  operativo?: { id: string; name: string; branch_id: string } | null;
  fieldOperationIdFromUrl?: string | null;

  // Cash status
  isCashOpen?: boolean | null;
  checkingCashStatus?: boolean;
  effectiveBranchId?: string | null;

  // Cart totals
  cartLength?: number;
  total?: number;

  // Actions
  onOpenPendingBalance?: () => void;
  onClearCart?: () => void;

  // Loading states
  operativoLoading?: boolean;
}

export function POSHeader({
  currentBranchId,
  isSuperAdmin,
  branches = [],
  onBranchChange,
  operativo,
  fieldOperationIdFromUrl,
  isCashOpen,
  checkingCashStatus,
  effectiveBranchId,
  cartLength,
  total,
  onOpenPendingBalance,
  onClearCart,
  operativoLoading = false,
}: POSHeaderProps) {
  return (
    <>
      {/* Operativo mode banner */}
      {operativo && fieldOperationIdFromUrl && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-2 bg-admin-accent-primary/20 border-b border-admin-accent-primary/30 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium text-admin-text-primary">
            Modo operativo: {operativo.name}
          </span>
          <div className="flex items-center gap-3">
            <Link
              className="inline-flex items-center gap-1.5 text-sm text-admin-accent-primary hover:underline font-medium underline-offset-2"
              href={`/admin/field-operations/${fieldOperationIdFromUrl}`}
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al operativo
            </Link>
            <Link
              className="text-sm text-admin-accent-primary hover:underline font-medium underline-offset-2"
              href="/admin/pos"
            >
              Salir del modo operativo
            </Link>
          </div>
        </div>
      )}

      {/* Header - title, subtitle, Caja | Saldos */}
      <div className="border-b px-4 sm:px-6 py-3 sm:py-4 bg-[var(--admin-bg-primary)] flex-shrink-0">
        <div className="flex flex-col gap-3">
          {/* Title and subtitle */}
          <div className="min-w-0">
            <h1
              className="text-lg sm:text-2xl font-bold text-gray-900 truncate"
              data-tour="pos-header"
            >
              Punto de Venta (POS)
            </h1>
            <p className="text-sm text-gray-600">
              {operativo
                ? `Sistema de ventas - ${operativo.name}`
                : !currentBranchId && isSuperAdmin
                  ? "Sistema de ventas - Todas las sucursales"
                  : "Sistema de ventas"}
            </p>
          </div>

          {/* Branch selector (desktop only when not in operativo) */}
          {!operativo && <POSBranchSelector />}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2">
            <Link href="/admin/cash-register">
              <Button
                className="min-h-[44px] sm:min-h-0"
                size="sm"
                variant="outline"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Caja
              </Button>
            </Link>
            <Button
              className="min-h-[44px] sm:min-h-0"
              size="sm"
              title="Cobrar saldos pendientes de órdenes"
              variant="outline"
              onClick={onOpenPendingBalance}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Saldos Pendientes</span>
              <span className="sm:hidden">Saldos</span>
            </Button>
          </div>

          {/* Desktop only: Total and Clear */}
          <div className="hidden lg:flex flex-row items-center justify-between gap-2">
            <Badge
              className="text-base sm:text-lg px-3 sm:px-4 py-1.5 sm:py-2"
              variant="outline"
            >
              Total: {formatCurrency(total)}
            </Badge>
            <Button
              className="min-h-[40px] sm:min-h-0"
              disabled={cartLength === 0}
              size="sm"
              variant="outline"
              onClick={onClearCart}
            >
              <X className="h-4 w-4 mr-2" />
              Limpiar
            </Button>
          </div>
        </div>
      </div>

      {/* Cash Status Alert */}
      {operativoLoading ? (
        <div className="hidden lg:block px-4 sm:px-6 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando operativo...
          </div>
        </div>
      ) : !effectiveBranchId && isSuperAdmin ? (
        <div className="hidden lg:block px-4 sm:px-6 py-3 bg-amber-50 border-b border-amber-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>
                <span className="font-semibold">Selecciona una sucursal</span>
                <span className="hidden sm:inline">
                  {" "}
                  - Debes seleccionar una sucursal para poder procesar ventas
                </span>
              </span>
            </div>
            <Select
              value={currentBranchId || ""}
              onValueChange={onBranchChange}
            >
              <SelectTrigger className="h-9 w-48 text-sm">
                <SelectValue placeholder="Seleccionar sucursal" />
              </SelectTrigger>
              <SelectContent>
                {branches?.map((branch) => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : effectiveBranchId ? (
        <div
          className={`hidden lg:block px-4 sm:px-6 py-3 ${isCashOpen === false ? "bg-red-50 border-b border-red-200" : isCashOpen === true ? "bg-green-50 border-b border-green-200" : ""}`}
        >
          {checkingCashStatus ? (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Verificando estado de caja...
            </div>
          ) : isCashOpen === false ? (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2 text-sm text-red-800">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>
                  <span className="font-semibold">
                    {fieldOperationIdFromUrl
                      ? "La caja del operativo está cerrada"
                      : "La caja está cerrada"}
                  </span>
                  <span className="hidden sm:inline">
                    {" "}
                    -{" "}
                    {fieldOperationIdFromUrl
                      ? "Abre la caja desde el operativo para poder cobrar"
                      : "Abre la caja para poder procesar ventas"}
                  </span>
                </span>
              </div>
              <Link href="/admin/cash-register">
                <Button size="sm" variant="default">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Abrir Caja
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-green-800">
              <DollarSign className="h-4 w-4" />
              <span className="font-semibold">Caja abierta</span>
              {fieldOperationIdFromUrl && (
                <span className="hidden sm:inline"> - Operativo activo</span>
              )}
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}
