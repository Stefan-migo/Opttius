"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { toLimitPayload } from "./tierHelpers";
import type { Tier, TierEditData } from "./types";

export function useTiersPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<TierEditData>({
    price_monthly: 0,
    max_branches: 0,
    max_users: 0,
    max_customers: 0,
    max_products: 0,
    features: {},
  });

  const fetchTiers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/saas-management/tiers");
      if (!response.ok) throw new Error("Error al cargar tiers");
      const data = await response.json();
      setTiers(data.tiers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar tiers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTiers();
  }, [fetchTiers]);

  const handleEdit = useCallback((tier: Tier) => {
    setSelectedTier(tier);
    setEditData({
      price_monthly: tier.price_monthly,
      max_branches: tier.max_branches || 0,
      max_users: tier.max_users || 0,
      max_customers: tier.max_customers || 0,
      max_products: tier.max_products || 0,
      features: tier.features || {},
    });
    setShowEditDialog(true);
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!selectedTier) return;
    setEditing(true);
    try {
      const payload = {
        name: selectedTier.name,
        price_monthly: editData.price_monthly,
        max_branches: toLimitPayload(editData.max_branches),
        max_users: toLimitPayload(editData.max_users),
        max_customers: toLimitPayload(editData.max_customers),
        max_products: toLimitPayload(editData.max_products),
        features: editData.features,
      };
      const response = await fetch("/api/admin/saas-management/tiers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Error al actualizar tier");
      toast.success("Tier actualizado exitosamente");
      setShowEditDialog(false);
      setSelectedTier(null);
      fetchTiers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setEditing(false);
    }
  }, [selectedTier, editData, fetchTiers]);

  return {
    tiers,
    loading,
    error,
    showEditDialog,
    selectedTier,
    editing,
    editData,
    setShowEditDialog,
    setEditData,
    handleEdit,
    handleUpdate,
  };
}
