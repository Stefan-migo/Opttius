import { useState, useCallback } from "react";
import { posService } from "@/lib/api/services";

export function usePOSPendingBalance(branchId: string | null) {
  const [orders, setOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(
    async (searchTerm?: string) => {
      setLoading(true);
      try {
        const result = await posService.getPendingBalanceOrders(
          searchTerm,
          branchId || undefined,
          500,
        );
        setAllOrders(result || []);
        setOrders(result || []);
      } catch (error: any) {
        console.error("Error fetching pending balance orders:", error);
        setOrders([]);
        setAllOrders([]);
      } finally {
        setLoading(false);
      }
    },
    [branchId],
  );

  const filterBySearch = useCallback(
    (searchTerm: string, ordersToFilter: any[] = allOrders) => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) {
        setOrders(ordersToFilter);
        return;
      }
      setOrders(
        ordersToFilter.filter((o) => {
          const name = (o.customer_name || "").toLowerCase();
          const orderNum = (o.order_number || "").toLowerCase();
          const rut = (o.customer_rut || "").toLowerCase();
          return (
            name.includes(term) || orderNum.includes(term) || rut.includes(term)
          );
        }),
      );
    },
    [allOrders],
  );

  return {
    orders,
    allOrders,
    loading,
    fetchOrders,
    filterBySearch,
    setOrders,
  };
}
