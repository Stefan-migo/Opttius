"use client";

import { Package } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

function FrameField({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return <div><p className="text-xs text-admin-text-tertiary">{label}</p><p className="font-medium">{value}</p></div>;
}

export function FrameDetailsCard({
  frame_name, frame_brand, frame_model, frame_color, frame_size, frame_sku, frame_price,
  customer_own_frame, title = "Detalles del Marco",
}: {
  frame_name?: string | null; frame_brand?: string | null; frame_model?: string | null;
  frame_color?: string | null; frame_size?: string | null; frame_sku?: string | null;
  frame_price?: number | null; customer_own_frame?: boolean | null;
  title?: string;
}) {
  if (customer_own_frame) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Package className="h-5 w-5 mr-2" />{title}</CardTitle></CardHeader>
        <CardContent>
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800 font-medium">Cliente trae marco (recambio de cristales)</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center"><Package className="h-5 w-5 mr-2" />{title}</CardTitle></CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FrameField label="Nombre" value={frame_name} />
          <FrameField label="Marca" value={frame_brand} />
          <FrameField label="Modelo" value={frame_model} />
          <FrameField label="Color" value={frame_color} />
          <FrameField label="Tamaño" value={frame_size} />
          <FrameField label="SKU" value={frame_sku} />
          {frame_price !== undefined && frame_price !== null && (
            <div><p className="text-xs text-admin-text-tertiary">Precio</p><p className="font-semibold text-admin-success">{formatCurrency(frame_price)}</p></div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
