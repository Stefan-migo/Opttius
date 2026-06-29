"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ui/ImageUpload";
import { Label } from "@/components/ui/label";

interface ProductImagesSectionProps {
  featuredImage: string;
  onFieldChange: (field: string, value: unknown) => void;
}

export function AddProductImagesSection({
  featuredImage,
  onFieldChange,
}: ProductImagesSectionProps) {
  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>Imagen del Producto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="featured_image">Imagen del Producto</Label>
          <ImageUpload
            placeholder="Seleccionar imagen del producto"
            value={featuredImage}
            onChange={(url) => onFieldChange("featured_image", url)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
