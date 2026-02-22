"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

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
        bgColor: "bg-admin-error/10",
        borderColor: "border-admin-error/20",
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
        bgColor: "bg-admin-success/10",
        borderColor: "border-admin-success/20",
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
        bgColor: "bg-admin-warning/10",
        borderColor: "border-admin-warning/20",
      };
    }
    return {
      icon: AlertCircle,
      title: "Pago Cancelado",
      message:
        "La transacción fue interrumpida. No se ha realizado ningún cargo a tu cuenta.",
      variant: "destructive" as const,
      color: "text-admin-text-tertiary",
      bgColor: "bg-admin-border-primary/10",
      borderColor: "border-admin-border-primary/20",
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-admin-bg-primary flex items-center justify-center px-4 relative overflow-hidden">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-admin-accent-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-admin-accent-secondary/5 rounded-full blur-[120px]" />
      </div>

      <Card
        variant="glass"
        className="max-w-xl w-full border-admin-border-primary shadow-2xl overflow-hidden relative z-10 animate-in zoom-in-95 duration-500 rounded-none"
      >
        <div
          className={`h-2 w-full ${statusInfo.bgColor} ${statusInfo.color.replace("text-", "bg-")}`}
        />
        <CardHeader className="text-center pt-10">
          <div
            className={`mx-auto mb-6 p-4 rounded-none ${statusInfo.bgColor} w-fit animate-bounce-subtle`}
          >
            <Icon
              className={`h-16 w-16 ${statusInfo.color}`}
              strokeWidth={2.5}
            />
          </div>
          <CardTitle className="text-3xl font-display font-black tracking-tight text-admin-text-primary uppercase leading-none mb-2">
            {statusInfo.title}
          </CardTitle>
          <p className="text-admin-text-secondary font-medium px-6">
            {statusInfo.message}
          </p>
        </CardHeader>
        <CardContent className="space-y-8 p-10 pt-0">
          {paymentId && (
            <div className="bg-admin-bg-secondary p-4 rounded-none border border-admin-border-primary flex flex-col items-center">
              <span className="text-[10px] font-black text-admin-text-tertiary uppercase tracking-widest mb-1">
                Comprobante de operación
              </span>
              <code className="text-sm font-bold text-admin-text-primary">
                {paymentId}
              </code>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Button
              asChild
              variant="outline"
              className="h-14 rounded-none border-2 font-bold group"
            >
              <Link href="/profile?tab=subscription">
                Gestionar Suscripción
              </Link>
            </Button>
            <Button
              asChild
              className="h-14 rounded-none font-bold shadow-xl shadow-admin-accent-primary/20 group hover:scale-[1.02] transition-transform"
              shimmer
            >
              <Link href="/admin">Ir al Dashboard</Link>
            </Button>
          </div>

          <p className="text-center text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
            ¿Necesitas ayuda? Contacta a{" "}
            <span className="text-admin-accent-primary group-hover:underline cursor-pointer">
              soporte@opttius.cl
            </span>
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
