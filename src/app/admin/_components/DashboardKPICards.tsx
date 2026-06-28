"use client";

import {
  AlertTriangle,
  Calendar,
  DollarSign,
  Package,
  Receipt,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatCurrency } from "@/lib/utils";

import type { DashboardData } from "./types";

interface DashboardKPICardsProps {
  data: DashboardData;
  revenuePeriod: string;
  branches?: Array<{ id: string; name: string }>;
  currentBranchId: string | null | undefined;
  isGlobalView: boolean;
}

export default function DashboardKPICards({
  data,
  revenuePeriod,
  branches,
  currentBranchId,
  isGlobalView,
}: DashboardKPICardsProps) {
  const currentBranch = branches?.find((b) => b.id === currentBranchId);
  const statsLabel = isGlobalView
    ? "Todas las sucursales"
    : currentBranch
      ? `Sucursal: ${currentBranch.name}`
      : "Sucursal seleccionada";

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
      {/* 1. Citas de Hoy - Más visible */}
      <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-2 md:p-4 relative">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-epoch-accent/10 border border-epoch-accent/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-epoch-accent" />
            </div>
            <Badge className="bg-epoch-primary text-white border-none rounded-lg text-[6px] md:text-[8px] font-display font-bold tracking-widest px-1 py-0">
              HOY
            </Badge>
          </div>
          <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
            {data.kpis.appointments?.today || 0}
          </p>
          <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
            Citas
          </p>
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
            <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
              {data.kpis.appointments?.confirmed || 0} conf.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 2. Trabajos Pendientes - Badge rojo */}
      <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-2 md:p-4 relative">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-admin-error/10 border border-admin-error/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <Package className="h-4 w-4 md:h-5 md:w-5 text-admin-error" />
            </div>
            {(data.kpis.workOrders?.pending ?? 0) > 0 && (
              <Badge className="bg-admin-error text-white border-none rounded-lg text-[6px] md:text-[8px] font-display font-bold tracking-widest px-1 py-0 animate-pulse">
                {data.kpis.workOrders?.pending ?? 0}
              </Badge>
            )}
          </div>
          <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
            {data.kpis.workOrders?.pending || 0}
          </p>
          <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
            Trabajos
          </p>
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
            <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
              {data.kpis.workOrders?.inProgress || 0} proc.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 3. Ingresos */}
      <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-2 md:p-4 relative">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-epoch-primary/10 border border-epoch-primary/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-epoch-primary" />
            </div>
            <div
              className={cn(
                "text-[7px] md:text-[9px] font-display font-bold px-1 md:px-1.5 py-0.5 rounded",
                data.kpis.revenue.change >= 0
                  ? "text-epoch-primary bg-epoch-primary/10"
                  : "text-admin-error bg-admin-error/10",
              )}
            >
              {data.kpis.revenue.change >= 0 ? "+" : ""}
              {data.kpis.revenue.change.toFixed(1)}%
            </div>
          </div>
          <p
            className="text-base md:text-lg font-display font-bold text-admin-text-primary tracking-tight truncate"
            title={formatCurrency(data.kpis.revenue.current)}
          >
            {formatCurrency(data.kpis.revenue.current)}
          </p>
          <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
            Ingresos
          </p>
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
            <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
              {revenuePeriod} días
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 4. Presupuestos Abiertos */}
      <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-2 md:p-4 relative">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <Receipt className="h-4 w-4 md:h-5 md:w-5 text-amber-500" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
            {data.kpis.quotes?.pending || 0}
          </p>
          <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
            Presupuestos
          </p>
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
            <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
              {data.kpis.quotes?.converted || 0} cerr.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 5. Alertas Stock */}
      <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-2 md:p-4 relative">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div
              className={cn(
                "h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
                data.kpis.products.lowStock > 0
                  ? "bg-admin-error/10 border border-admin-error/20"
                  : "bg-epoch-primary/10 border border-epoch-primary/20",
              )}
            >
              <AlertTriangle
                className={cn(
                  "h-4 w-4 md:h-5 md:w-5",
                  data.kpis.products.lowStock > 0
                    ? "text-admin-error"
                    : "text-epoch-primary",
                )}
              />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
            {data.kpis.products.lowStock}
          </p>
          <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
            Stock
          </p>
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
            <span className="text-[7px] md:text-[8px] font-display text-admin-text-tertiary/60">
              {data.kpis.products.outOfStock} sin stock
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 6. Clientes Totales */}
      <Card className="col-span-1 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-2 md:p-4 relative">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-epoch-accent/10 border border-epoch-accent/20 flex items-center justify-center transition-transform group-hover:scale-110">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-epoch-accent" />
            </div>
          </div>
          <p className="text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
            {data.kpis.customers.total}
          </p>
          <p className="text-[8px] md:text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] mt-0.5 md:mt-1">
            Clientes
          </p>
          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t border-admin-border-primary/5">
            <span className="text-[7px] md:text-[8px] font-display text-epoch-primary">
              +{data.kpis.customers.new} nuevos
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
