"use client";

import { Filter } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NOTIFICATION_TYPE_LABELS } from "@/lib/notifications/constants";

interface NotificationFiltersProps {
  filters: {
    unreadOnly: boolean;
    type: string;
    priority: string;
  };
  onFilterChange: (filters: {
    unreadOnly: boolean;
    type: string;
    priority: string;
  }) => void;
}

export function NotificationFilters({
  filters,
  onFilterChange,
}: NotificationFiltersProps) {
  return (
    <div className="sticky top-24 space-y-6">
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-admin-text-tertiary uppercase tracking-widest flex items-center gap-2">
          <Filter className="h-3.5 w-3.5" />
          Filtros de búsqueda
        </h3>

        <div className="space-y-5 bg-white p-6 rounded-2xl border border-admin-border-primary/50 shadow-soft">
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-admin-text-secondary uppercase">
              Estado
            </label>
            <Select
              value={filters.unreadOnly ? "unread" : "all"}
              onValueChange={(value) =>
                onFilterChange({ ...filters, unreadOnly: value === "unread" })
              }
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-admin-border-primary focus:ring-admin-accent-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary">
                <SelectItem value="all">Todas las alertas</SelectItem>
                <SelectItem value="unread">Solo sin leer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-admin-text-secondary uppercase">
              Tipo de Evento
            </label>
            <Select
              value={filters.type || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  type: value === "all" ? "" : value,
                })
              }
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-admin-border-primary focus:ring-admin-accent-primary/20">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary">
                <SelectItem value="all">Ver todas</SelectItem>
                {Object.entries(NOTIFICATION_TYPE_LABELS).map(
                  ([value, label]) => (
                    <SelectItem className="text-xs" key={value} value={value}>
                      {label}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-[11px] font-bold text-admin-text-secondary uppercase">
              Prioridad
            </label>
            <Select
              value={filters.priority || "all"}
              onValueChange={(value) =>
                onFilterChange({
                  ...filters,
                  priority: value === "all" ? "" : value,
                })
              }
            >
              <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-admin-border-primary focus:ring-admin-accent-primary/20">
                <SelectValue placeholder="Relevancia" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary">
                <SelectItem value="all">Cualquier prioridad</SelectItem>
                <SelectItem className="text-xs" value="low">
                  Baja (Info)
                </SelectItem>
                <SelectItem className="text-xs" value="medium">
                  Media (Aviso)
                </SelectItem>
                <SelectItem className="text-xs" value="high">
                  Alta (Importante)
                </SelectItem>
                <SelectItem
                  className="text-xs text-admin-error font-bold"
                  value="urgent"
                >
                  Urgente (Crítico)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            className="w-full text-[10px] font-bold text-admin-text-tertiary hover:text-admin-text-primary uppercase tracking-tighter"
            variant="ghost"
            onClick={() =>
              onFilterChange({
                unreadOnly: false,
                type: "",
                priority: "",
              })
            }
          >
            Restablecer filtros
          </Button>
        </div>
      </div>
    </div>
  );
}
