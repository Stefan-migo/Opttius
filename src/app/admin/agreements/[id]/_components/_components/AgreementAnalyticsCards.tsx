"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

interface Analytics {
  total_orders: number;
  unique_customers?: number;
  total_sales: number;
  collection_efficiency: number;
}

export function AgreementAnalyticsCards({
  analytics,
}: {
  analytics: Analytics | null;
}) {
  if (!analytics) return null;
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-admin-text-tertiary">
            Órdenes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-admin-text-primary">
            {analytics.total_orders}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-admin-text-tertiary">
            Clientes únicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-admin-text-primary">
            {analytics.unique_customers ?? "-"}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-admin-text-tertiary">
            Ventas totales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-admin-success">
            {formatCurrency(analytics.total_sales)}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-admin-text-tertiary">
            Eficiencia cobranza
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-admin-accent-primary">
            {analytics.collection_efficiency}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
