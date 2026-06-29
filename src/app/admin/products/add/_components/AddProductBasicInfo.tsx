"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AddProductBasicInfoProps {
  productType: string;
  categoryId: string;
  status: string;
  name: string;
  slug: string;
  shortDescription: string;
  brand: string;
  manufacturer: string;
  modelNumber: string;
  sku: string;
  barcode: string;
  categories: readonly unknown[];
  productTypes: readonly unknown[];
  onFieldChange: (field: string, value: unknown) => void;
}

export function AddProductBasicInfo({
  productType,
  categoryId,
  status,
  name,
  slug,
  shortDescription,
  brand,
  manufacturer,
  modelNumber,
  sku,
  barcode,
  categories,
  productTypes,
  onFieldChange,
}: AddProductBasicInfoProps) {
  return (
    <>
      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Tipo de Producto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <div>
              <Label htmlFor="product_type">Tipo de Producto *</Label>
              <Select
                value={productType}
                onValueChange={(value) =>
                  onFieldChange("product_type", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {(productTypes as any[]).map((type: any) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="category">Categoría General</Label>
              <Select
                value={categoryId}
                onValueChange={(value) =>
                  onFieldChange("category_id", value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {(categories as any[]).map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <div>
              <Label htmlFor="status">Estado</Label>
              <Select
                value={status}
                onValueChange={(value) => onFieldChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado del producto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <div>
              <Label htmlFor="name">Nombre del Producto *</Label>
              <Input
                required
                className="border-black/20"
                id="name"
                placeholder="Ej: Ray-Ban RB2140 Wayfarer"
                value={name}
                onChange={(e) => onFieldChange("name", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="slug">URL (slug)</Label>
              <Input
                className="border-black/20"
                id="slug"
                placeholder="Se genera automáticamente"
                value={slug}
                onChange={(e) => onFieldChange("slug", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="short_description">Descripción Corta</Label>
            <RichTextEditor
              placeholder="Descripción del producto"
              rows={3}
              value={shortDescription}
              onChange={(value) =>
                onFieldChange("short_description", value)
              }
            />
          </div>
        </CardContent>
      </Card>

      {productType !== "service" && (
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
          <CardHeader>
            <CardTitle>Marca y Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 min-w-0">
              <div>
                <Label htmlFor="brand">Marca</Label>
                <Input
                  className="border-black/20"
                  id="brand"
                  placeholder="Ej: Ray-Ban"
                  value={brand}
                  onChange={(e) => onFieldChange("brand", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manufacturer">Fabricante</Label>
                <Input
                  className="border-black/20"
                  id="manufacturer"
                  placeholder="Ej: Luxottica"
                  value={manufacturer}
                  onChange={(e) => onFieldChange("manufacturer", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="model_number">Número de Modelo</Label>
                <Input
                  className="border-black/20"
                  id="model_number"
                  placeholder="Ej: RB2140"
                  value={modelNumber}
                  onChange={(e) => onFieldChange("model_number", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)] min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>Códigos de Identificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-w-0">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input
                className="border-black/20"
                id="sku"
                placeholder="Código SKU"
                value={sku}
                onChange={(e) => onFieldChange("sku", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="barcode">Código de Barras</Label>
              <Input
                className="border-black/20"
                id="barcode"
                placeholder="Código de barras"
                value={barcode}
                onChange={(e) => onFieldChange("barcode", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
