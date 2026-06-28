"use client";

import { Coins, CreditCard, Globe, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CheckoutPaymentSectionProps {
  availableGateways: unknown[];
  selectedGateway: string;
  onGatewayChange: (gateway: string) => void;
}

export function CheckoutPaymentSection({
  availableGateways,
  selectedGateway,
  onGatewayChange,
}: CheckoutPaymentSectionProps) {
  return (
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
        {(availableGateways as Array<Record<string, unknown>>).length === 0 ? (
          <div className="col-span-full py-10 text-center bg-admin-bg-secondary rounded-xl border-2 border-dashed border-admin-border-primary">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-admin-text-tertiary mb-2" />
            <p className="text-admin-text-tertiary font-bold uppercase text-[10px] tracking-widest">
              Cargando pasarelas disponibles...
            </p>
          </div>
        ) : (
          (availableGateways as Array<Record<string, unknown>>).map((gw) => (
            <button
              className={cn(
                "flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 rounded-xl border-2 transition-all duration-500 group relative min-w-0",
                selectedGateway === gw.gateway_id
                  ? "border-admin-accent-primary bg-epoch-accent/10 shadow-premium-xl ring-4 ring-admin-accent-primary/5"
                  : "border-admin-border-primary/10 bg-admin-bg-secondary/40 hover:border-admin-accent-primary/30",
              )}
              key={gw.gateway_id as string}
              type="button"
              onClick={() => onGatewayChange(gw.gateway_id as string)}
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
                {gw.name as string}
              </span>
              {(gw.config as Record<string, string>)?.badge && (
                <Badge
                  className={cn(
                    "mt-1 sm:mt-2 border-none px-2 py-0 text-[9px] sm:text-[10px] font-black uppercase tracking-wider",
                    (gw.config as Record<string, string>).badge === "PROXIMAMENTE" ||
                      (gw.config as Record<string, string>).badge === "PRÓXIMAMENTE"
                      ? "bg-admin-border-primary text-admin-text-tertiary"
                      : "bg-admin-success/10 text-admin-success",
                  )}
                  variant="healty"
                >
                  {(gw.config as Record<string, string>).badge}
                </Badge>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
