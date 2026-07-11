"use client";

import { AlertTriangle, BarChart3, Package } from "lucide-react";
import dynamic from "next/dynamic";

const EnhancedBarChart = dynamic(
  () =>
    import("@/components/admin/charts/EnhancedBarChart").then(
      (m) => m.EnhancedBarChart,
    ),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  },
);
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { formatPrice } from "./analyticsUtils";

interface AnalyticsProductsTabProps {
  products: {
    topProducts: Array<{
      id: string;
      name: string;
      category: string;
      revenue: number;
      quantity: number;
      orders: number;
    }>;
    lowStock: number;
    outOfStock: number;
  };
}

export function AnalyticsProductsTab({ products }: AnalyticsProductsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
      {/* Top Products */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
            Productos Más Vendidos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {products.topProducts.length > 0 ? (
            <EnhancedBarChart
              color="#C5A059"
              data={products.topProducts.slice(0, 8).map((prod) => ({
                label: prod.name,
                value: prod.revenue,
              }))}
              formatValue={formatPrice}
              height={Math.min(
                320,
                Math.max(
                  220,
                  products.topProducts.slice(0, 8).length * 40,
                ),
              )}
              horizontal={true}
              title="Por Ingresos"
            />
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay productos vendidos en este período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Product Performance Table */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Rendimiento Detallado
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {products.topProducts.length > 0 ? (
            <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 min-w-0 [scrollbar-width:thin]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Ingresos</TableHead>
                    <TableHead>Cantidad</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.topProducts.slice(0, 8).map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div>
                          <div
                            className="font-medium truncate max-w-[150px]"
                            title={product.name}
                          >
                            {product.name}
                          </div>
                          <div className="text-sm text-admin-text-tertiary">
                            {product.category}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-admin-success">
                        {formatPrice(product.revenue)}
                      </TableCell>
                      <TableCell>{product.quantity} unidades</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-admin-text-tertiary">
              No hay productos vendidos en este período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Alerts */}
      <Card
        className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
        rounded="none"
      >
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex items-center text-base sm:text-lg">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Alertas de Inventario
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 sm:p-6 pt-0">
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="text-center p-3 sm:p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-lg sm:text-2xl font-bold text-orange-600">
                {products.lowStock}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Bajo Stock
              </p>
            </div>
            <div className="text-center p-3 sm:p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="text-lg sm:text-2xl font-bold text-red-600">
                {products.outOfStock}
              </p>
              <p className="text-xs sm:text-sm text-admin-text-tertiary">
                Sin Stock
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
