"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import type { Branch, Driver, InternalOrder, Vehicle } from "../_components/types";

export function useInternalOrders() {
  const [orders, setOrders] = useState<InternalOrder[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingOrder, setEditingOrder] = useState<InternalOrder | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ type: "order"; id: string; orderNumber: string } | null>(null);
  const [orderForm, setOrderForm] = useState({
    origin_branch_id: "",
    destination_branch_id: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
    scheduled_pickup_date: "",
    estimated_delivery_date: "",
    notes: "",
    driver_id: "",
    vehicle_id: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [branchesRes, driversRes, vehiclesRes, ordersRes] = await Promise.all([
        fetch("/api/admin/branches"),
        fetch("/api/admin/drivers"),
        fetch("/api/admin/vehicles"),
        fetch("/api/admin/internal-orders"),
      ]);
      if (branchesRes.ok) {
        const d = await branchesRes.json();
        setBranches(d.branches || []);
      }
      if (driversRes.ok) {
        const d = await driversRes.json();
        setDrivers(d.drivers || []);
      }
      if (vehiclesRes.ok) {
        const d = await vehiclesRes.json();
        setVehicles(d.vehicles || []);
      }
      if (ordersRes.ok) {
        const d = await ordersRes.json();
        setOrders(d.orders || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateOrder = () => {
    setEditingOrder(null);
    setOrderForm({ origin_branch_id: "", destination_branch_id: "", priority: "medium", scheduled_pickup_date: "", estimated_delivery_date: "", notes: "", driver_id: "", vehicle_id: "" });
    setShowOrderDialog(true);
  };

  const handleEditOrder = (order: InternalOrder) => {
    setEditingOrder(order);
    setOrderForm({
      origin_branch_id: order.origin_branch_id,
      destination_branch_id: order.destination_branch_id,
      priority: order.priority,
      scheduled_pickup_date: order.scheduled_pickup_date || "",
      estimated_delivery_date: order.estimated_delivery_date || "",
      notes: order.notes || "",
      driver_id: order.driver_id || "",
      vehicle_id: order.vehicle_id || "",
    });
    setShowOrderDialog(true);
  };

  const handleDeleteOrder = (order: InternalOrder) => {
    setDeletingItem({ type: "order", id: order.id, orderNumber: order.order_number });
    setShowDeleteDialog(true);
  };

  const handleSaveOrder = async () => {
    try {
      const url = editingOrder ? `/api/admin/internal-orders/${editingOrder.id}` : "/api/admin/internal-orders";
      const method = editingOrder ? "PUT" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...orderForm, status: editingOrder ? editingOrder.status : "pending" }),
      });
      if (!response.ok) throw new Error("Error al guardar orden");
      toast.success(editingOrder ? "Orden actualizada" : "Orden creada");
      setShowOrderDialog(false);
      fetchData();
    } catch { toast.error("Error al guardar orden"); }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    try {
      const response = await fetch(`/api/admin/internal-orders/${deletingItem.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Error al eliminar orden");
      toast.success("Orden eliminada");
      setShowDeleteDialog(false);
      setDeletingItem(null);
      fetchData();
    } catch { toast.error("Error al eliminar orden"); }
  };

  return {
    orders, branches, drivers, vehicles, loading,
    showOrderDialog, setShowOrderDialog,
    showDeleteDialog, setShowDeleteDialog,
    editingOrder, deletingItem,
    orderForm, setOrderForm,
    handleCreateOrder, handleEditOrder, handleDeleteOrder,
    handleSaveOrder, handleConfirmDelete, fetchData,
  };
}
