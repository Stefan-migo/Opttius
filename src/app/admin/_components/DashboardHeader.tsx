"use client";

import { Calendar, Package, RefreshCw, ShoppingCart, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface DashboardHeaderProps {
  refreshing: boolean;
  pendingWorkOrders: number;
  onRefresh: () => void;
  onOpenAppointment: () => void;
}

export default function DashboardHeader({
  refreshing,
  pendingWorkOrders,
  onRefresh,
  onOpenAppointment,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col md:flex-col lg:flex-col xl:flex-row justify-between items-start gap-3 md:gap-4 xl:gap-6 pb-3 md:pb-4 border-b border-admin-border-primary/20">
      <div className="space-y-1">
        <h1
          className="text-xl md:text-3xl lg:text-4xl font-display font-bold tracking-tight text-admin-text-primary uppercase"
          data-tour="dashboard-header"
        >
          Resumen Ejecutivo
        </h1>
        <p className="text-[10px] sm:text-xs font-serif italic text-admin-text-tertiary tracking-[0.15em] sm:tracking-[0.2em] uppercase">
          Visión general del negocio
        </p>
      </div>

      {/* Desktop-only action buttons - hidden on mobile */}
      <div className="hidden md:flex items-center gap-1.5 sm:gap-2">
        <Button
          aria-label="Actualizar"
          className="h-9 w-9 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-xl transition-all hover:shadow-md hover:border-epoch-accent/30"
          disabled={refreshing}
          size="icon"
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
        </Button>
        <Link href="/admin/pos">
          <Button className="h-9 sm:h-10 px-3 sm:px-6 bg-epoch-primary hover:bg-epoch-surface text-white font-bold rounded-xl transition-all shadow-xl flex items-center gap-1.5 sm:gap-2 border border-admin-border-primary/10">
            <ShoppingCart className="h-4 w-4" />
            <span className="font-display tracking-widest text-[10px] sm:text-xs">
              POS
            </span>
          </Button>
        </Link>
        <Button
          className="h-9 w-9 sm:h-10 sm:w-auto sm:px-6 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-xl transition-all hover:shadow-md hover:border-admin-accent-primary/30"
          size="icon"
          variant="outline"
          onClick={onOpenAppointment}
        >
          <Calendar className="h-4 w-4" />
          <span className="font-display tracking-widest text-xs hidden sm:inline ml-2">
            AGENDA
          </span>
        </Button>
        <Link href="/admin/work-orders">
          <Button
            className="h-9 w-9 sm:h-10 sm:w-auto sm:px-6 bg-admin-bg-tertiary/50 border-admin-border-primary/30 text-admin-text-primary font-bold rounded-xl transition-all hover:shadow-md hover:border-admin-accent-primary/30 relative"
            size="icon"
            variant="outline"
          >
            <div className="relative">
              <Package className="h-4 w-4" />
              {pendingWorkOrders > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 bg-admin-accent-secondary text-[#1A2B23] text-[8px] font-black flex items-center justify-center border border-admin-bg-secondary leading-none shadow-sm">
                  {pendingWorkOrders}
                </span>
              )}
            </div>
            <span className="font-display tracking-widest text-xs hidden sm:inline ml-2">
              TALLER
            </span>
          </Button>
        </Link>
        <Link href="/admin/customers/new">
          <Button className="h-9 sm:h-10 px-3 sm:px-6 bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary font-bold rounded-xl transition-all shadow-lg flex items-center gap-1.5 sm:gap-2 border border-epoch-primary/20">
            <Users className="h-4 w-4" />
            <span className="font-display tracking-widest text-[10px] sm:text-xs">
              NUEVO CLIENTE
            </span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
