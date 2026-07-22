"use client";

import { AlertCircle, ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface SuccessViewProps {
  ticketNumber: string;
  onReset: () => void;
}

export function SuccessView({ ticketNumber, onReset }: SuccessViewProps) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-epoch-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <Card className="border-epoch-primary/20 bg-epoch-primary/5 rounded-xl border">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-epoch-primary/10 rounded-xl flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-epoch-primary" />
            </div>
            <CardTitle className="text-2xl font-display font-bold text-epoch-primary">
              ¡Ticket Creado Exitosamente!
            </CardTitle>
            <CardDescription className="text-epoch-primary/80">
              Tu solicitud de soporte ha sido recibida
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-epoch-primary/20">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-epoch-primary/80">
                  Número de Ticket
                </Label>
                <div className="text-2xl font-mono font-bold text-epoch-primary">
                  {ticketNumber}
                </div>
                <p className="text-sm text-epoch-primary/70 mt-2">
                  Guarda este número para hacer seguimiento de tu ticket
                </p>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Te hemos enviado un email de confirmación a tu dirección de
                correo. Revisa tu bandeja de entrada.
              </AlertDescription>
            </Alert>
            <div className="flex gap-4">
              <Button
                className="flex-1 rounded-xl border-admin-border-primary/20"
                variant="outline"
                onClick={onReset}
              >
                Crear Otro Ticket
              </Button>
              <Button
                className="flex-1 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold text-[10px] tracking-[0.2em] uppercase"
                onClick={() => router.push(`/support/ticket/${ticketNumber}`)}
              >
                Ver Estado del Ticket
              </Button>
            </div>
            <div className="text-center pt-4 border-t">
              <Link
                className="text-sm text-epoch-primary/70 hover:text-epoch-primary inline-flex items-center gap-1"
                href="/"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver al inicio
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
