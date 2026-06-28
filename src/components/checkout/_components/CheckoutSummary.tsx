"use client";

import { CardPayment } from "@mercadopago/sdk-react";
import {
  AlertCircle,
  Coins,
  CreditCard,
  Globe,
  Loader2,
  Lock,
  ShieldCheck,
  Star,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { type SubscriptionTier } from "@/lib/saas/tier-config";
import { cn } from "@/lib/utils";

interface CheckoutSummaryProps {
  selectedTier: SubscriptionTier | null;
  tierLabels: Record<string, string>;
  amount: number;
  selectedGateway: string;
  paymentId: string | null;
  processing: boolean;
  error: string | null;
  saveCard: boolean;
  onSaveCardChange: (value: boolean) => void;
  onCreateIntent: () => void;
  onPaymentSubmit: (formData: {
    token: string;
    payment_method_id?: string;
    issuer_id?: string;
    payer?: { email?: string };
  }) => Promise<void>;
  userEmail?: string;
}

export function CheckoutSummary({
  selectedTier,
  tierLabels,
  amount,
  selectedGateway,
  paymentId,
  processing,
  error,
  saveCard,
  onSaveCardChange,
  onCreateIntent,
  onPaymentSubmit,
  userEmail,
}: CheckoutSummaryProps) {
  return (
    <>
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
                    <span className="text-admin-text-primary">Mensual</span>
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
                      className="w-full min-h-[48px] sm:h-14 md:h-16 bg-admin-accent-primary text-[#1A2B23] hover:bg-admin-accent-secondary rounded-xl font-display font-black text-[10px] sm:text-[11px] md:text-[12px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shadow-premium-sm px-4"
                      disabled={!selectedTier || processing}
                      onClick={onCreateIntent}
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
                className="border-2 border-admin-border-secondary dark:border-admin-border-primary shadow-2xl bg-admin-bg-tertiary rounded-xl sm:rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500 min-w-0"
                variant="glass"
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
                      className="mb-4 sm:mb-5 rounded-xl border border-admin-error/30 bg-admin-error/10 dark:bg-admin-error/20"
                      variant="destructive"
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
                      checked={saveCard}
                      className="rounded border-admin-border-primary text-admin-accent-primary focus:ring-admin-accent-primary shrink-0 mt-0.5 sm:mt-0"
                      type="checkbox"
                      onChange={(e) => onSaveCardChange(e.target.checked)}
                    />
                    <span className="text-xs sm:text-sm font-medium text-admin-text-primary break-words">
                      Guardar tarjeta para próximos pagos y renovaciones
                    </span>
                  </label>

                  <div className="mercadopago-brick-container min-h-[260px] sm:min-h-[300px] rounded-xl overflow-hidden">
                    <CardPayment
                      customization={{
                        paymentMethods: {},
                        visual: {
                          style: {
                            theme: "flat",
                          },
                        },
                      }}
                      initialization={{
                        amount: Math.round(amount),
                        ...(userEmail && {
                          payer: { email: userEmail },
                        }),
                      }}
                      onSubmit={async (formData) => {
                        await onPaymentSubmit(formData);
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
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
    </>
  );
}
