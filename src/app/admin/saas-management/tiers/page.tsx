"use client";

import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Crown,
  DollarSign,
  Edit,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TIER_DISPLAY_NAMES,
  TIER_FEATURE_LABELS,
} from "@/lib/saas/tier-constants";

interface Tier {
  id: string;
  name: string;
  price_monthly: number;
  max_branches?: number;
  max_users?: number;
  max_customers?: number;
  max_products?: number;
  features: Record<string, boolean>;
  stats?: {
    totalOrganizations: number;
    activeOrganizations: number;
    estimatedMonthlyRevenue: number;
  };
}

export default function TiersPage() {
  const router = useRouter();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    price_monthly: 0,
    max_branches: 0,
    max_users: 0,
    max_customers: 0,
    max_products: 0,
    features: {} as Record<string, boolean>,
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/saas-management/tiers");

      if (!response.ok) {
        throw new Error("Error al cargar tiers");
      }

      const data = await response.json();
      setTiers(data.tiers || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      toast.error("Error al cargar tiers");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier: Tier) => {
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
  };

  const handleUpdate = async () => {
    if (!selectedTier) return;

    setEditing(true);
    try {
      // 0 or empty = unlimited -> send null (DB stores NULL for unlimited)
      const toLimitPayload = (v: number) => (v === 0 ? null : v);
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

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar tier");
      }

      toast.success("Tier actualizado exitosamente");
      setShowEditDialog(false);
      setSelectedTier(null);
      fetchTiers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setEditing(false);
    }
  };

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(value);
  };

  const getTierColor = (name: string) => {
    const colors: Record<string, string> = {
      basic: "bg-gray-100 text-gray-800 border-gray-300",
      pro: "bg-blue-100 text-blue-800 border-blue-300",
      premium: "bg-purple-100 text-purple-800 border-purple-300",
    };
    return colors[name] || colors.basic;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
            Gestión de Tiers de Suscripción
          </h1>
          <p className="text-muted-foreground mt-2">
            Administra los planes de suscripción disponibles
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-red-600">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <Card
              className={`admin-card ${getTierColor(tier.name)}`}
              key={tier.id}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5" />
                    {TIER_DISPLAY_NAMES[
                      tier.name as keyof typeof TIER_DISPLAY_NAMES
                    ] ?? tier.name}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(tier)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">
                    {formatPrice(tier.price_monthly)}
                  </div>
                  <div className="text-sm text-gray-600">por mes</div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Sucursales:</span>
                    <span className="font-medium">
                      {tier.max_branches || "Ilimitadas"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Usuarios:</span>
                    <span className="font-medium">
                      {tier.max_users || "Ilimitados"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Clientes:</span>
                    <span className="font-medium">
                      {tier.max_customers || "Ilimitados"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Productos:</span>
                    <span className="font-medium">
                      {tier.max_products || "Ilimitados"}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="text-sm font-medium mb-2">Features:</div>
                  <div className="space-y-1">
                    {Object.entries(tier.features || {}).map(
                      ([key, enabled]) => (
                        <div
                          className="flex items-center gap-2 text-sm"
                          key={key}
                        >
                          {enabled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                          )}
                          <span>
                            {TIER_FEATURE_LABELS[
                              key as keyof typeof TIER_FEATURE_LABELS
                            ] || key}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                {tier.stats && (
                  <div className="border-t pt-4 space-y-2">
                    <div className="text-sm font-medium">Estadísticas:</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-4 w-4" />
                        Organizaciones:
                      </span>
                      <span className="font-medium">
                        {tier.stats.activeOrganizations} /{" "}
                        {tier.stats.totalOrganizations}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        Ingresos mensuales:
                      </span>
                      <span className="font-medium">
                        {formatPrice(tier.stats.estimatedMonthlyRevenue)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de edición */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Editar Tier:{" "}
              {selectedTier
                ? (TIER_DISPLAY_NAMES[
                    selectedTier.name as keyof typeof TIER_DISPLAY_NAMES
                  ] ?? selectedTier.name)
                : ""}
            </DialogTitle>
            <DialogDescription>
              Modifica los límites y características del tier
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Precio Mensual (CLP)</Label>
              <Input
                type="number"
                value={editData.price_monthly}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    price_monthly: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Máx. Sucursales (0 o vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editData.max_branches}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      max_branches: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Máx. Usuarios (0 o vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editData.max_users}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      max_users: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Máx. Clientes (0 o vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editData.max_customers}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      max_customers: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label>Máx. Productos (0 o vacío = ilimitado)</Label>
                <Input
                  type="number"
                  value={editData.max_products}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      max_products: parseInt(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
            <div>
              <Label>Features</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {Object.keys(TIER_FEATURE_LABELS).map((key) => (
                  <label
                    className="flex items-center gap-2 cursor-pointer"
                    key={key}
                  >
                    <input
                      checked={editData.features[key] || false}
                      type="checkbox"
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          features: {
                            ...editData.features,
                            [key]: e.target.checked,
                          },
                        })
                      }
                    />
                    <span className="text-sm">
                      {
                        TIER_FEATURE_LABELS[
                          key as keyof typeof TIER_FEATURE_LABELS
                        ]
                      }
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedTier(null);
              }}
            >
              Cancelar
            </Button>
            <Button disabled={editing} onClick={handleUpdate}>
              {editing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
