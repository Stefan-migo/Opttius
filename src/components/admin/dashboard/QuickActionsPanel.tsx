"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Package, Users, Plus, Zap, FileText } from "lucide-react";
import { DashboardSearch } from "@/components/admin/DashboardSearch";

interface QuickActionsPanelProps {
  onNewAppointment: () => void;
}

export function QuickActionsPanel({
  onNewAppointment,
}: QuickActionsPanelProps) {
  return (
    <Card className="border-none bg-admin-bg-tertiary/30 rounded-none shadow-none h-full group">
      <CardHeader className="pb-4 border-b border-admin-border-primary/5 bg-admin-bg-tertiary/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-epoch-accent/5 border border-epoch-accent/10 flex items-center justify-center">
            <Zap className="h-5 w-5 text-epoch-accent" />
          </div>
          <div>
            <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
              Comandos
            </CardTitle>
            <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest">
              Operaciones de Acceso Rápido
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="space-y-3">
          <DashboardSearch type="customer" placeholder="LOCALIZAR CLIENTE..." />
          <DashboardSearch
            type="product"
            placeholder="IDENTIFICAR PRODUCTO..."
          />
        </div>

        <Button
          onClick={onNewAppointment}
          className="w-full h-12 bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] rounded-none shadow-premium-sm transition-all flex items-center justify-center gap-3 uppercase cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          Nueva Cita Médica
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            asChild
            className="h-20 flex-col gap-2 bg-admin-bg-tertiary/50 border-admin-border-primary/20 hover:border-epoch-accent/40 text-admin-text-primary rounded-none transition-all cursor-pointer hover:shadow-md"
          >
            <Link href="/admin/products">
              <Package className="h-5 w-5 text-epoch-primary" />
              <span className="text-[9px] font-display font-bold uppercase tracking-widest">
                Catálogo
              </span>
            </Link>
          </Button>
          <Button
            variant="outline"
            asChild
            className="h-20 flex-col gap-2 bg-admin-bg-tertiary/50 border-admin-border-primary/20 hover:border-epoch-accent/40 text-admin-text-primary rounded-none transition-all cursor-pointer hover:shadow-md"
          >
            <Link href="/admin/customers">
              <Users className="h-5 w-5 text-epoch-accent" />
              <span className="text-[9px] font-display font-bold uppercase tracking-widest">
                Clientes
              </span>
            </Link>
          </Button>
        </div>

        <div className="pt-6 mt-6 border-t border-admin-border-primary/10">
          <p className="text-[9px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em] mb-4">
            SISTEMA DE ASISTENCIA
          </p>
          <div className="p-4 bg-admin-bg-tertiary/50 border border-admin-border-primary/10 rounded-none relative overflow-hidden group/box">
            <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover/box:opacity-[0.1] transition-opacity">
              <FileText size={80} />
            </div>
            <p className="text-[11px] font-serif italic text-admin-text-secondary leading-relaxed mb-3">
              &quot;La precisión es el sello distintivo de la maestría
              óptica.&quot;
            </p>
            <Button
              variant="link"
              asChild
              className="h-auto p-0 text-[10px] font-display font-bold text-epoch-accent uppercase tracking-widest hover:text-epoch-primary"
            >
              <Link href="/admin/docs">Ver Documentación →</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
