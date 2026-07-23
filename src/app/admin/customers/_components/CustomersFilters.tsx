"use client";

import { Search } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CustomersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent) => void;
  agreementFilter: string;
  onAgreementFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  agreements: { id: string; name: string }[];
}

export function CustomersFilters({
  searchTerm,
  onSearchChange,
  onSearchKeyDown,
  agreementFilter,
  onAgreementFilterChange,
  statusFilter,
  onStatusFilterChange,
  agreements,
}: CustomersFiltersProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4" />
              <Input
                className="pl-10"
                data-tour="customers-search"
                placeholder="Buscar por nombre, email, teléfono o RUT..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
              />
            </div>
          </div>

          <Select
            value={agreementFilter}
            onValueChange={onAgreementFilterChange}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Convenio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los convenios</SelectItem>
              {agreements.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
