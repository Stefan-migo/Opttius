"use client";

import {
  ArrowLeft,
  Coins,
  CreditCard,
  Globe,
  Info,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface Gateway {
  id: string;
  gateway_id: string;
  name: string;
  description: string;
  is_enabled: boolean;
  display_order: number;
  icon_name: string;
  config: Record<string, unknown>;
  updated_at: string;
}

export default function PaymentGatewaysPage() {
  const router = useRouter();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchGateways();
  }, []);

  const fetchGateways = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/saas-management/payments");
      const data = await res.json();
      if (data.gateways) setGateways(data.gateways);
    } catch (err) {
      toast.error("Error al cargar las pasarelas");
    } finally {
      setLoading(false);
    }
  };

  const toggleGateway = async (gateway: Gateway) => {
    setUpdatingId(gateway.id);
    try {
      const res = await fetch("/api/admin/saas-management/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: gateway.id,
          is_enabled: !gateway.is_enabled,
        }),
      });

      if (res.ok) {
        toast.success(
          `${gateway.name} ${!gateway.is_enabled ? "activada" : "desactivada"}`,
        );
        fetchGateways();
      } else {
        throw new Error("Error en la actualización");
      }
    } catch (err) {
      toast.error("No se pudo actualizar la pasarela");
    } finally {
      setUpdatingId(null);
    }
  };

  const getIcon = (name: string) => {
    switch (name) {
      case "Globe":
        return <Globe className="h-6 w-6" />;
      case "CreditCard":
        return <CreditCard className="h-6 w-6" />;
      case "Coins":
        return <Coins className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  const gatewayColors: Record<string, string> = {
    mercadopago: "border-blue-500/20 bg-blue-500/5",
    paypal: "border-indigo-500/20 bg-indigo-500/5",
    nowpayments: "border-orange-500/20 bg-orange-500/5",
    flow: "border-slate-500/20 bg-slate-500/5",
  };

  const gatewayBrandColors: Record<string, string> = {
    mercadopago: "text-blue-600",
    paypal: "text-indigo-600",
    nowpayments: "text-orange-600",
    flow: "text-slate-600",
  };

  return (
    <div className="space-y-8 p-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            className="rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            size="icon"
            variant="ghost"
            onClick={() => router.push("/admin/saas-management")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
              Gestión de Pasarelas
            </h1>
            <p className="text-slate-500 font-medium">
              Controla los métodos de pago disponibles en el Checkout global.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            Seguridad Máxima Activa
          </span>
        </div>
      </div>

      <Alert className="bg-amber-500/5 border-amber-500/20 rounded-3xl p-6">
        <div className="flex gap-4">
          <Info className="h-6 w-6 text-amber-600" />
          <div>
            <AlertTitle className="text-amber-600 font-black uppercase text-xs tracking-widest mb-1">
              Nota de Seguridad
            </AlertTitle>
            <AlertDescription className="text-amber-800/80 dark:text-amber-400/80 text-sm font-medium">
              Las API Keys y Secretos se gestionan exclusivamente mediante
              variables de entorno (<code>.env.local</code>) para garantizar la
              seguridad. Este panel solo controla la visibilidad y activación de
              los servicios.
            </AlertDescription>
          </div>
        </div>
      </Alert>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-slate-500 font-bold animate-pulse uppercase text-xs tracking-widest">
            Cargando infraestructura de pagos...
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {gateways.map((gateway) => (
            <Card
              className={cn(
                "admin-card border-2 border-border relative overflow-hidden transition-all duration-300",
                gateway.is_enabled
                  ? gatewayColors[gateway.gateway_id]
                  : "border-slate-100 bg-slate-50/50 opacity-80",
              )}
              key={gateway.id}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div
                    className={cn(
                      "p-3 rounded-2xl",
                      gateway.is_enabled
                        ? "bg-white dark:bg-slate-900 shadow-lg"
                        : "bg-slate-200 dark:bg-slate-800",
                    )}
                  >
                    <div
                      className={
                        gateway.is_enabled
                          ? gatewayBrandColors[gateway.gateway_id]
                          : "text-slate-400"
                      }
                    >
                      {getIcon(gateway.icon_name)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg",
                        gateway.is_enabled
                          ? "bg-green-500/10 text-green-600"
                          : "bg-slate-200 text-slate-500",
                      )}
                    >
                      {gateway.is_enabled ? "Activo" : "Inactivo"}
                    </span>
                    <Switch
                      checked={gateway.is_enabled}
                      disabled={updatingId === gateway.id}
                      onCheckedChange={() => toggleGateway(gateway)}
                    />
                  </div>
                </div>
                <CardTitle className="text-xl font-black mt-4 text-slate-900 dark:text-white uppercase tracking-tight">
                  {gateway.name}
                </CardTitle>
                <CardDescription className="text-slate-500 font-medium">
                  {gateway.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 space-y-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Configuración</span>
                    <span>Modo: Sandbox</span>
                  </div>

                  <div className="flex gap-2">
                    {gateway.gateway_id === "nowpayments" && (
                      <Badge
                        className="bg-orange-500/10 text-orange-600 border-none"
                        variant="healty"
                      >
                        300+ Cryptos
                      </Badge>
                    )}
                    {gateway.gateway_id === "mercadopago" && (
                      <Badge
                        className="bg-blue-500/10 text-blue-600 border-none"
                        variant="healty"
                      >
                        Tarjetas Chile
                      </Badge>
                    )}
                    {gateway.gateway_id === "paypal" && (
                      <Badge
                        className="bg-indigo-500/10 text-indigo-600 border-none"
                        variant="healty"
                      >
                        USD Global
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// Simple Alert Component substitution for the page
function Alert({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-4 rounded-lg border", className)}>{children}</div>
  );
}
function AlertTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h5 className={cn("font-medium leading-none tracking-tight", className)}>
      {children}
    </h5>
  );
}
function AlertDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("text-sm opacity-90", className)}>{children}</div>;
}
