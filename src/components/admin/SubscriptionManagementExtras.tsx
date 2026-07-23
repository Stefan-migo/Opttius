"use client";

import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SubscriptionTier } from "@/lib/saas/tier-config";
import { formatDate } from "@/lib/utils";

const TIER_LABELS: Record<SubscriptionTier, string> = {
  basic: "Básico",
  pro: "Pro",
  premium: "Premium",
};

interface StatsProps {
  currentTier: SubscriptionTier;
  tierPrice: number;
  statusLabel: string;
  isActive: boolean;
}

export function SubMgmtStats({
  currentTier,
  tierPrice,
  statusLabel,
  isActive,
}: StatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
      <Card
        className="bg-admin-bg-tertiary shadow-xl shadow-primary/5 border-none"
        variant="glass"
      >
        <CardContent className="p-4 sm:p-6 md:p-8 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Zap className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Plan Actual
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
            {TIER_LABELS[currentTier]}
          </p>
        </CardContent>
      </Card>
      <Card
        className="bg-admin-bg-tertiary shadow-xl shadow-emerald-500/5 border-none"
        variant="glass"
      >
        <CardContent className="p-4 sm:p-6 md:p-8 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-emerald-500/10 rounded-2xl">
            <TrendingUp className="h-7 w-7 text-emerald-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Inversión Mensual
          </p>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter text-emerald-600">
            ${Number(tierPrice).toLocaleString()}{" "}
            <span className="text-xs text-slate-400">CLP</span>
          </p>
        </CardContent>
      </Card>
      <Card
        className="bg-admin-bg-tertiary shadow-xl shadow-blue-500/5 border-none"
        variant="glass"
      >
        <CardContent className="p-4 sm:p-6 md:p-8 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-blue-500/10 rounded-2xl">
            <Calendar className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Estado de Cuenta
          </p>
          <Badge
            className="px-6 py-1.5 font-black text-[11px] tracking-widest bg-[var(--admin-bg-primary)] border-solid border-[var(--admin-border-secondary)] shadow-sm"
            variant={isActive ? "healty" : "destructive"}
          >
            {statusLabel.toUpperCase()}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

interface CancelProps {
  open: boolean;
  actionLoading: string | null;
  onCancel: () => void;
  onClose: () => void;
}

export function SubMgmtCancelDialog({
  open,
  actionLoading,
  onCancel,
  onClose,
}: CancelProps) {
  if (!open) return null;
  return (
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
            funciones premium una vez termine tu ciclo de facturación actual.
          </p>
        </CardHeader>
        <CardContent className="p-8 pt-4 space-y-4">
          <Button
            className="w-full h-12 rounded-2xl font-bold shadow-lg shadow-red-500/20"
            disabled={!!actionLoading}
            variant="destructive"
            onClick={onCancel}
          >
            {actionLoading === "cancel" ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <ShieldCheck className="h-5 w-5 mr-2" />
            )}
            Confirmar Cancelación
          </Button>
          <Button
            className="w-full h-12 rounded-2xl border-2 font-bold"
            disabled={!!actionLoading}
            variant="outline"
            onClick={onClose}
          >
            Mantener mi Plan Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

interface BillingProps {
  orgId: string;
  currentPeriodEnd: string | null;
  hasSubscription: boolean;
  subStatus: string | null;
  currentTier: SubscriptionTier;
  isActive: boolean;
  actionLoading: string | null;
  isCancelled: boolean;
  cancelAt: string | null;
  onCheckout: () => void;
  onCancelClick: () => void;
  onReactivate: () => void;
  onConfigure: () => void;
}

export function SubMgmtBillingCard({
  orgId,
  currentPeriodEnd,
  hasSubscription,
  subStatus,
  currentTier,
  isActive,
  actionLoading,
  isCancelled,
  cancelAt,
  onCheckout,
  onCancelClick,
  onReactivate,
  onConfigure,
}: BillingProps) {
  return (
    <Card className="border-admin-border-primary shadow-2xl bg-admin-bg-tertiary rounded-2xl sm:rounded-[2.5rem] overflow-hidden border w-full max-w-full min-w-0">
      <CardHeader className="p-4 sm:p-6 md:p-8 border-b border-admin-border-primary bg-admin-bg-secondary/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="text-lg sm:text-xl md:text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase mb-1 break-words">
              Detalles de Facturación
            </CardTitle>
            <CardDescription className="font-medium text-[var(--admin-accent-primary)] text-sm break-words">
              Gestión administrativa de tu suscripción{" "}
              {TIER_LABELS[currentTier]}
            </CardDescription>
          </div>
          <div className="p-2.5 sm:p-3 bg-primary rounded-2xl sm:rounded-3xl text-white shadow-xl shadow-primary/20 shrink-0 self-start sm:self-center">
            <Building2 className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8 overflow-hidden">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 min-w-0">
          <div className="space-y-1 min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              ID de Organización
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 break-all">
              {orgId.substring(0, 13)}...
            </p>
          </div>
          {currentPeriodEnd && (
            <div className="space-y-1 min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Siguiente Factura
              </p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300 break-words">
                {formatDate(currentPeriodEnd)}
              </p>
            </div>
          )}
          <div className="space-y-1 min-w-0 overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Método Principal
            </p>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 min-w-0">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="truncate min-w-0">
                {hasSubscription
                  ? subStatus === "active"
                    ? "Pasarela Activa"
                    : "Pendiente de Configurar"
                  : "No Registrado"}
              </span>
            </p>
            <Button
              className="h-auto p-0 text-[10px] font-black uppercase text-primary shrink-0 w-fit"
              variant="link"
              onClick={onConfigure}
            >
              Configurar
            </Button>
          </div>
        </div>

        <div className="pt-6 sm:pt-8 border-t border-slate-200/50 dark:border-slate-800/50 flex flex-col sm:flex-row gap-3 sm:gap-4 min-w-0 overflow-hidden">
          <Button
            shimmer
            className="w-full sm:w-auto min-h-[44px] h-12 sm:h-14 rounded-xl sm:rounded-2xl font-bold px-6 sm:px-10 shadow-xl shadow-primary/25 shrink-0"
            size="lg"
            type="button"
            onClick={onCheckout}
          >
            <RefreshCw className="h-5 w-5 mr-2 shrink-0" />
            Actualizar o Cambiar Plan
          </Button>
          {isActive && (
            <Button
              className="w-full sm:w-auto min-h-[44px] h-12 sm:h-14 rounded-xl sm:rounded-2xl border-2 font-bold px-6 sm:px-10 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/30 transition-all"
              disabled={!!actionLoading}
              size="lg"
              variant="outline"
              onClick={onCancelClick}
            >
              <XCircle className="h-5 w-5 mr-2 shrink-0" />
              Cancelar Suscripción
            </Button>
          )}
          {isCancelled && (
            <Button
              className="w-full sm:w-auto min-h-[44px] h-12 sm:h-14 rounded-xl sm:rounded-2xl border-2 font-bold px-6 sm:px-10 bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-200/50 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-100 transition-all"
              disabled={!!actionLoading}
              size="lg"
              variant="outline"
              onClick={onReactivate}
            >
              {actionLoading === "reactivate" ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2 shrink-0" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-2 shrink-0" />
              )}
              Reactivar Suscripción Premium
            </Button>
          )}
        </div>

        {isCancelled && cancelAt && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl sm:rounded-3xl flex items-start gap-3 sm:gap-4 min-w-0">
            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-amber-900 dark:text-amber-200 text-sm sm:text-base break-words">
                Suscripción Programada para Cancelación
              </p>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-400 mt-1 break-words">
                Tu acceso premium expirará el{" "}
                <strong>{formatDate(cancelAt)}</strong>.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
