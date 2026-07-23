"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface SubscriptionsFilterBarProps {
  organizationFilter: string;
  statusFilter: string;
  tierFilter: string;
  organizations: Organization[];
  onOrganizationFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onTierFilterChange: (value: string) => void;
}

export function SubscriptionsFilterBar({
  organizationFilter,
  statusFilter,
  tierFilter,
  organizations,
  onOrganizationFilterChange,
  onStatusFilterChange,
  onTierFilterChange,
}: SubscriptionsFilterBarProps) {
  return (
    <Card className="admin-card">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row gap-4">
          <Select
            value={organizationFilter}
            onValueChange={onOrganizationFilterChange}
          >
            <SelectTrigger className="rounded-xl w-[200px]">
              <SelectValue placeholder="Filtrar por organización" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las organizaciones</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={statusFilter}
            onValueChange={onStatusFilterChange}
          >
            <SelectTrigger className="rounded-xl w-[180px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="trialing">Trial</SelectItem>
              <SelectItem value="past_due">Vencida</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
              <SelectItem value="incomplete">Incompleta</SelectItem>
            </SelectContent>
          </Select>

          <Select value={tierFilter} onValueChange={onTierFilterChange}>
            <SelectTrigger className="rounded-xl w-[180px]">
              <SelectValue placeholder="Filtrar por tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tiers</SelectItem>
              <SelectItem value="basic">Básico</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
