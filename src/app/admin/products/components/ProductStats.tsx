"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Package, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

interface ProductStatsProps {
  stats: {
    totalProducts: number;
    activeProducts: number;
    lowStockCount: number;
    totalValue: number;
  };
  statsLabel: string;
  formatPrice: (amount: number) => string;
}

export default function ProductStats({
  stats,
  statsLabel,
  formatPrice,
}: ProductStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-0 border border-admin-border-primary/20 bg-admin-border-primary/5">
      <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border-r border-admin-border-primary/10">
        <CardContent className="p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] ">
                VALORACIÓN TOTAL
              </p>
              <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {formatPrice(stats.totalValue)}
              </p>
              <p className="text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-2">
                {statsLabel}
              </p>
            </div>
            <BarChart3 className="h-5 w-5 text-epoch-accent/40 " />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border-r border-admin-border-primary/10">
        <CardContent className="p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] ">
                REGISTRO GLOBAL
              </p>
              <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {stats.totalProducts}
              </p>
              <p className="text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-2">
                Ítems en archivo
              </p>
            </div>
            <Package className="h-5 w-5 text-epoch-accent/40 " />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border-r border-admin-border-primary/10">
        <CardContent className="p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] ">
                ESTADO ACTIVO
              </p>
              <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {stats.activeProducts}
              </p>
              <p className="text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-2">
                Disponibilidad inmediata
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-admin-success/40 " />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden">
        <CardContent className="p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] ">
                ALERTA DE STOCK
              </p>
              <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {stats.lowStockCount}
              </p>
              <p className="text-[9px] font-serif italic text-admin-error/60 uppercase tracking-wider pt-2">
                Reposición requerida
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-admin-error/30 " />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
