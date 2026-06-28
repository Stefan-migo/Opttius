"use client";

import {
  Activity,
  Heart,
  Package,
  TrendingUp,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Customer } from "@/lib/api/services";
import { formatCurrency } from "@/lib/utils";

interface CustomerAnalyticsTabProps {
  customer: Customer;
}

function getOrderStatusBadge(status: string) {
  type BadgeVariant =
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "healty"
    | null
    | undefined;
  const config: Record<string, { variant: BadgeVariant; label: string }> = {
    pending: { variant: "outline", label: "Pendiente" },
    processing: { variant: "secondary", label: "Procesando" },
    shipped: { variant: "default", label: "Enviado" },
    delivered: { variant: "default", label: "Entregado" },
    cancelled: { variant: "destructive", label: "Cancelado" },
    refunded: { variant: "destructive", label: "Reembolsado" },
  };

  const statusConfig = config[status] || {
    variant: "outline",
    label: status,
  };
  return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
}

export function CustomerAnalyticsTab({
  customer,
}: CustomerAnalyticsTabProps) {
  const hasOrders = (customer.analytics?.orderCount ?? 0) > 0;

  if (!hasOrders) {
    return (
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
        <CardContent className="text-center py-16">
          <TrendingUp className="h-16 w-16 text-admin-text-tertiary mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-admin-text-primary mb-2">
            Sin Datos de Analíticas
          </h3>
          <p className="text-admin-text-tertiary mb-6 max-w-md mx-auto">
            Este cliente aún no ha realizado ningún pedido. Las analíticas
            estarán disponibles una vez que realice su primera compra a través
            del POS.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Favorite Products */}
        {customer.analytics?.favoriteProducts &&
          customer.analytics.favoriteProducts.length > 0 && (
            <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center text-admin-text-primary">
                  <Heart className="h-5 w-5 mr-2" />
                  Productos Favoritos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 pt-0">
                <div className="space-y-3">
                  {customer.analytics.favoriteProducts
                    .slice(0, 5)
                    .map((item, index) => (
                      <div
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg hover:bg-[#AE000010] transition-colors"
                        key={index}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          {item.product?.featured_image ? (
                            <img
                              alt={item.product.name || "Product"}
                              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border border-admin-border-primary/20 shrink-0"
                              src={item.product.featured_image}
                            />
                          ) : (
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-admin-bg-primary rounded border border-admin-border-primary/20 flex items-center justify-center shrink-0">
                              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-admin-text-tertiary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-admin-text-primary truncate">
                              {item.product?.name || "Producto"}
                            </p>
                            <p className="text-xs sm:text-sm text-admin-text-tertiary">
                              {item.quantity}{" "}
                              {item.quantity === 1
                                ? "unidad"
                                : "unidades"}{" "}
                              compradas
                            </p>
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="font-medium text-admin-success">
                            {formatCurrency(item.totalSpent)}
                          </p>
                          <p className="text-xs text-admin-text-tertiary">
                            {formatCurrency(
                              item.totalSpent / item.quantity,
                            )}{" "}
                            por unidad
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

        {/* Order Status Distribution */}
        {customer.analytics?.orderStatusCounts && (
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center text-admin-text-primary">
                <Activity className="h-5 w-5 mr-2" />
                Distribución de Estados
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                {Object.entries(
                  customer.analytics.orderStatusCounts,
                ).map(([status, count]) => (
                  <div
                    className="flex items-center justify-between"
                    key={status}
                  >
                    <div className="flex items-center space-x-2">
                      {getOrderStatusBadge(status)}
                    </div>
                    <span className="font-medium">
                      {count} pedidos
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Monthly Spending Chart */}
      {customer.analytics?.monthlySpending &&
        customer.analytics.monthlySpending.length > 0 && (
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Tendencia de Gastos (Últimos 12 meses)
                </div>
                <div className="text-sm font-normal text-admin-text-tertiary">
                  Total: {formatCurrency(customer.analytics.totalSpent)}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {customer.analytics.monthlySpending.map((month, index) => (
                  <div
                    className={`text-center p-3 border rounded-lg transition-all hover:shadow-md ${
                      month.amount > 0
                        ? "bg-admin-success/10 border-admin-success/30"
                        : "bg-gray-50"
                    }`}
                    key={index}
                  >
                    <p className="text-xs font-medium text-admin-text-tertiary mb-1">
                      {month.month}
                    </p>
                    <p className="font-bold text-sm text-admin-text-primary">
                      {formatCurrency(month.amount)}
                    </p>
                    <p className="text-xs text-admin-text-tertiary mt-1">
                      {month.orderCount}{" "}
                      {month.orderCount === 1 ? "pedido" : "pedidos"}
                    </p>
                  </div>
                ))}
              </div>

              {/* Summary Stats */}
              <div className="mt-6 pt-4 border-t grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Promedio Mensual
                  </p>
                  <p className="font-bold text-lg text-admin-text-primary">
                    {formatCurrency(customer.analytics.totalSpent / 12)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Mejor Mes
                  </p>
                  <p className="font-bold text-lg text-admin-success">
                    {formatCurrency(
                      Math.max(
                        ...customer.analytics.monthlySpending.map(
                          (m) => m.amount,
                        ),
                      ),
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-admin-text-tertiary">
                    Meses Activos
                  </p>
                  <p className="font-bold text-lg text-admin-accent-primary">
                    {
                      customer.analytics.monthlySpending.filter(
                        (m) => m.amount > 0,
                      ).length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
    </>
  );
}
