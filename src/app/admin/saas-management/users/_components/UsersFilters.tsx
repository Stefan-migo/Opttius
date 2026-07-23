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

interface UsersFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  organizationFilter: string;
  onOrganizationFilterChange: (value: string) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  organizations: Array<{ id: string; name: string; slug: string }>;
}

export function UsersFilters({
  searchTerm,
  onSearchChange,
  organizationFilter,
  onOrganizationFilterChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  organizations,
}: UsersFiltersProps) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
                placeholder="Buscar por email o nombre..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <Select
            value={organizationFilter}
            onValueChange={onOrganizationFilterChange}
          >
            <SelectTrigger className="rounded-xl w-[200px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Filtrar por organización" />
            </SelectTrigger>
            <SelectContent className="bg-[#0D1117] border-white/10">
              <SelectItem
                className="text-white focus:bg-white/10"
                value="all"
              >
                Todas las organizaciones
              </SelectItem>
              {organizations.map((org) => (
                <SelectItem
                  className="text-white focus:bg-white/10"
                  key={org.id}
                  value={org.id}
                >
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={onRoleFilterChange}>
            <SelectTrigger className="rounded-xl w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent className="bg-[#0D1117] border-white/10">
              <SelectItem
                className="text-white focus:bg-white/10"
                value="all"
              >
                Todos los roles
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="root"
              >
                Root
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="dev"
              >
                Dev
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="super_admin"
              >
                Super Admin
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="admin"
              >
                Admin
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="vendedor"
              >
                Vendedor
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="employee"
              >
                Empleado
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="rounded-xl w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent className="bg-[#0D1117] border-white/10">
              <SelectItem
                className="text-white focus:bg-white/10"
                value="all"
              >
                Todos los estados
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="active"
              >
                Activo
              </SelectItem>
              <SelectItem
                className="text-white focus:bg-white/10"
                value="inactive"
              >
                Inactivo
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
