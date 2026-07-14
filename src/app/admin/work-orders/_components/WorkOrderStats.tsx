import { CheckCircle, Factory, Package, Truck } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

interface WorkOrderStatsProps {
  totalWorkOrders: number;
  inLabCount: number;
  readyForPickupCount: number;
  deliveredCount: number;
}

export function WorkOrderStats({
  totalWorkOrders,
  inLabCount,
  readyForPickupCount,
  deliveredCount,
}: WorkOrderStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="bg-admin-bg-tertiary">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-admin-text-tertiary">
                Total Trabajos
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-epoch-primary">
                {totalWorkOrders}
              </p>
            </div>
            <Package className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-epoch-primary shrink-0" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-admin-bg-tertiary">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-admin-text-tertiary">
                En Laboratorio
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-orange-600">
                {inLabCount}
              </p>
            </div>
            <Factory className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-orange-600 shrink-0" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-admin-bg-tertiary">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-admin-text-tertiary">
                Listos para Retiro
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-green-600">
                {readyForPickupCount}
              </p>
            </div>
            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-green-600 shrink-0" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-admin-bg-tertiary">
        <CardContent className="p-2 sm:p-3 md:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs md:text-sm text-admin-text-tertiary">
                Entregados
              </p>
              <p className="text-lg sm:text-xl md:text-2xl font-bold text-admin-success">
                {deliveredCount}
              </p>
            </div>
            <Truck className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8 text-admin-success shrink-0" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
