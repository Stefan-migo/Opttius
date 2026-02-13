"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CreditCard,
  Loader2,
  Calendar,
  AlertCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  Clock,
  Building2,
  Info,
  ShieldCheck,
  Zap,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/saas/tier-config";

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
  const [dbTiers, setDbTiers] = useState<any[]>([]);

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
  const isExpired = status.isExpired;
  const currentTier = currentSubscription?.currentTier || "basic";
  const tierPrice =
    dbTiers.find((t) => t.name === currentTier)?.price_monthly ||
    TIER_LIMITS[currentTier].price;

  return (
    <div className="space-y-8">
      {/* Premium Confirmation Dialog Overlay */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300 px-4">
          <Card className="max-w-md w-full border-white/20 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="p-8 pb-4 text-center">
              <div className="mx-auto bg-red-100 dark:bg-red-500/20 p-4 rounded-3xl w-fit mb-4">
                <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-500" />
              </div>
              <CardTitle className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                ¿Cancelar Suscripción?
              </CardTitle>
              <p className="text-slate-500 font-medium text-sm mt-2">
                Sentimos que te vayas. Al cancelar, perderás el acceso a las
                funciones premium una vez termine tu ciclo de facturación
                actual.
              </p>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              <Button
                variant="destructive"
                className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-red-500/20"
                onClick={handleCancel}
                disabled={!!actionLoading}
              >
                {actionLoading === "cancel" ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="h-5 w-5 mr-2" />
                )}
                Confirmar Cancelación
              </Button>
              <Button
                variant="outline"
                className="w-full h-12 rounded-2xl border-2 font-bold"
                onClick={() => setShowCancelConfirm(false)}
                disabled={!!actionLoading}
              >
                Mantener mi Plan Premium
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Stats Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card
          variant="glass"
          className="bg-admin-bg-tertiary shadow-xl shadow-primary/5 border-none"
        >
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Plan Actual
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
              {TIER_LABELS[currentTier]}
            </p>
          </CardContent>
        </Card>
        <Card
          variant="glass"
          className="bg-admin-bg-tertiary shadow-xl shadow-emerald-500/5 border-none"
        >
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <TrendingUp className="h-7 w-7 text-emerald-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Inversión Mensual
            </p>
            <p className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter text-emerald-600">
              ${Number(tierPrice).toLocaleString()}{" "}
              <span className="text-xs text-slate-400">CLP</span>
            </p>
          </CardContent>
        </Card>
        <Card
          variant="glass"
          className="bg-admin-bg-tertiary shadow-xl shadow-blue-500/5 border-none"
        >
          <CardContent className="p-8 flex flex-col items-center text-center space-y-3">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <Calendar className="h-7 w-7 text-blue-600" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Estado de Cuenta
            </p>
            <Badge
              variant={isActive ? "healty" : "destructive"}
              className="px-6 py-1.5 font-black text-[11px] tracking-widest bg-[var(--admin-bg-primary)] border-solid border-[var(--admin-border-secondary)] shadow-sm"
            >
              {statusLabel.toUpperCase()}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Details */}
        <div className="lg:col-span-12 space-y-8">
          <Card className="border-admin-border-primary shadow-2xl bg-admin-bg-tertiary rounded-[2.5rem] overflow-hidden border">
            <CardHeader className="p-8 border-b border-admin-border-primary bg-admin-bg-secondary/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase mb-1">
                    Detalles de Facturación
                  </CardTitle>
                  <CardDescription className="font-medium text-[var(--admin-accent-primary)]">
                    Gestión administrativa de tu suscripción{" "}
                    {TIER_LABELS[currentTier] || "Básica"}
                  </CardDescription>
                </div>
                <div className="p-3 bg-primary rounded-3xl text-white shadow-xl shadow-primary/20">
                  <Building2 className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    ID de Organización
                  </p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {status.organizationId.substring(0, 13)}...
                  </p>
                </div>
                {status.currentPeriodEnd && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Siguiente Factura
                    </p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {formatDate(status.currentPeriodEnd)}
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Método Principal
                  </p>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <CreditCard className="h-4 w-4" />
                      {currentSubscription?.hasSubscription
                        ? currentSubscription.subscription?.status === "active"
                          ? "Pasarela Activa"
                          : "Pendiente de Configurar"
                        : "No Registrado"}
                    </p>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-[10px] font-black uppercase text-primary"
                      onClick={() => router.push("/checkout")}
                    >
                      Configurar
                    </Button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-8 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-4">
                <Button
                  type="button"
                  size="lg"
                  className="inline-flex h-14 rounded-2xl font-bold px-10 shadow-xl shadow-primary/25"
                  shimmer
                  onClick={() => router.push("/checkout")}
                >
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Actualizar o Cambiar Plan
                </Button>

                {isActive && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 rounded-2xl border-2 font-bold px-10 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-300"
                    onClick={() => setShowCancelConfirm(true)}
                    disabled={!!actionLoading}
                  >
                    <XCircle className="h-5 w-5 mr-2" />
                    Cancelar Suscripción
                  </Button>
                )}

                {isCancelled && (
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-14 rounded-2xl border-2 font-bold px-10 bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100 transition-all"
                    onClick={handleReactivate}
                    disabled={!!actionLoading}
                  >
                    {actionLoading === "reactivate" ? (
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="h-5 w-5 mr-2" />
                    )}
                    Reactivar Suscripción Premium
                  </Button>
                )}
              </div>

              {/* Status Specific Alerts */}
              {isCancelled && status.cancelAt && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-3xl flex items-start gap-4">
                  <AlertCircle className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-900 dark:text-amber-200">
                      Suscripción Programada para Cancelación
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                      Tu acceso premium expirará el{" "}
                      <strong>{formatDate(status.cancelAt)}</strong>. Hasta
                      entonces, todas tus herramientas seguirán funcionando
                      normalmente.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
