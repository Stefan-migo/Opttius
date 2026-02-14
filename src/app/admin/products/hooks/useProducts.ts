"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBranchHeader } from "@/lib/utils/branch";
import { toast } from "sonner";

export interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  status: string;
  inventory_quantity: number; // Legacy field, deprecated
  total_inventory_quantity?: number; // Stock for current branch
  total_available_quantity?: number; // Available stock (quantity - reserved) for current branch
  total_reserved_quantity?: number; // Reserved stock for current branch
  category?: { name: string };
  categories?: { name: string };
  is_featured: boolean;
  featured?: boolean;
  title?: string;
  created_at: string;
  sku?: string;
  brand?: string;
  barcode?: string;
}

interface ProductsResponse {
  products: Product[];
  pagination?: {
    total: number;
    totalPages: number;
    currentPage: number;
  };
  total?: number;
}

interface FetchProductsParams {
  page: number;
  itemsPerPage: number;
  categoryFilter: string;
  statusFilter: string;
  searchTerm?: string;
  showLowStockOnly?: boolean;
  currentBranchId: string | null;
  isGlobalView: boolean;
  isSuperAdmin: boolean;
}

const fetchProducts = async ({
  page,
  itemsPerPage,
  categoryFilter,
  statusFilter,
  searchTerm,
  showLowStockOnly,
  currentBranchId,
  isGlobalView,
  isSuperAdmin,
}: FetchProductsParams): Promise<ProductsResponse> => {
  const offset = (page - 1) * itemsPerPage;

  const params = new URLSearchParams({
    limit: itemsPerPage.toString(),
    offset: offset.toString(),
  });

  if (statusFilter !== "all") {
    params.append("status", statusFilter);
  } else {
    params.append("include_archived", "true");
  }

  if (categoryFilter !== "all") {
    params.append("category", categoryFilter);
  }

  if (searchTerm && searchTerm.trim()) {
    params.append("search", searchTerm.trim());
  }

  if (showLowStockOnly) {
    params.append("low_stock_only", "true");
  }

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (currentBranchId) {
    headers["x-branch-id"] = currentBranchId;
  } else if (isGlobalView && isSuperAdmin) {
    headers["x-branch-id"] = "global";
  }

  const response = await fetch(`/api/admin/products?${params}`, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error: ${response.status} - ${errorText}`);
  }

  return response.json();
};

export function useProducts(params: FetchProductsParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [
      "products",
      params.page,
      params.itemsPerPage,
      params.categoryFilter,
      params.statusFilter,
      params.searchTerm,
      params.showLowStockOnly,
      params.currentBranchId,
      params.isGlobalView,
    ],
    queryFn: () => fetchProducts(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(params.currentBranchId),
      };

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });
      toast.success("Producto creado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al crear producto");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(params.currentBranchId),
      };

      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });
      toast.success("Producto actualizado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al actualizar producto");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const headers: HeadersInit = {
        ...getBranchHeader(params.currentBranchId),
      };

      const response = await fetch(`/api/admin/products/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete product");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });
      toast.success("Producto eliminado exitosamente");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Error al eliminar producto");
    },
  });

  return {
    products: query.data?.products || [],
    pagination: query.data?.pagination,
    total: query.data?.pagination?.total || query.data?.total || 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createProduct: createMutation.mutateAsync,
    updateProduct: updateMutation.mutateAsync,
    deleteProduct: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
