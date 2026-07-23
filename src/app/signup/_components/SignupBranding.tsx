"use client";

import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import Link from "next/link";

export function SignupBrandingSide() {
  return (
    <div className="relative hidden lg:flex lg:w-5/12 xl:w-1/2 overflow-hidden items-center justify-center bg-epoch-primary">
      <div className="absolute inset-0 z-0">
        <Image fill priority alt="Elite Setup" className="object-cover opacity-20 grayscale" sizes="(max-width: 1024px) 100vw, 50vw" src="/images/landing/Hero.webp" />
        <div className="absolute inset-0 bg-gradient-to-br from-epoch-primary via-epoch-primary/80 to-epoch-accent/10" />
      </div>
      <div className="relative z-10 p-20 w-full h-full flex flex-col justify-between">
        <Link className="group flex flex-col items-start w-fit" href="/">
          <div className="relative mb-1 group-hover:scale-110 transition-transform duration-500"><Image alt="Opttius" className="h-14 w-48 opacity-100 object-contain object-left" height={56} src="/logo-text-default.svg" width={192} /></div>
        </Link>
        <div className="space-y-12 animate-in fade-in slide-in-from-left-10 duration-1000">
          <div className="space-y-6">
            <Badge className="bg-epoch-accent/20 text-epoch-accent border-epoch-accent/30 rounded-xl px-4 py-1 text-[10px] uppercase font-display tracking-[0.3em]">Registro</Badge>
            <h2 className="text-6xl xl:text-7xl font-display font-bold text-white leading-tight tracking-tight">Diseña el futuro<br /><span className="text-epoch-accent italic font-serif lowercase tracking-normal">de tu óptica</span></h2>
            <p className="text-xl text-white/60 font-serif italic tracking-wide max-w-lg leading-relaxed">Únete a las ópticas que ya gestionan su negocio con tecnología pensada para el sector.</p>
          </div>
          <div className="space-y-4">
            {["Infraestructura de alta seguridad", "Inteligencia visual predictiva", "Acompañamiento especializado"].map((item, i) => (
              <div className="flex items-center gap-4 text-white/80 font-display text-[10px] uppercase tracking-[0.2em]" key={i}><div className="w-1.5 h-[1px] bg-epoch-accent" />{item}</div>
            ))}
          </div>
        </div>
        <div className="text-[9px] font-display font-bold text-white/30 uppercase tracking-[0.4em]">© OPTTIUS ELITE SERVICES</div>
      </div>
    </div>
  );
}

export function SignupSuccessView({ requiresEmailConfirmation, onGoToLogin, onContinue }: { requiresEmailConfirmation: boolean; onGoToLogin: () => void; onContinue: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-epoch-background p-6 relative overflow-hidden">
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-epoch-accent/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-epoch-primary/5 rounded-full blur-[120px]" />
      </div>
      <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-700 rounded-3xl overflow-hidden">
        <div className="overflow-hidden rounded-3xl shadow-2xl border-0 bg-epoch-primary">
          <div className="bg-epoch-primary p-6 sm:p-10 text-center">
            <div className="relative mx-auto mb-6 flex justify-center"><Image alt="Opttius" className="h-24 w-28 object-contain" height={227} src="/logoYopttius.png" width={248} /></div>
            <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-epoch-accent/40 rounded-full mb-6"><svg className="h-10 w-10 text-epoch-accent stroke-[1.5px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.5 12.75l6 6 9-13.5" /></svg></div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mb-2">Bienvenido al Nuevo Estándar</h1>
            <p className="text-white/95 font-serif italic text-base uppercase tracking-[0.2em]">Registro Exitoso</p>
          </div>
          <div className="p-6 sm:p-10 text-center bg-epoch-primary border-t border-white/10">
            {requiresEmailConfirmation ? (
              <div className="space-y-6 sm:space-y-8">
                <p className="text-[15px] font-serif italic text-white/90 leading-relaxed">Su óptica está a un paso de la automatización. Revise su bandeja de entrada y active su cuenta para comenzar.</p>
                <button onClick={onGoToLogin} className="w-full min-h-14 sm:h-16 px-4 overflow-hidden bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary rounded-xl font-display font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-2 py-3 sm:py-4"><span>REGRESAR AL ACCESO</span><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></button>
              </div>
            ) : (
              <div className="space-y-6 sm:space-y-8">
                <p className="text-[15px] font-serif italic text-white/90 leading-relaxed">Su cuenta ha sido creada. Redirigiéndole a la configuración inicial...</p>
                <button onClick={onContinue} className="w-full min-h-14 sm:h-16 px-4 overflow-hidden bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary rounded-xl font-display font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.3em] transition-all shadow-xl flex items-center justify-center gap-2 py-3 sm:py-4"><span>CONTINUAR</span><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg></button>
              </div>
            )}
          </div>
        </div>
        <p className="mt-12 text-center text-[10px] font-body text-epoch-primary/50">© 2026 Opttius. Ingeniería clínica para ópticas.</p>
      </div>
    </div>
  );
}
