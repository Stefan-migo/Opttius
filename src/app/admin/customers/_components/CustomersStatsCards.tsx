"use client";

import { ArrowUpRight, CheckCircle, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface CustomerStats {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
}

interface CustomersStatsCardsProps {
  stats: CustomerStats;
  statsLabel: string;
}

export function CustomersStatsCards({
  stats,
  statsLabel,
}: CustomersStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6">
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Users className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-primary shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Total Clientes
              </p>
              <p className="text-lg sm:text-2xl font-bold text-admin-text-primary">
                {stats.totalCustomers}
              </p>
              <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 truncate">
                {statsLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-admin-success shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Clientes Activos
              </p>
              <p className="text-lg sm:text-2xl font-bold text-admin-success">
                {stats.activeCustomers || stats.totalCustomers}
              </p>
              <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 truncate">
                {statsLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] col-span-2 sm:col-span-1">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <ArrowUpRight className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-primary shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Nuevos Este Mes
              </p>
              <p className="text-lg sm:text-2xl font-bold text-admin-text-primary">
                {stats.newCustomersThisMonth}
              </p>
              <p className="text-[10px] sm:text-xs text-admin-text-tertiary mt-1 truncate">
                {statsLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
