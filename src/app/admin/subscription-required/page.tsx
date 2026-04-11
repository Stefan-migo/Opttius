"use client";

import { AlertCircle, CreditCard, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PAYFLOW_ENABLED = process.env.NEXT_PUBLIC_PAYFLOW_ENABLED !== "false";

type Reason = "trial_expired" | "subscription_expired" | null;

export default function SubscriptionRequiredPage() {
  const [reason, setReason] = useState<Reason>(null);

  useEffect(() => {
    fetch("/api/admin/subscription-status", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.isTrialExpired) {
          setReason("trial_expired");
        } else if (data.isExpired && data.status !== "none") {
          setReason("subscription_expired");
        } else {
          setReason("trial_expired");
        }
      })
      .catch(() => setReason("trial_expired"));
  }, []);

  const isTrialExpired = reason === "trial_expired";
  const title = isTrialExpired
    ? "Período de prueba finalizado"
    : "Suscripción vencida";
  const description = isTrialExpired
    ? "Tu período de prueba gratuita ha terminado. Para continuar utilizando todas las funcionalidades de Opttius, necesitas una suscripción activa."
    : "Tu suscripción ha vencido o hay un problema con el pago. Renueva o actualiza tu método de pago para seguir usando Opttius.";

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full border-2 border-amber-200 bg-amber-50/30 dark:bg-amber-950/20 dark:border-amber-800/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <CardTitle className="text-xl">
                {reason ? title : "Suscripción requerida"}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Suscríbete para seguir usando Opttius
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            {reason ? description : "Cargando..."}
          </p>

          <div className="flex flex-col gap-3">
            {PAYFLOW_ENABLED ? (
              <Link className="w-full" href="/checkout">
                <Button className="w-full h-12 font-bold" size="lg">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Suscribirme ahora
                </Button>
              </Link>
            ) : null}

            <Link
              className={PAYFLOW_ENABLED ? "w-full" : ""}
              href="/admin/help"
            >
              <Button
                className="w-full h-12"
                size="lg"
                variant={PAYFLOW_ENABLED ? "outline" : "default"}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                Contactar soporte
              </Button>
            </Link>
          </div>

          {!PAYFLOW_ENABLED && (
            <p className="text-xs text-muted-foreground text-center">
              El pago en línea no está disponible. Contacta a soporte para
              realizar tu suscripción.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
