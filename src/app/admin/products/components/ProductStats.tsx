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
    <div className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-admin-border-primary/20 bg-white">
      <div className="p-8 border-r border-admin-border-primary/10 group hover:bg-admin-bg-tertiary transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] group-hover:text-epoch-primary transition-colors">
              VALORACIÓN TOTAL
            </p>
            <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
              {formatPrice(stats.totalValue)}
            </p>
            <p className="text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-2">
              {statsLabel}
            </p>
          </div>
          <BarChart3 className="h-5 w-5 text-epoch-accent/40 group-hover:text-epoch-primary transition-colors" />
        </div>
      </div>

      <div className="p-8 border-r border-admin-border-primary/10 group hover:bg-admin-bg-tertiary transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] group-hover:text-epoch-primary transition-colors">
              REGISTRO GLOBAL
            </p>
            <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
              {stats.totalProducts}
            </p>
            <p className="text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-2">
              Ítems en archivo
            </p>
          </div>
          <Package className="h-5 w-5 text-epoch-accent/40 group-hover:text-epoch-primary transition-colors" />
        </div>
      </div>

      <div className="p-8 border-r border-admin-border-primary/10 group hover:bg-admin-bg-tertiary transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] group-hover:text-admin-success transition-colors">
              ESTADO ACTIVO
            </p>
            <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
              {stats.activeProducts}
            </p>
            <p className="text-[9px] font-serif italic text-admin-text-tertiary uppercase tracking-wider pt-2">
              Disponibilidad inmediata
            </p>
          </div>
          <TrendingUp className="h-5 w-5 text-admin-success/40 group-hover:text-admin-success transition-colors" />
        </div>
      </div>

      <div className="p-8 group hover:bg-admin-error/5 transition-all duration-300">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] group-hover:text-admin-error transition-colors">
              ALERTA DE STOCK
            </p>
            <p className="text-2xl font-display font-bold text-admin-text-primary tracking-tight">
              {stats.lowStockCount}
            </p>
            <p className="text-[9px] font-serif italic text-admin-error/60 uppercase tracking-wider pt-2">
              Reposición requerida
            </p>
          </div>
          <AlertTriangle className="h-5 w-5 text-admin-error/30 group-hover:text-admin-error transition-colors" />
        </div>
      </div>
    </div>
  );
}
