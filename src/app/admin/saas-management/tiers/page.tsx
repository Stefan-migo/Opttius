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

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TIER_DISPLAY_NAMES,
  TIER_FEATURE_LABELS,
} from "@/lib/saas/tier-constants";

import { TierEditDialog } from "./_components/TierEditDialog";
import { formatPrice, getTierColor } from "./_components/tierHelpers";
import { useTiersPage } from "./_components/useTiersPage";

export default function TiersPage() {
  const router = useRouter();
  const {
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
  } = useTiersPage();

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

      <TierEditDialog
        editData={editData}
        open={showEditDialog}
        saving={editing}
        tierName={
          selectedTier
            ? (TIER_DISPLAY_NAMES[
                selectedTier.name as keyof typeof TIER_DISPLAY_NAMES
              ] ?? selectedTier.name)
            : ""
        }
        onEditDataChange={(data) => setEditData((d) => ({ ...d, ...data }))}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) setSelectedTier(null);
        }}
        onSave={handleUpdate}
      />
    </div>
  );
}
