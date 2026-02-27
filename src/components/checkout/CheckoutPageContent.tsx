"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { initMercadoPago, CardPayment } from "@mercadopago/sdk-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Loader2,
  CreditCard,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Info,
  AlertCircle,
  ShieldCheck,
  Lock,
  Star,
  Zap,
  Check,
  Globe,
  Coins,
} from "lucide-react";
import {
  getTierConfig,
  TIER_LIMITS,
  type SubscriptionTier,
} from "@/lib/saas/tier-config";

interface Tier {
  name: string;
  price_monthly: number;
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

const tierLabels: Record<string, string> = {
  basic: "Básico",
  pro: "Pro",
  premium: "Premium",
};

const tierOrder: SubscriptionTier[] = ["basic", "pro", "premium"];

export function CheckoutPageContent() {
  const router = useRouter();
  const { user } = useAuthContext();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [currentSubscription, setCurrentSubscription] =
    useState<CurrentSubscription | null>(null);
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(
    null,
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>("mercadopago");
  const [availableGateways, setAvailableGateways] = useState<any[]>([]);

  useEffect(() => {
    // Initialize MercadoPago
    const publicKey =
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY ||
      process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_SANDBOX;

    if (publicKey) {
      initMercadoPago(publicKey, { locale: "es-CL" });
      setIsInitialized(true);
    }

    // Load tiers, subscriptions and active gateways
    Promise.all([
      fetch("/api/checkout/tiers", {
        credentials: "include",
        cache: "no-store",
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.tiers?.length) {
            setTiers(data.tiers);
          }
        })
        .catch(() => {}),
      fetch("/api/checkout/current-subscription", { credentials: "include" })
        .then((res) => res.json())
        .then((data) => {
          setCurrentSubscription(data);
          // Auto-select current tier if exists
          if (data.currentTier) {
            setSelectedTier(data.currentTier);
          }
        })
        .catch(() => {}),
      fetch("/api/checkout/gateways")
        .then((res) => res.json())
        .then((data) => {
          if (data.gateways?.length) {
            setAvailableGateways(data.gateways);
            // Default select the first one if available
            setSelectedGateway(data.gateways[0].gateway_id);
          }
        })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  /** Price for a tier: from API (tiers from DB) or fallback to tier-config */
  const getTierPrice = (tierName: SubscriptionTier): number => {
    const fromApi = tiers.find((t) => t.name === tierName);
    if (fromApi != null && Number.isFinite(Number(fromApi.price_monthly))) {
      return Number(fromApi.price_monthly);
    }
    return TIER_LIMITS[tierName].price;
  };

  const calculateAmount = (tier: SubscriptionTier): number => {
    if (
      !currentSubscription?.currentTier ||
      !currentSubscription.hasSubscription
    ) {
      return getTierPrice(tier);
    }

    const currentTier = currentSubscription.currentTier;
    const currentTierIndex = tierOrder.indexOf(currentTier);
    const newTierIndex = tierOrder.indexOf(tier);

    // Upgrade: calculate prorated difference
    if (newTierIndex > currentTierIndex) {
      const currentPrice = getTierPrice(currentTier);
      const newPrice = getTierPrice(tier);
      const difference = newPrice - currentPrice;

      // Calculate days remaining in current period
      if (currentSubscription.subscription?.currentPeriodEnd) {
        const endDate = new Date(
          currentSubscription.subscription.currentPeriodEnd,
        );
        const now = new Date();
        const daysRemaining = Math.max(
          0,
          Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          ),
        );
        const daysInPeriod = 30; // Approximate
        const proratedAmount = (difference * daysRemaining) / daysInPeriod;
        return Math.max(0, Math.round(proratedAmount * 100) / 100);
      }

      return difference;
    }

    // Downgrade: charge full amount of lower tier (no refund)
    if (newTierIndex < currentTierIndex) {
      return getTierPrice(tier);
    }

    // Same tier: full price
    return getTierPrice(tier);
  };

  const getTierChangeType = (
    tier: SubscriptionTier,
  ): "upgrade" | "downgrade" | "same" | "new" => {
    if (
      !currentSubscription?.currentTier ||
      !currentSubscription.hasSubscription
    ) {
      return "new";
    }

    const currentTierIndex = tierOrder.indexOf(currentSubscription.currentTier);
    const newTierIndex = tierOrder.indexOf(tier);

    if (newTierIndex > currentTierIndex) return "upgrade";
    if (newTierIndex < currentTierIndex) return "downgrade";
    return "same";
  };

  const handleTierSelect = (tier: SubscriptionTier) => {
    setSelectedTier(tier);
    setError(null);
    setPaymentId(null);
  };

  const handleCreateIntent = async () => {
    if (!selectedTier) {
      setError("Por favor selecciona un plan");
      return;
    }

    setError(null);
    setProcessing(true);

    try {
      const amount = calculateAmount(selectedTier);
      const changeType = getTierChangeType(selectedTier);

      const response = await fetch("/api/checkout/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: "CLP",
          gateway: selectedGateway,
          subscription_tier: selectedTier,
          isUpgrade: changeType === "upgrade",
          isDowngrade: changeType === "downgrade",
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al crear intento de pago");
      }

      setPaymentId(data.paymentId);

      // Solo redirigir para gateways que usan flujo externo (NO Mercado Pago - usa CardPayment embebido)
      if (data.approvalUrl && selectedGateway !== "mercadopago") {
        const gatewayNames = {
          nowpayments: "la pasarela de criptomonedas",
          paypal: "PayPal",
          mercadopago: "la pasarela de pago",
          flow: "Flow",
        };
        toast.info(
          `Redirigiendo a ${gatewayNames[selectedGateway as keyof typeof gatewayNames] || "la pasarela de pago"}...`,
        );
        window.location.href = data.approvalUrl;
        return;
      }

      toast.success(
        "Intento de pago creado. Completa los datos de tu tarjeta.",
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentSubmit = async (formData: {
    token: string;
    payment_method_id?: string;
    issuer_id?: string;
    payer?: { email?: string };
  }) => {
    if (!paymentId || !selectedTier) {
      setError("Información de pago incompleta");
      return;
    }

    setProcessing(true);
    setError(null);

    const payerEmail = user?.email ?? formData.payer?.email;
    try {
      if (!payerEmail) {
        throw new Error(
          "Email de usuario no disponible. Por favor, inicia sesión de nuevo.",
        );
      }

      if (!formData.payment_method_id) {
        throw new Error(
          "No se pudo obtener el método de pago. Intenta de nuevo.",
        );
      }

      const response = await fetch("/api/checkout/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token: formData.token,
          paymentId,
          payerEmail,
          payment_method_id: formData.payment_method_id,
          issuer_id: formData.issuer_id ?? undefined,
          description: `Suscripción ${tierLabels[selectedTier]} - Opttius`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Error al procesar pago");
      }

      toast.success("Pago procesado correctamente");
      router.push(`/checkout/result?success=1&payment_id=${paymentId}`);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al procesar pago";
      setError(errorMessage);
      toast.error(errorMessage);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="container max-w-4xl py-8 sm:py-12 px-4">
        <Card>
          <CardContent className="flex items-center justify-center py-12 sm:py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Require authenticated user for checkout
  if (!user) {
    return (
      <div className="container max-w-4xl py-8 sm:py-12 px-4">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-lg sm:text-xl">Inicia sesión</CardTitle>
            <CardDescription className="text-sm">
              Debes iniciar sesión para acceder al checkout.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <Button asChild className="w-full sm:w-auto min-h-[44px]">
              <a href="/login?redirect=/checkout">Ir a iniciar sesión</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const changeType = selectedTier ? getTierChangeType(selectedTier) : null;
  const amount = selectedTier ? calculateAmount(selectedTier) : 0;

  return (
    <div className="min-h-screen bg-admin-bg-primary py-6 sm:py-8 lg:py-12 relative overflow-x-hidden w-full min-w-0">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-admin-accent-primary/5 rounded-full blur-[100px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[25%] h-[25%] bg-admin-accent-secondary/5 rounded-full blur-[100px] animate-premium-float"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      <div className="max-w-5xl mx-auto relative z-10 space-y-8 sm:space-y-10 lg:space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <Badge
            variant="outline"
            className="px-3 sm:px-4 py-1 border-admin-accent-primary/20 bg-admin-accent-primary/5 text-admin-accent-primary rounded-xl font-display font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em]"
          >
            Protocolo de Pago Seguro
          </Badge>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
            Gestionar{" "}
            <span className="text-admin-accent-primary">suscripción</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] font-serif italic text-admin-text-tertiary uppercase tracking-[0.3em] sm:tracking-[0.5em] max-w-2xl mx-auto px-2">
            Potenciando su Óptica con Excelencia Tecnológica
          </p>
        </div>

        {currentSubscription?.currentTier && (
          <Card
            variant="glass"
            className="border-admin-accent-secondary/20 bg-admin-bg-secondary/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-premium-lg animate-in zoom-in-95 duration-700 overflow-hidden"
          >
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="p-2.5 sm:p-3 bg-admin-accent-secondary/10 rounded-xl border border-admin-accent-secondary/20 shrink-0">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-admin-accent-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] sm:text-[10px] font-display font-black text-admin-accent-secondary uppercase tracking-[0.2em] leading-none mb-1 sm:mb-2">
                    Nivel de Acceso Actual
                  </p>
                  <p className="font-display font-bold text-admin-text-primary text-base sm:text-xl uppercase tracking-tight break-words">
                    {tierLabels[currentSubscription.currentTier]}
                    {currentSubscription.subscription?.currentPeriodEnd && (
                      <span className="text-[10px] sm:text-[11px] font-serif italic text-admin-text-tertiary normal-case ml-0 sm:ml-3 block sm:inline mt-1 sm:mt-0 tracking-normal">
                        • Vigente hasta el{" "}
                        {new Date(
                          currentSubscription.subscription.currentPeriodEnd,
                        ).toLocaleDateString("es-CL", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <Badge className="bg-admin-success text-admin-text-on-dark border border-admin-success/30 rounded-xl font-display font-black text-[9px] sm:text-[10px] tracking-widest px-3 sm:px-4 py-1 shrink-0">
                ACTIVO
              </Badge>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
          {/* Main Selection Column */}
          <div className="lg:col-span-12 space-y-6 sm:space-y-8 lg:space-y-10 min-w-0">
            {/* 1. Tier Selection Section */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-admin-accent-primary text-[#1A2B23] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                  1
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-admin-text-primary">
                  Selecciona tu Plan
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {tiers.map((tier) => {
                  const tierName = tier.name as SubscriptionTier;
                  const isSelected = selectedTier === tierName;
                  const tierChange = getTierChangeType(tierName);
                  const isCurrent =
                    currentSubscription?.currentTier === tierName;
                  const config = TIER_LIMITS[tierName];

                  return (
                    <button
                      key={tier.name}
                      type="button"
                      onClick={() => handleTierSelect(tierName)}
                      className={cn(
                        "relative flex flex-col p-5 sm:p-6 md:p-8 rounded-xl border-2 text-left transition-all duration-500 group hover:scale-[1.02] active:scale-[0.98] min-w-0",
                        isSelected
                          ? "border-admin-accent-primary bg-epoch-accent/10 shadow-premium-xl ring-4 ring-admin-accent-primary/5"
                          : "border-admin-border-primary/20 bg-admin-bg-secondary/40 hover:border-admin-accent-primary/40",
                        isCurrent && "opacity-60",
                      )}
                    >
                      {isCurrent && (
                        <div className="absolute -top-2.5 sm:-top-3 left-4 sm:left-6 px-3 sm:px-4 py-1 sm:py-1.5 bg-admin-accent-secondary text-[#1A2B23] text-[8px] sm:text-[9px] font-display font-black rounded-xl uppercase tracking-widest shadow-lg border border-admin-accent-secondary/20">
                          Plan Actual
                        </div>
                      )}

                      <div className="flex flex-col h-full space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-start w-full gap-2">
                          <div className="min-w-0 flex-1">
                            <h3 className="text-base sm:text-lg md:text-xl font-black text-admin-text-primary uppercase tracking-tight">
                              {tierLabels[tier.name]}
                            </h3>
                            <p className="text-xs sm:text-sm font-medium text-admin-text-secondary">
                              {config.max_branches} Sedes / {config.max_users}{" "}
                              Colab.
                            </p>
                          </div>
                          <div
                            className={cn(
                              "w-5 h-5 sm:w-6 sm:h-6 rounded-xl border-2 flex items-center justify-center transition-all duration-500 shrink-0",
                              isSelected
                                ? "border-admin-accent-primary bg-admin-accent-primary text-[#1A2B23]"
                                : "border-admin-border-primary/30",
                            )}
                          >
                            {isSelected && (
                              <Check
                                className="h-3 w-3 sm:h-4 sm:w-4"
                                strokeWidth={4}
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl sm:text-3xl font-black text-admin-text-primary">
                            ${Number(tier.price_monthly).toLocaleString()}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-admin-text-tertiary uppercase">
                            /mes
                          </span>
                        </div>

                        <div className="pt-3 sm:pt-4 border-t border-admin-border-primary space-y-1.5 sm:space-y-2">
                          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-admin-text-tertiary">
                            <CheckCircle className="h-3 w-3 shrink-0 text-admin-success" />
                            <span>
                              Soporte{" "}
                              {tierName === "premium" ? "Directo" : "Premium"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-semibold text-admin-text-tertiary">
                            <CheckCircle className="h-3 w-3 shrink-0 text-admin-success" />
                            <span>Gestión de Inventario</span>
                          </div>
                        </div>

                        {isSelected &&
                          tierChange !== "same" &&
                          tierChange !== "new" && (
                            <div className="mt-auto pt-3 sm:pt-4">
                              <Badge
                                variant={
                                  tierChange === "upgrade"
                                    ? "default"
                                    : "secondary"
                                }
                                className="w-full justify-center py-1.5 rounded-xl font-bold text-[10px] sm:text-xs"
                              >
                                {tierChange === "upgrade" ? (
                                  <>
                                    <ArrowUp className="h-3 w-3 mr-1 shrink-0" />{" "}
                                    Upgrade Prorrateado
                                  </>
                                ) : (
                                  <>
                                    <ArrowDown className="h-3 w-3 mr-1 shrink-0" />{" "}
                                    Downgrade
                                  </>
                                )}
                              </Badge>
                            </div>
                          )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Payment Method Selection */}
            <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700 delay-200">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-admin-accent-primary text-[#1A2B23] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                  2
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-admin-text-primary">
                  Método de Pago
                </h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {availableGateways.length === 0 ? (
                  <div className="col-span-full py-10 text-center bg-admin-bg-secondary rounded-xl border-2 border-dashed border-admin-border-primary">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-admin-text-tertiary mb-2" />
                    <p className="text-admin-text-tertiary font-bold uppercase text-[10px] tracking-widest">
                      Cargando pasarelas disponibles...
                    </p>
                  </div>
                ) : (
                  availableGateways.map((gw) => (
                    <button
                      key={gw.gateway_id}
                      type="button"
                      onClick={() => setSelectedGateway(gw.gateway_id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 rounded-xl border-2 transition-all duration-500 group relative min-w-0",
                        selectedGateway === gw.gateway_id
                          ? "border-admin-accent-primary bg-epoch-accent/10 shadow-premium-xl ring-4 ring-admin-accent-primary/5"
                          : "border-admin-border-primary/10 bg-admin-bg-secondary/40 hover:border-admin-accent-primary/30",
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center mb-2 sm:mb-3 transition-colors shrink-0",
                          selectedGateway === gw.gateway_id
                            ? "bg-admin-accent-primary/10 text-admin-accent-primary"
                            : "bg-admin-bg-tertiary text-admin-text-tertiary group-hover:text-admin-accent-primary/60",
                        )}
                      >
                        {gw.gateway_id === "mercadopago" && (
                          <Globe className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        )}
                        {gw.gateway_id === "paypal" && (
                          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        )}
                        {gw.gateway_id === "nowpayments" && (
                          <Coins className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        )}
                        {gw.gateway_id === "flow" && (
                          <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 md:h-8 md:w-8" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-bold transition-colors text-xs sm:text-sm text-center truncate w-full",
                          selectedGateway === gw.gateway_id
                            ? "text-admin-text-primary"
                            : "text-admin-text-tertiary",
                        )}
                      >
                        {gw.name}
                      </span>
                      {gw.config?.badge && (
                        <Badge
                          variant="healty"
                          className={cn(
                            "mt-1 sm:mt-2 border-none px-2 py-0 text-[9px] sm:text-[10px] font-black uppercase tracking-wider",
                            gw.config.badge === "PROXIMAMENTE" ||
                              gw.config.badge === "PRÓXIMAMENTE"
                              ? "bg-admin-border-primary text-admin-text-tertiary"
                              : "bg-admin-success/10 text-admin-success",
                          )}
                        >
                          {gw.config.badge}
                        </Badge>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* 3. Finalization Section */}
            <div className="space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-admin-accent-primary text-[#1A2B23] flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                  3
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-admin-text-primary">
                  Resumen y Pago
                </h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Left: Summary and Security */}
                <div className="space-y-4 sm:space-y-6 min-w-0">
                  <Card className="border-2 border-admin-accent-primary bg-epoch-accent/10 shadow-premium-xl rounded-xl sm:rounded-2xl relative overflow-hidden min-w-0">
                    <div className="absolute top-0 left-0 w-full h-1 bg-admin-accent-primary" />
                    <CardHeader className="p-4 sm:p-6 md:p-8 pb-0">
                      <CardTitle className="text-[9px] sm:text-[10px] font-display font-black text-admin-accent-primary uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                        Resumen de Transacción
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center gap-2 text-[9px] sm:text-[10px] font-display font-black uppercase tracking-widest min-w-0">
                          <span className="text-admin-text-tertiary shrink-0">
                            Plan Seleccionado
                          </span>
                          <span className="text-admin-text-primary border-b border-admin-accent-primary/30 pb-1 truncate text-right">
                            {selectedTier
                              ? tierLabels[selectedTier]
                              : "No seleccionado"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-2 text-[9px] sm:text-[10px] font-display font-black uppercase tracking-widest min-w-0">
                          <span className="text-admin-text-tertiary">
                            Ciclo de Facturación
                          </span>
                          <span className="text-admin-text-primary">
                            Mensual
                          </span>
                        </div>
                        <div className="pt-4 sm:pt-6 border-t border-admin-border-primary/10 flex justify-between items-end">
                          <div className="min-w-0">
                            <p className="text-[8px] sm:text-[9px] font-display font-black text-admin-accent-secondary uppercase tracking-[0.2em] sm:tracking-[0.3em] mb-1">
                              Total a Finalizar
                            </p>
                            <p className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-admin-accent-primary tracking-tighter">
                              ${amount.toLocaleString()}{" "}
                              <span className="text-xs sm:text-sm">CLP</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      {!paymentId && (
                        <div className="pt-2 sm:pt-4">
                          <Button
                            onClick={handleCreateIntent}
                            disabled={!selectedTier || processing}
                            className="w-full min-h-[48px] sm:h-14 md:h-16 bg-admin-accent-primary text-[#1A2B23] hover:bg-admin-accent-secondary rounded-xl font-display font-black text-[10px] sm:text-[11px] md:text-[12px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shadow-premium-sm px-4"
                          >
                            {processing ? (
                              <>
                                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 animate-spin shrink-0" />
                                <span className="truncate">
                                  Sincronizando Seguridad...
                                </span>
                              </>
                            ) : (
                              <>
                                {selectedGateway === "nowpayments" ? (
                                  <Coins className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 shrink-0" />
                                ) : selectedGateway === "paypal" ? (
                                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 shrink-0" />
                                ) : (
                                  <Lock className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 shrink-0" />
                                )}
                                <span className="truncate">
                                  {selectedGateway === "nowpayments"
                                    ? "Pagar con Criptografía"
                                    : selectedGateway === "paypal"
                                      ? "Finalizar con PayPal"
                                      : "Finalizar Pago Seguro"}
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Security Highlights */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <div className="p-4 sm:p-5 md:p-6 bg-admin-bg-secondary/60 rounded-xl border border-admin-border-primary/10 flex items-center gap-3 sm:gap-4 transition-all hover:bg-admin-bg-secondary min-w-0">
                      <div className="p-2 sm:p-3 bg-admin-success/10 rounded-xl border border-admin-success/20 shrink-0">
                        <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-admin-success" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-display font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-admin-text-tertiary mb-0.5 sm:mb-1">
                          Estándar Global
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-tight break-words">
                          PCI-DSS Compliant
                        </p>
                      </div>
                    </div>
                    <div className="p-4 sm:p-5 md:p-6 bg-admin-bg-secondary/60 rounded-xl border border-admin-border-primary/10 flex items-center gap-3 sm:gap-4 transition-all hover:bg-admin-bg-secondary min-w-0">
                      <div className="p-2 sm:p-3 bg-admin-accent-secondary/10 rounded-xl border border-admin-accent-secondary/20 shrink-0">
                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-admin-accent-secondary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[8px] sm:text-[9px] font-display font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-admin-text-tertiary mb-0.5 sm:mb-1">
                          Encriptación
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-display font-bold text-admin-text-primary uppercase tracking-tight break-words">
                          SSL 256-bit Secure
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Payment Brick or Selection Guide */}
                <div className="w-full min-w-0">
                  {!paymentId ? (
                    <div className="h-full min-h-[280px] sm:min-h-[350px] md:min-h-[400px] border-4 border-dashed border-admin-border-primary rounded-xl flex flex-col items-center justify-center p-6 sm:p-8 md:p-10 text-center space-y-3 sm:space-y-4">
                      <div className="p-4 sm:p-6 bg-admin-bg-secondary rounded-xl">
                        <Star className="h-8 w-8 sm:h-10 sm:w-10 text-admin-text-tertiary" />
                      </div>
                      <div className="min-w-0 px-2">
                        <h4 className="text-base sm:text-lg md:text-xl font-bold text-admin-text-tertiary">
                          Completa los pasos anteriores
                        </h4>
                        <p className="text-admin-text-tertiary text-xs sm:text-sm max-w-xs mx-auto mt-1">
                          Selecciona tu plan ideal
                          {selectedGateway !== "mercadopago"
                            ? " para ser redirigido a la pasarela de pago seleccionada."
                            : " para desbloquear el formulario de pago seguro."}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Card
                      variant="glass"
                      className="border-2 border-admin-border-secondary dark:border-admin-border-primary shadow-2xl bg-admin-bg-tertiary rounded-xl sm:rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 min-w-0"
                    >
                      <CardHeader className="p-4 sm:p-5 md:p-6 border-b border-admin-border-secondary dark:border-admin-border-primary bg-admin-bg-tertiary">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 sm:p-2.5 bg-admin-accent-primary rounded-xl text-[#1A2B23] shrink-0">
                            <CreditCard className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm sm:text-base md:text-lg font-bold text-admin-text-primary">
                              Datos de la Tarjeta
                            </CardTitle>
                            <CardDescription className="text-[11px] sm:text-xs text-admin-text-tertiary mt-0.5">
                              Pago procesado por Mercado Pago
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 sm:p-5 md:p-6 bg-admin-bg-tertiary">
                        {error && (
                          <Alert
                            variant="destructive"
                            className="mb-4 sm:mb-5 rounded-xl border border-admin-error/30 bg-admin-error/10 dark:bg-admin-error/20"
                          >
                            <AlertCircle className="h-4 w-4 shrink-0 text-admin-error" />
                            <AlertDescription className="font-bold text-sm break-words text-admin-error dark:text-red-400">
                              {error}
                            </AlertDescription>
                          </Alert>
                        )}

                        <div className="p-3 sm:p-4 rounded-xl mb-4 sm:mb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 min-w-0 bg-white/80 dark:bg-admin-bg-secondary/40 border border-admin-border-secondary dark:border-admin-border-primary/50">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-admin-info animate-pulse shrink-0" />
                            <span className="text-[10px] sm:text-xs font-bold text-admin-text-secondary uppercase tracking-widest">
                              Sesión de pago activa
                            </span>
                          </div>
                          <span className="text-base sm:text-lg font-black text-admin-text-primary">
                            ${amount.toLocaleString()} CLP
                          </span>
                        </div>

                        <label className="flex items-start sm:items-center gap-3 mb-4 sm:mb-5 p-3 sm:p-4 rounded-xl border border-admin-border-secondary dark:border-admin-border-primary bg-white/60 dark:bg-admin-bg-secondary/30 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={saveCard}
                            onChange={(e) => setSaveCard(e.target.checked)}
                            className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary shrink-0 mt-0.5 sm:mt-0"
                          />
                          <span className="text-xs sm:text-sm font-medium text-admin-text-primary break-words">
                            Guardar tarjeta para próximos pagos y renovaciones
                          </span>
                        </label>

                        <div className="mercadopago-brick-container min-h-[260px] sm:min-h-[300px] rounded-xl overflow-hidden">
                          <CardPayment
                            initialization={{
                              amount: Math.round(amount),
                              ...(user?.email && {
                                payer: { email: user.email },
                              }),
                            }}
                            onSubmit={async (formData) => {
                              await handlePaymentSubmit(formData);
                            }}
                            customization={{
                              paymentMethods: {
                                // Default is all
                              },
                              visual: {
                                style: {
                                  theme: "flat",
                                },
                              },
                            }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Security Badge */}
        <div className="pt-6 sm:pt-8 lg:pt-10 border-t border-admin-border-primary flex flex-col items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6 md:gap-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 flex-wrap justify-center">
            <Globe className="h-6 w-6 sm:h-8 sm:w-8" />
            <div className="h-4 sm:h-6 w-px bg-admin-border-primary hidden sm:block" />
            <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8" />
            <div className="h-4 sm:h-6 w-px bg-admin-border-primary hidden sm:block" />
            <span className="text-base sm:text-lg md:text-xl font-black tracking-tighter italic">
              OPTTIUS
              <span className="text-admin-accent-primary not-italic">SAFE</span>
            </span>
          </div>
          <p className="text-[9px] sm:text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest text-center px-2">
            © {new Date().getFullYear()} Opttius Technology. Pagos procesados
            de forma segura mediante pasarelas PCI-DSS.
          </p>
        </div>
      </div>
    </div>
  );
}
