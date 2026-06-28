"use client";

import { Badge } from "@/components/ui/badge";

export function CheckoutHeader() {
  return (
    <>
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-admin-accent-primary/5 rounded-full blur-[100px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[25%] h-[25%] bg-admin-accent-secondary/5 rounded-full blur-[100px] animate-premium-float"
          style={{ animationDelay: "-3s" }}
        />
      </div>

      {/* Header Section */}
      <div className="text-center space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <Badge
          className="px-3 sm:px-4 py-1 border-admin-accent-primary/20 bg-admin-accent-primary/5 text-admin-accent-primary rounded-xl font-display font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.3em]"
          variant="outline"
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
    </>
  );
}
