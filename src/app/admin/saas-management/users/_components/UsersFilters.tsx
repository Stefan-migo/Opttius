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
                value="all"
                className="text-white focus:bg-white/10"
              >
                Todas las organizaciones
              </SelectItem>
              {organizations.map((org) => (
                <SelectItem
                  key={org.id}
                  value={org.id}
                  className="text-white focus:bg-white/10"
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
                value="all"
                className="text-white focus:bg-white/10"
              >
                Todos los roles
              </SelectItem>
              <SelectItem
                value="root"
                className="text-white focus:bg-white/10"
              >
                Root
              </SelectItem>
              <SelectItem
                value="dev"
                className="text-white focus:bg-white/10"
              >
                Dev
              </SelectItem>
              <SelectItem
                value="super_admin"
                className="text-white focus:bg-white/10"
              >
                Super Admin
              </SelectItem>
              <SelectItem
                value="admin"
                className="text-white focus:bg-white/10"
              >
                Admin
              </SelectItem>
              <SelectItem
                value="vendedor"
                className="text-white focus:bg-white/10"
              >
                Vendedor
              </SelectItem>
              <SelectItem
                value="employee"
                className="text-white focus:bg-white/10"
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
                value="all"
                className="text-white focus:bg-white/10"
              >
                Todos los estados
              </SelectItem>
              <SelectItem
                value="active"
                className="text-white focus:bg-white/10"
              >
                Activo
              </SelectItem>
              <SelectItem
                value="inactive"
                className="text-white focus:bg-white/10"
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
