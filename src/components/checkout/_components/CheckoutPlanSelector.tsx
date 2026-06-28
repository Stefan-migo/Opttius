"use client";

import { ArrowDown, ArrowUp, Check, CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { type SubscriptionTier, TIER_LIMITS } from "@/lib/saas/tier-config";
import { cn } from "@/lib/utils";

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

interface CheckoutPlanSelectorProps {
  tiers: Tier[];
  selectedTier: SubscriptionTier | null;
  currentSubscription: CurrentSubscription | null;
  tierLabels: Record<string, string>;
  tierOrder: SubscriptionTier[];
  getTierChangeType: (tier: SubscriptionTier) => "upgrade" | "downgrade" | "same" | "new";
  onTierSelect: (tier: SubscriptionTier) => void;
}

export function CheckoutPlanSelector({
  tiers,
  selectedTier,
  currentSubscription,
  tierLabels,
  tierOrder,
  getTierChangeType,
  onTierSelect,
}: CheckoutPlanSelectorProps) {
  return (
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
              className={cn(
                "relative flex flex-col p-5 sm:p-6 md:p-8 rounded-xl border-2 text-left transition-all duration-500 group hover:scale-[1.02] active:scale-[0.98] min-w-0",
                isSelected
                  ? "border-admin-accent-primary bg-epoch-accent/10 shadow-premium-xl ring-4 ring-admin-accent-primary/5"
                  : "border-admin-border-primary/20 bg-admin-bg-secondary/40 hover:border-admin-accent-primary/40",
                isCurrent && "opacity-60",
              )}
              key={tier.name}
              type="button"
              onClick={() => onTierSelect(tierName)}
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
                        className="w-full justify-center py-1.5 rounded-xl font-bold text-[10px] sm:text-xs"
                        variant={
                          tierChange === "upgrade"
                            ? "default"
                            : "secondary"
                        }
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
  );
}
