"use client";

import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { type SubscriptionTier } from "@/lib/saas/tier-config";

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

interface CheckoutCurrentPlanProps {
  currentSubscription: CurrentSubscription;
  tierLabels: Record<string, string>;
}

export function CheckoutCurrentPlan({
  currentSubscription,
  tierLabels,
}: CheckoutCurrentPlanProps) {
  return (
    <Card
      className="border-admin-accent-secondary/20 bg-admin-bg-secondary/80 backdrop-blur-md rounded-xl sm:rounded-2xl shadow-premium-lg animate-in zoom-in-95 duration-700 overflow-hidden"
      variant="glass"
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
              {tierLabels[currentSubscription.currentTier ?? ""]}
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
  );
}
