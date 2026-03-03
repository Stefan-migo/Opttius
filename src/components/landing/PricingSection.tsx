"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Loader2 } from "lucide-react";

type TierName = "basic" | "pro" | "premium";

interface TierFromApi {
  name: TierName;
  price_monthly: number;
  max_branches?: number | null;
  max_users?: number | null;
  max_customers?: number | null;
  max_products?: number | null;
  features?: Record<string, boolean> | null;
}

const DEFAULT_PRICES: Record<TierName, number> = {
  basic: 49,
  pro: 99,
  premium: 299,
};

/** Mapeo de feature keys a etiquetas para la landing (sincronizado con /admin/saas-management/tiers) */
const FEATURE_LABELS: Record<string, string> = {
  pos: "Punto de Venta",
  appointments: "Citas y Agenda",
  quotes: "Presupuestos",
  work_orders: "Trabajos de Laboratorio",
  prescriptions: "Libro Digital de Recetas",
  custom_branding: "Personalización de marca",
  chat_ia: "Asistente IA 24/7",
  advanced_analytics: "Reportes ejecutivos",
  field_operations: "Operativos en Terreno",
  agreements: "Gestión de Convenios",
  whatsapp: "WhatsApp Business",
};

/** Fallback para displayName y description cuando no vienen de la API */
const TIER_DISPLAY: Record<
  TierName,
  { displayName: string; description: string; popular: boolean }
> = {
  basic: {
    displayName: "Clínica Base",
    description: "Para ópticas que inician su transformación digital.",
    popular: false,
  },
  pro: {
    displayName: "Óptica Avanzada",
    description: "Todo lo que necesitas: IA, operativos, convenios y WhatsApp.",
    popular: true,
  },
  premium: {
    displayName: "Red Óptica",
    description: "Control total para grandes cadenas y laboratorios.",
    popular: false,
  },
};

function buildFeaturesFromTier(tier: TierFromApi): string[] {
  const features: string[] = [];

  // Límites formateados
  const maxBranches = tier.max_branches ?? 0;
  const maxUsers = tier.max_users ?? 0;
  const maxCustomers = tier.max_customers ?? 0;
  const maxProducts = tier.max_products ?? 0;

  features.push(
    maxBranches === 0
      ? "Sucursales ilimitadas"
      : `${maxBranches} sucursal${maxBranches > 1 ? "es" : ""}`,
  );
  features.push(
    maxUsers === 0
      ? "Usuarios ilimitados"
      : `Hasta ${maxUsers.toLocaleString()} usuarios`,
  );
  features.push(
    maxCustomers === 0
      ? "Pacientes ilimitados"
      : `Hasta ${maxCustomers.toLocaleString()} pacientes`,
  );

  if (maxProducts > 0) {
    features.push(`Hasta ${maxProducts.toLocaleString()} productos`);
  } else if (tier.name === "premium") {
    features.push("Productos ilimitados");
  }

  // Features habilitados del tier (desde subscription_tiers.features)
  const tierFeatures = tier.features || {};
  for (const [key, enabled] of Object.entries(tierFeatures)) {
    if (enabled && FEATURE_LABELS[key]) {
      features.push(FEATURE_LABELS[key]);
    }
  }

  return features;
}

const TIER_ORDER: TierName[] = ["basic", "pro", "premium"];

