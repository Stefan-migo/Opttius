"use client";

import { initMercadoPago, Wallet } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

interface MercadoPagoButtonProps {
  preferenceId: string;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export function MercadoPagoButton({
  preferenceId,
  onReady,
  onError,
}: MercadoPagoButtonProps) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const publicKey =
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SANDBOX;

    if (!publicKey) {
      const err = new Error("MercadoPago Public Key not configured");
      setError(err.message);
      onError?.(err);
      return;
    }

    try {
      initMercadoPago(publicKey, {
        locale: "es-CL", // o es-AR, es-MX según el país
      });
      setIsInitialized(true);
      onReady?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message);
      onError?.(error);
    }
  }, [onReady, onError]);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error al inicializar MercadoPago: {error}
        </AlertDescription>
      </Alert>
    );
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">
            Cargando pasarela de pago...
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full">
      <Wallet initialization={{ preferenceId }} />
    </div>
  );
}
