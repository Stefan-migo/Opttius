"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

import { SignupBrandingSide, SignupSuccessView } from "./_components/SignupBranding";

const signupSchema = z.object({
  firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
  email: z.string().email("Por favor ingresa un email válido"),
  phone: z.string().optional().or(z.literal("")),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").regex(/[A-Z]/, "Debe contener al menos una mayúscula").regex(/[a-z]/, "Debe contener al menos una minúscula").regex(/[0-9]/, "Debe contener al menos un número"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { message: "Las contraseñas no coinciden", path: ["confirmPassword"] });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/landing/onboarding-config");
        const data = await res.json();
        if (data.signupEnabled === false && searchParams.get("access") !== "opticas") { router.replace("/solicitar-demo"); return; }
      } catch { }
      setConfigChecked(true);
    };
    checkConfig();
  }, [router, searchParams]);

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) });

  const onSubmit = async (data: SignupForm) => {
    try {
      setError(null);
      const result = await signUp(data.email, data.password, { firstName: data.firstName, lastName: data.lastName, phone: data.phone });
      if (result.error) { setError(result.error.message || "Signup failed"); return; }
      const needsConfirm = !result.data?.session && result.data?.user;
      setRequiresEmailConfirmation(needsConfirm);
      setIsSuccess(true);
      if (needsConfirm) {
        try { (await import("@/utils/supabase/client")).createClient().auth.signOut(); } catch { }
        return;
      }
      setTimeout(() => router.push("/onboarding/choice"), 1500);
    } catch (err: any) { setError(err.message || "An error occurred during signup"); }
  };

  if (!configChecked) return <div className="min-h-screen flex items-center justify-center bg-epoch-background"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-epoch-primary" /></div>;
  if (isSuccess) return <SignupSuccessView requiresEmailConfirmation={requiresEmailConfirmation} onGoToLogin={() => router.push("/login")} onContinue={() => router.push("/onboarding/choice")} />;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-epoch-background overflow-hidden relative">
      <SignupBrandingSide />
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 xl:p-24 bg-epoch-background relative z-10 overflow-y-auto">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="mb-12">
            <h1 className="text-5xl font-display font-bold text-epoch-primary tracking-tight leading-none">Cree su cuenta en<br /><span className="text-epoch-accent italic font-serif lowercase tracking-normal">Opttius</span></h1>
            <p className="mt-4 text-epoch-primary/60 font-body text-sm">El sistema de gestión diseñado para su óptica.</p>
          </div>
          <Card className="border-epoch-primary/5 bg-white shadow-2xl rounded-xl">
            <CardContent className="p-8 sm:p-12">
              <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
                {error && <Alert className="bg-red-500/10 border-red-500/20 rounded-xl" variant="destructive"><AlertDescription className="text-red-950 font-serif italic text-xs">{error}</AlertDescription></Alert>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <Field icon={<User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />} label="Nombre" error={errors.firstName}>
                    <Input placeholder="Alejandro" {...register("firstName")} className={cn("h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner", errors.firstName && "border-red-900")} disabled={loading} />
                  </Field>
                  <Field icon={<User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />} label="Apellido" error={errors.lastName}>
                    <Input placeholder="Valdivia" {...register("lastName")} className={cn("h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner", errors.lastName && "border-red-900")} disabled={loading} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <Field icon={<Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />} label="Email Corporativo" error={errors.email}>
                    <Input placeholder="directorio@optica.com" type="email" {...register("email")} className={cn("h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner", errors.email && "border-red-900")} disabled={loading} />
                  </Field>
                  <Field icon={<Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />} label="Teléfono Móvil">
                    <Input placeholder="+1 555-0100" type="tel" {...register("phone")} className="h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner" disabled={loading} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <PasswordField label="Contraseña" error={errors.password} show={showPassword} onToggle={() => setShowPassword(!showPassword)} register={register("password")} disabled={loading} />
                  <PasswordField label="Confirmar contraseña" error={errors.confirmPassword} show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} register={register("confirmPassword")} disabled={loading} />
                </div>
                <Button className="w-full h-16 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.4em] transition-all shadow-xl" disabled={loading} size="lg" type="submit">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <span className="flex items-center gap-3">Crear cuenta<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-3" /></span>}
                </Button>
              </form>
              <div className="mt-12 text-center pt-8 border-t border-epoch-primary/5">
                <p className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest mb-4">¿Ya tiene cuenta?</p>
                <Link className="inline-flex items-center gap-2 text-xs font-display font-bold text-epoch-accent uppercase tracking-[0.2em] hover:text-epoch-primary transition-all group" href="/login">Iniciar sesión<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </CardContent>
          </Card>
          <p className="mt-12 text-center text-[8px] font-display font-bold text-epoch-primary/30 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">Al registrarse en Opttius, usted acepta nuestros <Link className="underline hover:text-epoch-primary" href="#">Términos de uso</Link> y <Link className="underline hover:text-epoch-primary" href="#">Política de Privacidad</Link>.</p>
        </div>
      </div>
    </div>
  );
}

function Field({ children, label, error, icon }: { children: React.ReactNode; label: string; error?: any; icon?: React.ReactNode }) {
  return (<div className="space-y-3"><Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">{label}</Label><div className="relative group">{children}{icon && <div className="pointer-events-none">{icon}</div>}</div>{error && <p className="text-xs text-red-500 ml-1">{error.message}</p>}</div>);
}

function PasswordField({ label, error, show, onToggle, register, disabled }: { label: string; error?: any; show: boolean; onToggle: () => void; register: any; disabled?: boolean }) {
  return (<div className="space-y-3"><Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">{label}</Label><div className="relative group">
    <Input placeholder="••••••••" type={show ? "text" : "password"} {...register} className={cn("h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 pr-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner", error && "border-red-900")} disabled={disabled} />
    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />
    <Button className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent text-epoch-primary/30" size="sm" type="button" variant="ghost" onClick={onToggle}>{show ? <EyeOff className="h-4 w-4 stroke-[1px]" /> : <Eye className="h-4 w-4 stroke-[1px]" />}</Button>
  </div>{error && <p className="text-xs text-red-500 ml-1">{error.message}</p>}</div>);
}
