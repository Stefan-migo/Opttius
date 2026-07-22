"use client";

import { ArrowRight, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type SubscriptionTier, TIER_LIMITS } from "@/lib/saas/tier-config";

import {
  SubMgmtBillingCard,
  SubMgmtCancelDialog,
  SubMgmtStats,
} from "./SubscriptionManagementExtras";

interface SubscriptionStatusResult {
  status: string;
  isExpired: boolean;
  isTrialExpired: boolean;
  trialEndsAt: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAt: string | null;
  canceledAt: string | null;
  organizationId: string | null;
}

interface CurrentSubscription {
  hasSubscription: boolean;
  currentTier: SubscriptionTier | null;
  subscription: {
    status: string;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAt: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  active: "Activa",
  trialing: "Prueba gratuita",
  expired: "Expirada",
  past_due: "Pago pendiente",
  cancelled: "Cancelada",
  incomplete: "Incompleta",
  none: "Sin suscripción",
};

const TIER_LABELS: Record<SubscriptionTier, string> = {
  basic: "Básico",
  pro: "Pro",
  premium: "Premium",
};

export function SubscriptionManagementSection() {
  const router = useRouter();
  const [status, setStatus] = useState<SubscriptionStatusResult | null>(null);
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [dbTiers, setDbTiers] = useState<unknown[]>([]);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const [statusRes, subscriptionRes, tiersRes] = await Promise.all([
        fetch("/api/admin/subscription-status"),
        fetch("/api/checkout/current-subscription", { credentials: "include" }),
        fetch("/api/checkout/tiers"),
      ]);

      const statusData = await statusRes.json();
      const subscriptionData = await subscriptionRes.json();
      const tiersData = await tiersRes.json();

      if (statusRes.ok) {
        setStatus({
          ...statusData,
          trialEndsAt: statusData.trialEndsAt ?? null,
          currentPeriodStart: statusData.currentPeriodStart ?? null,
          currentPeriodEnd: statusData.currentPeriodEnd ?? null,
          cancelAt: statusData.cancelAt ?? null,
          canceledAt: statusData.canceledAt ?? null,
        });
      } else {
        setStatus(null);
      }

      if (subscriptionRes.ok) {
        setCurrentSubscription(subscriptionData);
      }

      if (tiersRes.ok) {
        setDbTiers(tiersData.tiers || []);
      }
    } catch {
      setStatus(null);
      setCurrentSubscription(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleCancel = async () => {
    setActionLoading("cancel");
    try {
      const res = await fetch("/api/admin/subscription/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cancelar");

      toast.success("Suscripción cancelada", {
        description:
          "Mantendrás el acceso premium hasta el final del periodo actual.",
        duration: 5000,
      });

      setShowCancelConfirm(false);
      await fetchStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    setActionLoading("reactivate");
    try {
      const res = await fetch("/api/admin/subscription/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reactivar");
      toast.success(data.message || "Suscripción reactivada");
      await fetchStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al reactivar");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!status || !status.organizationId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Suscripción
          </CardTitle>
          <CardDescription>Gestiona tu plan y método de pago</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              No tienes una organización con suscripción asignada. Si acabas de
              registrarte, completa el onboarding para activar tu plan.
            </AlertDescription>
          </Alert>
          <Button asChild className="mt-4">
            <Link href="/onboarding/choice">
              <ArrowRight className="h-4 w-4 mr-2" />
              Ir a configuración
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusLabel = STATUS_LABELS[status.status] ?? status.status;
  const isActive = status.status === "active" || status.status === "trialing";
  const isCancelled = status.status === "cancelled";
  const currentTier = currentSubscription?.currentTier || "basic";
  const tierPrice =
    (dbTiers as Array<{ name: string; price_monthly?: number }>).find(
      (t) => t.name === currentTier,
    )?.price_monthly ?? TIER_LIMITS[currentTier].price;

  return (
    <div className="space-y-8 min-w-0 w-full overflow-x-hidden">
      <SubMgmtCancelDialog
        actionLoading={actionLoading}
        open={showCancelConfirm}
        onCancel={handleCancel}
        onClose={() => setShowCancelConfirm(false)}
      />

      <SubMgmtStats
        currentTier={currentTier}
        isActive={isActive}
        statusLabel={statusLabel}
        tierPrice={tierPrice}
      />

      <SubMgmtBillingCard
        actionLoading={actionLoading}
        cancelAt={status.cancelAt}
        currentPeriodEnd={status.currentPeriodEnd}
        currentTier={currentTier}
        hasSubscription={currentSubscription?.hasSubscription ?? false}
        isActive={isActive}
        isCancelled={isCancelled}
        orgId={status.organizationId}
        subStatus={currentSubscription?.subscription?.status ?? null}
        onCancelClick={() => setShowCancelConfirm(true)}
        onCheckout={() => router.push("/checkout")}
        onConfigure={() => router.push("/checkout")}
        onReactivate={handleReactivate}
      />
    </div>
  );
}
