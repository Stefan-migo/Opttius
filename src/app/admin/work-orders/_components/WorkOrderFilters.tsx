import { Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkOrderFiltersProps {
  searchTerm: string;
  statusFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export function WorkOrderFilters({
  searchTerm,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: WorkOrderFiltersProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1 min-w-0">
            <Label className="text-xs mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
              <Input
                className="pl-10 h-12 text-base"
                placeholder="Buscar por número, cliente, marco, laboratorio..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <div className="w-full sm:w-48">
            <Label className="text-xs mb-1 block">Estado</Label>
            <Select value={statusFilter} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full sm:w-[200px] h-12">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="quote">Presupuesto</SelectItem>
                <SelectItem value="ordered">Ordenado</SelectItem>
                <SelectItem value="sent_to_lab">Enviado al Lab</SelectItem>
                <SelectItem value="in_progress_lab">En Laboratorio</SelectItem>
                <SelectItem value="ready_at_lab">Listo en Lab</SelectItem>
                <SelectItem value="received_from_lab">Recibido</SelectItem>
                <SelectItem value="mounted">Montado</SelectItem>
                <SelectItem value="quality_check">Control Calidad</SelectItem>
                <SelectItem value="ready_for_pickup">Listo para Retiro</SelectItem>
                <SelectItem value="delivered">Entregado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
