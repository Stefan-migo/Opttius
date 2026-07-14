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

import {
  categoryLabels,
  type FiltersState,
  priorityLabels,
  statusLabels,
} from "./supportConstants";

interface TicketFiltersProps {
  filters: FiltersState;
  onFiltersChange: (updates: Partial<FiltersState>) => void;
  customers: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  }>;
  branches: Array<{ id: string; name: string; code: string }>;
  isSuperAdmin: boolean;
  isGlobalView: boolean;
  onRefresh: () => void;
}

export function TicketFilters({
  filters,
  onFiltersChange,
  customers,
  branches,
  isSuperAdmin,
  isGlobalView,
  onRefresh,
}: TicketFiltersProps) {
  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Filter className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">Estado</label>
            <Select
              value={filters.status}
              onValueChange={(value) =>
                onFiltersChange({ status: value })
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

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">
              Prioridad
            </label>
            <Select
              value={filters.priority}
              onValueChange={(value) =>
                onFiltersChange({ priority: value })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20">
                <SelectValue placeholder="Todas las prioridades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">
              Categoría
            </label>
            <Select
              value={filters.category}
              onValueChange={(value) =>
                onFiltersChange({ category: value })
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

          {isSuperAdmin && isGlobalView && branches.length > 1 && (
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-xs sm:text-sm font-medium">
                Sucursal
              </label>
              <Select
                value={filters.branch_id}
                onValueChange={(value) =>
                  onFiltersChange({ branch_id: value })
                }
              >
                <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 sm:space-y-2">
            <label className="text-xs sm:text-sm font-medium">Cliente</label>
            <Select
              value={filters.customer_id}
              onValueChange={(value) =>
                onFiltersChange({ customer_id: value })
              }
            >
              <SelectTrigger className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20">
                <SelectValue placeholder="Todos los clientes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los clientes</SelectItem>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name} (
                    {customer.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:space-y-2 sm:col-span-2 md:col-span-1">
            <label className="text-xs sm:text-sm font-medium">Buscar</label>
            <div className="flex gap-2">
              <Input
                className="rounded-xl focus:border-epoch-primary focus:ring-epoch-primary/20"
                placeholder="Ticket #, asunto..."
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ search: e.target.value })
                }
              />
              <Button
                className="rounded-xl border-admin-border-primary/20 min-h-[44px] min-w-[44px] shrink-0"
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
