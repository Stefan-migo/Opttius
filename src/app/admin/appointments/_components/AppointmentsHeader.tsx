"use client";

import { CalendarDays, Plus, Settings } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

interface AppointmentsHeaderProps {
  onNewAppointment: () => void;
}

export function AppointmentsHeader({
  onNewAppointment,
}: AppointmentsHeaderProps) {
  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-4xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
          Agenda
        </h1>
        <p className="text-[10px] sm:text-xs font-serif italic text-admin-text-tertiary uppercase tracking-[0.2em] sm:tracking-[0.3em]">
          Gestión Técnica de Consultas y Procedimientos Ópticos
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/appointments/settings">
          <Button
            aria-label="Configuración"
            className="h-9 w-9 sm:w-auto sm:px-4 bg-white border-admin-border-primary/20 hover:border-epoch-accent/40 text-admin-text-primary font-display font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all"
            size="sm"
            variant="outline"
          >
            <Settings className="h-4 w-4 sm:mr-2 shrink-0" />
            <span className="hidden sm:inline">Configuración</span>
          </Button>
        </Link>
        <Button
          className="h-9 gap-1.5 px-4 sm:px-6 bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-widest uppercase rounded-xl transition-all shadow-premium-sm"
          size="sm"
          onClick={onNewAppointment}
        >
          <Plus className="h-4 w-4 shrink-0" />
          <span className="text-xs sm:text-sm">Nueva Cita</span>
        </Button>
      </div>
    </div>
  );
}
