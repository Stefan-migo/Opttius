"use client";

import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  LayoutDashboard,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function CheckoutResultContent() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const paymentId = searchParams.get("payment_id");
  const error = searchParams.get("error");

  const getStatusInfo = () => {
    if (error) {
      return {
        icon: XCircle,
        title: "Error en el pago",
        message:
          error || "Ocurrió un error inesperado al procesar tu transacción.",
        variant: "destructive" as const,
        color: "text-admin-error",
        barColor: "bg-admin-error",
        iconBg: "bg-admin-error/10",
        iconColor: "text-admin-error",
      };
    }
    if (success === "1" || success === "true") {
      return {
        icon: CheckCircle,
        title: "¡Pago Exitoso!",
        message:
          "Tu suscripción ha sido activada correctamente. Ya tienes acceso total a las funciones de tu plan.",
        variant: "default" as const,
        color: "text-admin-success",
        barColor: "bg-admin-success",
        iconBg: "bg-admin-success/10",
        iconColor: "text-admin-success",
      };
    }
    if (success === "pending") {
      return {
        icon: Clock,
        title: "Pago en Proceso",
        message:
          "Estamos validando tu pago con la entidad bancaria. Esto puede tomar unos minutos.",
        variant: "default" as const,
        color: "text-admin-warning",
        barColor: "bg-admin-warning",
        iconBg: "bg-admin-warning/10",
        iconColor: "text-admin-warning",
      };
    }
    return {
      icon: AlertCircle,
      title: "Pago Cancelado",
      message:
        "La transacción fue interrumpida. No se ha realizado ningún cargo a tu cuenta.",
      variant: "destructive" as const,
      color: "text-admin-text-tertiary",
      barColor: "bg-admin-border-primary",
      iconBg: "bg-admin-border-primary/20",
      iconColor: "text-admin-text-tertiary",
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-admin-bg-primary flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-admin-accent-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-admin-accent-secondary/5 rounded-full blur-[120px]" />
      </div>

      <Card
        className="max-w-xl w-full border-2 border-admin-border-secondary shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-500 rounded-xl sm:rounded-2xl bg-admin-bg-tertiary"
        variant="glass"
      >
        {/* Status bar */}
        <div className={`h-1.5 sm:h-2 w-full ${statusInfo.barColor}`} />
        <CardHeader className="text-center pt-8 sm:pt-10 px-4 sm:px-6 md:px-10">
          <div
            className={`mx-auto mb-4 sm:mb-6 p-3 sm:p-4 rounded-xl sm:rounded-2xl ${statusInfo.iconBg} w-fit animate-bounce-subtle`}
          >
            <Icon
              className={`h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 ${statusInfo.iconColor}`}
              strokeWidth={2.5}
            />
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-display font-black tracking-tight text-admin-text-primary uppercase leading-none mb-2">
            {statusInfo.title}
          </CardTitle>
          <p className="text-sm sm:text-base text-admin-text-secondary font-medium px-2 sm:px-4">
            {statusInfo.message}
          </p>
        </CardHeader>
        <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 md:p-10 pt-0">
          {/* Comprobante de operación - light bg, dark text for contrast */}
          {paymentId && (
            <div className="p-4 sm:p-5 rounded-xl border-2 border-admin-border-secondary bg-white dark:bg-admin-bg-secondary/20 flex flex-col items-center gap-1">
              <span className="text-[9px] sm:text-[10px] font-display font-black text-admin-text-tertiary uppercase tracking-widest">
                Comprobante de operación
              </span>
              <code className="text-xs sm:text-sm font-bold text-admin-text-primary break-all text-center font-mono px-2">
                {paymentId}
              </code>
            </div>
          )}

          {/* Action buttons - system aesthetic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <Button
              asChild
              className="h-12 sm:h-14 rounded-xl sm:rounded-2xl border-2 border-admin-accent-primary font-display font-bold text-[10px] sm:text-xs uppercase tracking-[0.15em] text-admin-accent-primary hover:bg-admin-accent-primary/10 hover:text-admin-accent-primary hover:border-admin-accent-primary transition-all min-h-[48px]"
              variant="outline"
            >
              <Link
                className="flex items-center justify-center gap-2"
                href="/profile?tab=subscription"
              >
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>Gestionar Suscripción</span>
              </Link>
            </Button>
            <Button
              asChild
              shimmer
              className="h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-admin-accent-primary text-[#1A2B23] hover:bg-admin-accent-secondary font-display font-black text-[10px] sm:text-xs uppercase tracking-[0.15em] shadow-xl shadow-admin-accent-primary/25 transition-all min-h-[48px]"
            >
              <Link
                className="flex items-center justify-center gap-2"
                href="/admin"
              >
                <LayoutDashboard className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                <span>Ir al Dashboard</span>
              </Link>
            </Button>
          </div>

          {/* Help footer */}
          <p className="text-center text-[9px] sm:text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
            ¿Necesitas ayuda?{" "}
            <Link
              className="text-admin-accent-primary hover:underline transition-colors"
              href="/support"
            >
              Abre un ticket de soporte
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando resultado…</div>}>
      <CheckoutResultContent />
    </Suspense>
  );
}
