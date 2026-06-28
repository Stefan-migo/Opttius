"use client";

import { initMercadoPago } from "@mercadopago/sdk-react";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { type SubscriptionTier, TIER_LIMITS } from "@/lib/saas/tier-config";

import { CheckoutHeader } from "./_components/CheckoutHeader";
import { CheckoutCurrentPlan } from "./_components/CheckoutCurrentPlan";
import { CheckoutPlanSelector } from "./_components/CheckoutPlanSelector";
import { CheckoutPaymentSection } from "./_components/CheckoutPaymentSection";
import { CheckoutSummary } from "./_components/CheckoutSummary";

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
  const [availableGateways, setAvailableGateways] = useState<unknown[]>([]);

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
      <CheckoutHeader />

      <div className="max-w-5xl mx-auto relative z-10 space-y-8 sm:space-y-10 lg:space-y-12">
        {currentSubscription?.currentTier && (
          <CheckoutCurrentPlan
            currentSubscription={currentSubscription}
            tierLabels={tierLabels}
          />
        )}

        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-12 space-y-6 sm:space-y-8 lg:space-y-10 min-w-0">
            <CheckoutPlanSelector
              currentSubscription={currentSubscription}
              getTierChangeType={getTierChangeType}
              onTierSelect={handleTierSelect}
              selectedTier={selectedTier}
              tierLabels={tierLabels}
              tierOrder={tierOrder}
              tiers={tiers}
            />

            <CheckoutPaymentSection
              availableGateways={availableGateways}
              selectedGateway={selectedGateway}
              onGatewayChange={setSelectedGateway}
            />

            <CheckoutSummary
              amount={amount}
              error={error}
              onCreateIntent={handleCreateIntent}
              onPaymentSubmit={handlePaymentSubmit}
              onSaveCardChange={setSaveCard}
              paymentId={paymentId}
              processing={processing}
              saveCard={saveCard}
              selectedGateway={selectedGateway}
              selectedTier={selectedTier}
              tierLabels={tierLabels}
              userEmail={user?.email}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
