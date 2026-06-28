"use client";

import { Calendar, DollarSign, ShoppingBag, TrendingUp } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { Customer } from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/utils";

interface CustomerStatsCardsProps {
  customer: Customer;
}

export function CustomerStatsCards({ customer }: CustomerStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-admin-success shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Total Gastado
              </p>
              <p className="text-lg sm:text-2xl font-bold text-admin-success truncate">
                {formatCurrency(customer.analytics?.totalSpent || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <ShoppingBag className="h-6 w-6 sm:h-8 sm:w-8 text-admin-text-primary shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Total Pedidos
              </p>
              <p className="text-lg sm:text-2xl font-bold text-admin-text-primary">
                {customer.analytics?.orderCount || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-admin-accent-primary shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Ticket Promedio
              </p>
              <p className="text-lg sm:text-2xl font-bold text-admin-accent-primary truncate">
                {formatCurrency(customer.analytics?.avgOrderValue || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 shrink-0" />
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Cliente Desde
              </p>
              <p className="text-base sm:text-lg font-bold text-red-500">
                {formatDate(customer.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
