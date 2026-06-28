"use client";

import { AlertTriangle, ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardAlertsProps {
  lowStockProducts: unknown[];
}

export default function DashboardAlerts({
  lowStockProducts,
}: DashboardAlertsProps) {
  if (lowStockProducts.length === 0) return null;

  return (
    <Card className="border border-admin-error/20 bg-admin-error/[0.02] rounded-xl shadow-none overflow-hidden animate-in slide-in-from-top duration-500 relative">
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
        <AlertTriangle size={60} />
      </div>
      <CardContent className="p-4 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-admin-error/10 border border-admin-error/20 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-admin-error" />
            </div>
            <div>
              <p className="font-display font-medium text-admin-text-primary text-sm tracking-wide uppercase">
                {lowStockProducts.length} Alerta
                {lowStockProducts.length !== 1 ? "s" : ""} de Inventario
              </p>
              <p className="text-[11px] font-serif italic text-admin-text-tertiary mt-0.5">
                Artículos críticos:{" "}
                {lowStockProducts
                  .slice(0, 2)
                  .map((p: unknown) => (p as { name: string }).name)
                  .join(", ")}
                {lowStockProducts.length > 2 &&
                  ` y ${lowStockProducts.length - 2} más`}
              </p>
            </div>
          </div>
          <Link href="/admin/products?filter=low_stock">
            <Button
              className="h-9 font-display tracking-widest text-[10px] bg-admin-bg-tertiary/50 text-admin-error border-admin-error/30 hover:bg-admin-error hover:text-white rounded-xl transition-all"
              size="sm"
              variant="outline"
            >
              GESTIONAR ARCHIVO
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
