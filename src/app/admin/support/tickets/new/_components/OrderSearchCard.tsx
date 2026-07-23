"use client";

import { Package, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { extractDataFromResponse } from "@/lib/api/response-helpers";
import { appLogger } from '@/lib/logger';

import type { Order } from "./types";

interface OrderSearchCardProps {
  onSelect: (order: Order) => void;
}

export function OrderSearchCard({ onSelect }: OrderSearchCardProps) {
  const [orderSearch, setOrderSearch] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (orderSearch.length >= 3) {
      searchOrders();
    } else {
      setOrders([]);
    }
  }, [orderSearch]);

  const searchOrders = async () => {
    try {
      setSearching(true);
      const response = await fetch(
        `/api/admin/orders?search=${encodeURIComponent(orderSearch)}&limit=10`,
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(extractDataFromResponse(data));
      }
    } catch (err) {
      appLogger.error("Error searching orders:", err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (order: Order) => {
    setSelectedOrder(order);
    onSelect(order);
    setOrderSearch(order.order_number);
    setOrders([]);
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);

  return (
    <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="h-5 w-5 mr-2" />
          Pedido Relacionado (Opcional)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-admin-text-tertiary mb-2">
            Buscar Pedido
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-admin-text-tertiary h-4 w-4" />
            <Input
              className="pl-10"
              placeholder="Buscar por número de pedido..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
          {searching && (
            <p className="text-sm text-admin-text-tertiary mt-2">
              Buscando pedidos...
            </p>
          )}
          {orders.length > 0 && (
            <div className="mt-2 border rounded-md max-h-48 overflow-y-auto">
              {orders.map((order) => (
                <button
                  className="w-full text-left p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  key={order.id}
                  type="button"
                  onClick={() => handleSelect(order)}
                >
                  <div className="font-medium">#{order.order_number}</div>
                  <div className="text-sm text-admin-text-tertiary">
                    {formatPrice(order.total_amount)} • {order.status}
                  </div>
                  <div className="text-xs text-admin-text-tertiary">
                    {new Date(order.created_at).toLocaleDateString("es-AR")}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedOrder && (
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <h4 className="font-medium text-green-900 mb-2">
              Pedido Seleccionado:
            </h4>
            <div className="space-y-1 text-sm">
              <div>
                <strong>#{selectedOrder.order_number}</strong>
              </div>
              <div>Total: {formatPrice(selectedOrder.total_amount)}</div>
              <div>Estado: {selectedOrder.status}</div>
              <div>
                Fecha:{" "}
                {new Date(selectedOrder.created_at).toLocaleDateString("es-AR")}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
