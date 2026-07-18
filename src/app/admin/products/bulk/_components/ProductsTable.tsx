"use client";

import { AlertTriangle, Edit, Eye, Package } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ProductsTableProps {
  products: Product[];
  selectedProducts: string[];
  onSelectProduct: (productId: string) => void;
  onSelectAll: () => void;
}

function getStatusBadge(status: string) {
  const config: Record<
    string,
    {
      variant: "default" | "secondary" | "outline" | "destructive";
      label: string;
    }
  > = {
    active: { variant: "default", label: "Activo" },
    draft: { variant: "secondary", label: "Borrador" },
    archived: { variant: "outline", label: "Archivado" },
  };
  const statusConfig = config[status] || config["draft"];
  return <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>;
}

export function ProductsTable({
  products,
  selectedProducts,
  onSelectProduct,
  onSelectAll,
}: ProductsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Productos ({products.length})
          </div>
          <div className="flex items-center space-x-2">
            <input
              checked={
                selectedProducts.length === products.length &&
                products.length > 0
              }
              className="rounded border-gray-300"
              type="checkbox"
              onChange={onSelectAll}
            />
            <span className="text-sm text-tierra-media">
              Seleccionar todos
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-tierra-media mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-azul-profundo mb-2">
              No se encontraron productos
            </h3>
            <p className="text-tierra-media">
              Ajusta los filtros o agrega nuevos productos.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      checked={
                        selectedProducts.length === products.length &&
                        products.length > 0
                      }
                      className="rounded border-gray-300"
                      type="checkbox"
                      onChange={onSelectAll}
                    />
                  </TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <input
                        checked={selectedProducts.includes(product.id)}
                        className="rounded border-gray-300"
                        type="checkbox"
                        onChange={() => onSelectProduct(product.id)}
                      />
                    </TableCell>

                    <TableCell>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-tierra-media">
                          {product.slug}
                        </div>
                        {product.is_featured && (
                          <Badge className="text-xs" variant="outline">
                            Destacado
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {product.category ? (
                        <Badge variant="outline">
                          {product.category.name}
                        </Badge>
                      ) : (
                        <span className="text-tierra-media">
                          Sin categoría
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="font-medium">
                      {formatCurrency(product.price)}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span>{product.inventory_quantity}</span>
                        {(product.inventory_quantity ?? 0) <= 5 && (
                          <AlertTriangle className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </TableCell>

                    <TableCell>
                      {getStatusBadge(product.status ?? "")}
                    </TableCell>

                    <TableCell className="text-sm text-tierra-media">
                      {formatDate(product.created_at, { locale: "es-AR" })}
                    </TableCell>

                    <TableCell>
                      <div className="flex space-x-2">
                        <Link href={`/admin/products/${product.id}`}>
                          <Button size="sm" variant="outline">
                            <Eye className="h-3 w-3" />
                          </Button>
                        </Link>
                        <Link href={`/admin/products/edit/${product.id}`}>
                          <Button size="sm" variant="outline">
                            <Edit className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
