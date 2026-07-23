import { Filter, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Filters {
  status: string;
  priority: string;
  category: string;
  search: string;
}

interface SupportTicketFiltersProps {
  filters: Filters;
  onFilterChange: (updates: Partial<Filters>) => void;
  onRefresh: () => void;
  statusLabels: Record<string, string>;
  priorityLabels?: Record<string, string>;
  categoryLabels: Record<string, string>;
}

export function SupportTicketFilters({
  filters,
  onFilterChange,
  onRefresh,
  statusLabels,
  categoryLabels,
}: SupportTicketFiltersProps) {
  return (
    <Card className="admin-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-epoch-primary">
          <Filter className="h-5 w-5 text-epoch-accent" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Estado</label>
            <Select
              value={filters.status}
              onOpenChange={() => {}}
              onValueChange={(value) =>
                onFilterChange({ status: value, ...(value !== filters.status && {} ) })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Prioridad</label>
            <Select
              value={filters.priority}
              onValueChange={(value) =>
                onFilterChange({ priority: value })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20">
                <SelectValue placeholder="Todas las prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Categoría</label>
            <Select
              value={filters.category}
              onValueChange={(value) =>
                onFilterChange({ category: value })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Buscar</label>
            <div className="flex gap-2">
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                placeholder="Ticket #, asunto, email..."
                value={filters.search}
                onChange={(e) =>
                  onFilterChange({ search: e.target.value })
                }
              />
              <Button
                className="rounded-xl border-admin-border-primary/20"
                size="icon"
                title="Refrescar"
                variant="outline"
                onClick={onRefresh}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
