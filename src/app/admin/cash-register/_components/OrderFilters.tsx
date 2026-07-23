"use client";

import { ChevronDown, ChevronUp, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getTodayInTimezone } from "@/lib/utils/date-timezone";

interface Filters {
  payment_status: string;
  payment_method: string;
  date_from: string;
  date_to: string;
}

interface OrderFiltersProps {
  orderSearchTerm: string;
  orderFilters: Filters;
  orderProductFilter: string;
  orderFiltersExpanded: boolean;
  setOrderSearchTerm: (v: string) => void;
  setOrderFilters: (
    v: Filters | ((prev: Filters) => Filters),
  ) => void;
  setOrderProductFilter: (v: string) => void;
  setOrderFiltersExpanded: (v: boolean) => void;
  fetchOrders: () => Promise<void>;
}

export function OrderFilters({
  orderSearchTerm,
  orderFilters,
  orderProductFilter,
  orderFiltersExpanded,
  setOrderSearchTerm,
  setOrderFilters,
  setOrderProductFilter,
  setOrderFiltersExpanded,
  fetchOrders,
}: OrderFiltersProps) {
  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="flex-1 min-w-0">
            <Label className="text-xs sm:text-sm">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                className="pl-8 text-sm"
                placeholder="Orden, email, cliente..."
                value={orderSearchTerm}
                onChange={(e) => {
                  setOrderSearchTerm(e.target.value);
                  fetchOrders();
                }}
              />
            </div>
          </div>
          <Button
            className="md:hidden w-full sm:w-auto flex items-center justify-center gap-2"
            size="sm"
            type="button"
            variant="outline"
            onClick={() => setOrderFiltersExpanded(!orderFiltersExpanded)}
          >
            <Search className="h-4 w-4" />
            Filtros
            {orderFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        <div
          className={`grid gap-3 transition-all md:grid md:grid-cols-2 lg:grid-cols-5 ${
            orderFiltersExpanded ? "grid" : "hidden md:grid"
          }`}
        >
          <div className="md:col-span-2 lg:col-span-1">
            <Label className="text-xs sm:text-sm">Estado de Pago</Label>
            <Select
              value={orderFilters.payment_status}
              onValueChange={(v) => setOrderFilters({ ...orderFilters, payment_status: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagado</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="cancelled">Anulado</SelectItem>
                <SelectItem value="refunded">Reembolsado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs sm:text-sm">Método de Pago</Label>
            <Select
              value={orderFilters.payment_method}
              onValueChange={(v) => setOrderFilters({ ...orderFilters, payment_method: v })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="debit">Débito</SelectItem>
                <SelectItem value="credit">Crédito</SelectItem>
                <SelectItem value="transfer">Transferencia</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs sm:text-sm">Producto</Label>
            <Input
              className="text-sm h-9"
              placeholder="Ej: Kit Limpieza"
              value={orderProductFilter}
              onChange={(e) => setOrderProductFilter(e.target.value)}
            />
          </div>
          <div>
            <Label className="text-xs sm:text-sm">Fecha Desde</Label>
            <Input
              className="text-sm h-9"
              type="date"
              value={orderFilters.date_from}
              onChange={(e) => setOrderFilters({ ...orderFilters, date_from: e.target.value })}
            />
          </div>
          <div>
            <Label className="text-xs sm:text-sm">Fecha Hasta</Label>
            <Input
              className="text-sm h-9"
              type="date"
              value={orderFilters.date_to}
              onChange={(e) => setOrderFilters({ ...orderFilters, date_to: e.target.value })}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="h-9 text-xs"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                const today = getTodayInTimezone("America/Santiago");
                setOrderFilters((prev) => ({ ...prev, date_from: today, date_to: today }));
              }}
            >
              Hoy
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