export function PricingSection() {
  const router = useRouter();
  const [tiers, setTiers] = useState<TierFromApi[]>([]);
  const [trialDays, setTrialDays] = useState<number>(7);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/landing/tiers?_=${Date.now()}`, {
      cache: "no-store",
      headers: { Pragma: "no-cache" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) return; // API error, use fallback
        if (data.trial_days != null) {
          const parsed = parseInt(String(data.trial_days), 10);
          if (!isNaN(parsed) && parsed > 0) setTrialDays(parsed);
        }
        if (!data.tiers?.length) return;
        const ordered = TIER_ORDER.map((name) => {
          const row = data.tiers.find((t: TierFromApi) => t.name === name);
          if (!row)
            return {
              name,
              price_monthly: DEFAULT_PRICES[name],
              features: {},
            } as TierFromApi;
          const price = Number(row.price_monthly);
          return {
            ...row,
            name: row.name as TierName,
            price_monthly: Number.isFinite(price)
              ? price
              : DEFAULT_PRICES[name],
          };
        }).filter(Boolean) as TierFromApi[];
        setTiers(ordered);
      })
      .catch(() => {
        if (!cancelled) {
          setTiers([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGetStarted = () => {
    router.push("/solicitar-demo");
  };

  const formatPrice = (value: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const plans =
    tiers.length > 0
      ? tiers.map((t) => ({
          ...TIER_DISPLAY[t.name as TierName],
          features: buildFeaturesFromTier(t),
          price: formatPrice(Math.round(Number(t.price_monthly))),
          period: "mes",
        }))
      : TIER_ORDER.map((name) => {
          const fallbackTiers: Record<
            TierName,
            {
              max_branches: number;
              max_users: number;
              max_customers: number;
              max_products: number;
              features: Record<string, boolean>;
            }
          > = {
            basic: {
              max_branches: 1,
              max_users: 2,
              max_customers: 200,
              max_products: 100,
              features: {
                pos: true,
                appointments: true,
                quotes: true,
                work_orders: true,
                prescriptions: true,
                custom_branding: true,
              },
            },
            pro: {
              max_branches: 4,
              max_users: 8,
              max_customers: 2000,
              max_products: 500,
              features: {
                pos: true,
                appointments: true,
                quotes: true,
                work_orders: true,
                prescriptions: true,
                custom_branding: true,
                chat_ia: true,
                advanced_analytics: true,
                field_operations: true,
                agreements: true,
                whatsapp: true,
              },
            },
            premium: {
              max_branches: 20,
              max_users: 50,
              max_customers: 0,
              max_products: 0,
              features: {
                pos: true,
                appointments: true,
                quotes: true,
                work_orders: true,
                prescriptions: true,
                custom_branding: true,
                chat_ia: true,
                advanced_analytics: true,
                field_operations: true,
                agreements: true,
                whatsapp: true,
              },
            },
          };
          const fb = fallbackTiers[name];
          return {
            ...TIER_DISPLAY[name],
            features: buildFeaturesFromTier({
              name,
              price_monthly: DEFAULT_PRICES[name],
              ...fb,
            }),
            price: formatPrice(DEFAULT_PRICES[name]),
            period: "mes",
          };
        });

  return (
    <section id="precios" className="py-20 sm:py-32 bg-epoch-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-24 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-3 px-5 py-2 bg-epoch-primary/10 border border-epoch-primary/40 rounded-full text-epoch-primary text-[10px] sm:text-[11px] font-sans font-semibold tracking-[0.35em] uppercase mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Planes para cada óptica</span>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-cormorant text-epoch-primary mb-6">
            El plan que su óptica{" "}
            <span className="text-epoch-accent italic">necesita</span>
          </h2>
          <p className="text-lg text-epoch-primary/70 font-body">
            Elige el nivel de potencia que tu óptica necesita. Sin contratos
            ocultos.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-epoch-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.displayName}
                className={`relative flex flex-col p-6 sm:p-10 rounded-xl transition-all duration-500 border ${
                  plan.popular
                    ? "bg-white border-epoch-accent shadow-lg shadow-epoch-primary/10 lg:scale-105 z-10"
                    : "bg-white border-epoch-primary/10 hover:border-epoch-primary/20 shadow-sm hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                    <span className="bg-epoch-primary text-white px-6 py-2 rounded-xl text-[10px] font-display font-bold uppercase tracking-widest shadow-lg">
                      Más Solicitado
                    </span>
                  </div>
                )}

                <div className="mb-10">
                  <h3 className="text-2xl font-display font-bold text-epoch-primary mb-3 tracking-tight">
                    {plan.displayName}
                  </h3>
                  <p className="text-epoch-primary/70 text-sm font-body leading-relaxed min-h-[40px]">
                    {plan.description}
                  </p>
                </div>

                <div className="mb-10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-cormorant text-epoch-primary">
                      {plan.price}
                    </span>
                    <span className="text-epoch-primary/60 font-medium">
                      /{plan.period}
                    </span>
                  </div>
                </div>

                <div className="flex-1 mb-10">
                  <p className="text-xs font-display font-bold text-epoch-primary uppercase tracking-widest mb-6">
                    ¿Qué incluye?
                  </p>
                  <ul className="space-y-4">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className="mt-1 h-5 w-5 rounded-xl border border-epoch-accent/30 flex items-center justify-center text-epoch-accent flex-shrink-0">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </div>
                        <span className="text-epoch-primary/80 text-sm font-body leading-tight">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  onClick={handleGetStarted}
                  className={`w-full h-14 rounded-xl font-display font-bold transition-all duration-300 ${
                    plan.popular
                      ? "bg-epoch-primary text-white hover:bg-epoch-surface shadow-md hover:scale-[1.02]"
                      : "bg-epoch-background text-epoch-primary hover:bg-epoch-primary/10 border border-epoch-primary/10"
                  }`}
                  variant={plan.popular ? "default" : "outline"}
                >
                  Comenzar ahora
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-20 text-center max-w-2xl mx-auto space-y-6">
          <p className="text-epoch-primary/70 text-sm font-body leading-relaxed">
            Todos los planes incluyen una prueba gratuita de {trialDays} días
            con acceso total. No se requiere tarjeta de crédito para comenzar.
          </p>
          <p className="text-epoch-primary/60 text-sm font-body leading-relaxed">
            La integración con SII y la conexión con Fonasa e Isapres están
            disponibles bajo solicitud. Contacta directamente a{" "}
            <Link
              href="/support"
              className="text-epoch-primary font-medium underline underline-offset-2 hover:text-epoch-accent transition-colors"
            >
              soporte
            </Link>{" "}
            para solicitar estas características.
          </p>
          <div className="h-px w-20 bg-epoch-primary/20 mx-auto"></div>
        </div>
      </div>
    </section>
  );
}
