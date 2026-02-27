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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-0 border border-admin-border-primary/20 lg:border-0 bg-admin-border-primary/5 lg:bg-transparent rounded-xl overflow-hidden">
      <Card className="border-none bg-admin-bg-tertiary/50 rounded-lg lg:rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border border-admin-border-primary/10 lg:border-0 lg:border-r lg:border-admin-border-primary/10 last:border-r-0">
        <CardContent className="p-3 sm:p-6 md:p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-[8px] sm:text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                VALORACIÓN TOTAL
              </p>
              <p className="text-[10px] sm:text-base md:text-lg lg:text-2xl font-display font-bold text-admin-text-primary tracking-tight leading-tight">
                {formatPrice(stats.totalValue)}
              </p>
              <p className="text-[8px] sm:text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-1 sm:pt-2 truncate">
                {statsLabel}
              </p>
            </div>
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-accent/40 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-admin-bg-tertiary/50 rounded-lg lg:rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border border-admin-border-primary/10 lg:border-0 lg:border-r lg:border-admin-border-primary/10 last:border-r-0">
        <CardContent className="p-3 sm:p-6 md:p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-[8px] sm:text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                REGISTRO GLOBAL
              </p>
              <p className="text-base sm:text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {stats.totalProducts}
              </p>
              <p className="text-[8px] sm:text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-1 sm:pt-2 truncate">
                Ítems en archivo
              </p>
            </div>
            <Package className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-accent/40 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-admin-bg-tertiary/50 rounded-lg lg:rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border border-admin-border-primary/10 lg:border-0 lg:border-r lg:border-admin-border-primary/10 last:border-r-0">
        <CardContent className="p-3 sm:p-6 md:p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-[8px] sm:text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                ESTADO ACTIVO
              </p>
              <p className="text-base sm:text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {stats.activeProducts}
              </p>
              <p className="text-[8px] sm:text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-1 sm:pt-2 truncate">
                Disponibilidad inmediata
              </p>
            </div>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-admin-success/40 shrink-0" />
          </div>
        </CardContent>
      </Card>

      <Card className="border-none bg-admin-bg-tertiary/50 rounded-lg lg:rounded-none shadow-none hover:shadow-lg transition-shadow duration-300 group overflow-hidden border border-admin-border-primary/10 lg:border-0 lg:border-r-0 lg:border-admin-border-primary/10">
        <CardContent className="p-3 sm:p-6 md:p-8 relative">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5 sm:space-y-1 min-w-0">
              <p className="text-[8px] sm:text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.15em] sm:tracking-[0.2em] truncate">
                ALERTA DE STOCK
              </p>
              <p className="text-base sm:text-xl md:text-2xl font-display font-bold text-admin-text-primary tracking-tight">
                {stats.lowStockCount}
              </p>
              <p className="text-[8px] sm:text-[9px] font-serif italic text-admin-error/60 uppercase tracking-wider pt-1 sm:pt-2 truncate">
                Reposición requerida
              </p>
            </div>
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-admin-error/30 shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
