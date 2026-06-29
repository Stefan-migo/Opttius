"use client";

import { Building2, CalendarDays, ChevronLeft, ChevronRight, Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Branch {
  id: string;
  name: string;
}

interface AppointmentsFiltersProps {
  view: "day" | "week" | "month";
  statusFilter: string;
  currentDate: Date;
  weekLabelDate: Date;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
  selectedBranchForView: string | null;
  branches: Branch[];
  onViewChange: (view: "day" | "week" | "month") => void;
  onStatusFilterChange: (value: string) => void;
  onNavigatePrev: () => void;
  onNavigateNext: () => void;
  onGoToToday: () => void;
  onBranchChange: (value: string) => void;
}

export function AppointmentsFilters({
  view,
  statusFilter,
  currentDate,
  weekLabelDate,
  isGlobalView,
  isSuperAdmin,
  selectedBranchForView,
  branches,
  onViewChange,
  onStatusFilterChange,
  onNavigatePrev,
  onNavigateNext,
  onGoToToday,
  onBranchChange,
}: AppointmentsFiltersProps) {
  const formatDateLabel = () => {
    if (view === "day") {
      return currentDate.toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    }
    if (view === "week") {
      return `Semana del ${weekLabelDate.toLocaleDateString("es-CL", { day: "numeric", month: "long" })}`;
    }
    return currentDate.toLocaleDateString("es-CL", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-xl shadow-none overflow-hidden">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-4 md:gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center bg-white p-1 rounded-xl border border-admin-border-primary/20 w-fit">
              <Button
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-admin-bg-tertiary text-admin-text-primary rounded-lg sm:rounded-xl transition-all"
                size="sm"
                variant="ghost"
                onClick={onNavigatePrev}
              >
                <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                className="px-3 sm:px-6 h-8 sm:h-9 font-display font-bold text-[9px] sm:text-[10px] uppercase tracking-widest text-admin-text-secondary hover:bg-admin-bg-tertiary rounded-lg sm:rounded-xl transition-all"
                size="sm"
                variant="ghost"
                onClick={onGoToToday}
              >
                Hoy
              </Button>
              <Button
                className="h-8 w-8 sm:h-9 sm:w-9 p-0 hover:bg-admin-bg-tertiary text-admin-text-primary rounded-lg sm:rounded-xl transition-all"
                size="sm"
                variant="ghost"
                onClick={onNavigateNext}
              >
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-6 py-2 bg-white rounded-xl border border-admin-border-primary/20 min-w-0">
              <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 text-epoch-primary shrink-0" />
              <span className="text-sm sm:text-base md:text-lg font-display font-bold text-admin-text-primary uppercase tracking-tight truncate">
                {formatDateLabel()}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {isGlobalView && isSuperAdmin && (
              <div className="flex items-center gap-2">
                <Select
                  value={selectedBranchForView || ""}
                  onValueChange={onBranchChange}
                >
                  <SelectTrigger className="w-[140px] sm:w-[160px] md:w-[180px] h-9 sm:h-10 bg-white border-admin-border-primary/20 font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase rounded-xl focus:ring-epoch-primary/20 transition-all">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-epoch-primary" />
                      <SelectValue placeholder="SUCURSAL" />
                    </div>
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-admin-border-primary/20 shadow-premium-lg">
                    {branches.map((branch) => (
                      <SelectItem
                        className="font-display font-medium text-[10px] tracking-widest uppercase"
                        key={branch.id}
                        value={branch.id}
                      >
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="h-10 w-px bg-admin-border-primary/10 hidden md:block mx-1" />

            <Select
              value={view}
              onValueChange={(value: "day" | "week" | "month") =>
                onViewChange(value)
              }
            >
              <SelectTrigger className="w-[90px] sm:w-[110px] md:w-[120px] h-9 sm:h-10 bg-white border-admin-border-primary/20 font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase rounded-xl transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary/20 shadow-premium-lg">
                <SelectItem
                  className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                  value="day"
                >
                  Día
                </SelectItem>
                <SelectItem
                  className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                  value="week"
                >
                  Semana
                </SelectItem>
                <SelectItem
                  className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                  value="month"
                >
                  Mes
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={onStatusFilterChange}>
              <SelectTrigger className="w-[140px] sm:w-[160px] md:w-[180px] h-9 sm:h-10 bg-white border-admin-border-primary/20 font-display font-bold text-[9px] sm:text-[10px] tracking-widest uppercase rounded-xl transition-all">
                <div className="flex items-center gap-2">
                  <Filter className="h-3.5 w-3.5 text-epoch-accent" />
                  <SelectValue placeholder="ESTADO" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary/20 shadow-premium-lg">
                <SelectItem
                  className="font-display font-medium text-[9px] sm:text-[10px] tracking-widest uppercase"
                  value="all"
                >
                  <span className="hidden sm:inline">TODOS LOS ESTADOS</span>
                  <span className="sm:hidden">Todos</span>
                </SelectItem>
                <SelectItem
                  className="font-display font-medium text-[10px] tracking-widest uppercase text-admin-info"
                  value="scheduled"
                >
                  PROGRAMADAS
                </SelectItem>
                <SelectItem
                  className="font-display font-medium text-[10px] tracking-widest uppercase text-admin-success"
                  value="confirmed"
                >
                  CONFIRMADAS
                </SelectItem>
                <SelectItem
                  className="font-display font-medium text-[10px] tracking-widest uppercase text-epoch-primary"
                  value="completed"
                >
                  COMPLETADAS
                </SelectItem>
                <SelectItem
                  className="font-display font-medium text-[10px] tracking-widest uppercase text-admin-error"
                  value="cancelled"
                >
                  CANCELADAS
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
