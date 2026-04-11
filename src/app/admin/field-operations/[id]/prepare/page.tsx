"use client";

import { ArrowLeft, Package, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  product_type: string;
}

interface Operation {
  id: string;
  name: string;
  branch_id: string;
  status: string;
}

export default function PrepareFieldOperationPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { currentBranchId } = useBranch();
  const [operation, setOperation] = useState<Operation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productStocks, setProductStocks] = useState<Record<string, number>>(
    {},
  );
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (id) {
      fetchOperation();
    }
  }, [id]);

  useEffect(() => {
    if (operation?.branch_id) {
      fetchProductsWithStock();
    }
  }, [operation?.branch_id]);

  const fetchOperation = async () => {
    try {
      const headers = getBranchHeader(currentBranchId);
      const res = await fetch(`/api/admin/field-operations/${id}`, { headers });
      if (!res.ok) throw new Error("Operativo no encontrado");
      const data = await res.json();
      setOperation(data?.data?.fieldOperation || null);
    } catch {
      toast.error("Error al cargar operativo");
      router.push("/admin/field-operations");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsWithStock = async () => {
    if (!operation?.branch_id) return;
    try {
      const headers = getBranchHeader(operation.branch_id);
      const res = await fetch(
        `/api/admin/products?limit=200&branch_id=${operation.branch_id}&in_stock=true`,
        { headers },
      );
      if (!res.ok) return;
      const data = await res.json();
      const items = data?.data ?? data?.products ?? [];
      const frames = items.filter(
        (p: Product & { product_type?: string }) =>
          p.product_type === "frame" || !p.product_type,
      );
      setProducts(frames);

      const stocks: Record<string, number> = {};
      for (const p of frames) {
        const qty =
          (p as { total_available_quantity?: number })
            .total_available_quantity ??
          (p as { total_inventory_quantity?: number })
            .total_inventory_quantity ??
          0;
        if (qty > 0) stocks[p.id] = qty;
      }
      setProductStocks(stocks);
      setQuantities({});
    } catch (e) {
      console.error("Error fetching products:", e);
    }
  };

  const setQuantity = (productId: string, value: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, value),
    }));
  };

  const handleTransferAll = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }));

    if (items.length === 0) {
      toast.error("Indica las cantidades a transferir");
      return;
    }

    for (const { product_id, quantity } of items) {
      const available = productStocks[product_id] ?? 0;
      if (quantity > available) {
        const p = products.find((x) => x.id === product_id);
        toast.error(
          `Stock insuficiente para ${p?.name ?? product_id}. Disponible: ${available}`,
        );
        return;
      }
    }

    setTransferring(true);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };

      const res = await fetch(
        `/api/admin/field-operations/${id}/transfer-stock`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({ items }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Error al transferir");
      }

      const successCount = data?.data?.successCount ?? items.length;
      toast.success(`${successCount} producto(s) transferido(s) correctamente`);
      setQuantities({});
      fetchOperation();
      fetchProductsWithStock();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al transferir stock",
      );
    } finally {
      setTransferring(false);
    }
  };

  if (loading || !operation) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-admin-text-tertiary" />
      </div>
    );
  }

  const productsWithStock = products.filter(
    (p) => (productStocks[p.id] ?? 0) > 0,
  );
  const hasItemsToTransfer = Object.values(quantities).some((q) => q > 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Link
          className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-admin-text-primary min-h-[44px] items-center"
          href={`/admin/field-operations/${id}`}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate max-w-[calc(100vw-8rem)]">
            Volver a {operation.name}
          </span>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-admin-text-primary tracking-tight">
            Transferir stock a bodega móvil
          </h1>
          <p className="text-sm text-admin-text-tertiary mt-1">
            Indica las cantidades a trasladar desde la sucursal al operativo
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-admin-border-primary/30 bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-admin-border-primary/20">
          <h3 className="flex items-center gap-2 text-admin-text-primary font-semibold">
            <Package className="h-5 w-5 shrink-0" />
            Productos con stock disponible
          </h3>
        </div>
        <div className="p-4 sm:p-6 pt-0">
          {productsWithStock.length === 0 ? (
            <p className="py-6 text-admin-text-tertiary text-sm">
              No hay productos con stock en la sucursal.{" "}
              <Link
                className="text-admin-accent-primary hover:underline"
                href={`/admin/field-operations/${id}`}
              >
                Volver al operativo
              </Link>
            </p>
          ) : (
            <form onSubmit={handleTransferAll}>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        Producto
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold">
                        SKU
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold text-right">
                        Disponible
                      </TableHead>
                      <TableHead className="text-admin-text-tertiary font-semibold text-right w-32">
                        Cantidad
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsWithStock.map((p) => (
                      <TableRow className="hover:bg-[#AE000025]" key={p.id}>
                        <TableCell className="font-medium text-admin-text-primary">
                          {p.name}
                        </TableCell>
                        <TableCell className="text-admin-text-tertiary">
                          {p.sku || "—"}
                        </TableCell>
                        <TableCell className="text-right text-admin-text-primary">
                          {productStocks[p.id] ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            className="h-11 sm:h-10 min-h-[44px] w-24 text-right"
                            max={productStocks[p.id] ?? 0}
                            min={0}
                            type="number"
                            value={quantities[p.id] ?? 0}
                            onChange={(e) =>
                              setQuantity(p.id, parseInt(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end pt-4 sm:pt-6">
                <Button
                  className="min-h-[44px]"
                  disabled={transferring || !hasItemsToTransfer}
                  type="submit"
                >
                  {transferring ? "Transfiriendo..." : "Transferir todo"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
