"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Lock,
  Mail,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

const requestSchema = z.object({
  email: z.string().email("Por favor ingresa un email válido"),
});

const updateSchema = z
  .object({
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RequestForm = z.infer<typeof requestSchema>;
type UpdateForm = z.infer<typeof updateSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { resetPassword, loading: authLoading } = useAuthContext();
  const [step, setStep] = useState<"request" | "sent" | "update">("request");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);

  // Check if we are in recovery or invite mode (set password flow)
  useEffect(() => {
    const checkRecoveryOrInvite = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const hash = window.location.hash;
      const isRecovery = hash.includes("type=recovery");
      const isInvite = hash.includes("type=invite");
      if (isRecovery || isInvite || (session && !session.user.is_anonymous)) {
        if (isRecovery || isInvite) {
          setIsInviteFlow(isInvite);
          setStep("update");
        }
      }
    };

    checkRecoveryOrInvite();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsInviteFlow(false);
        setStep("update");
      }
      // Invite flow: user lands with tokens in hash, session is established
      if (
        event === "SIGNED_IN" &&
        window.location.hash.includes("type=invite")
      ) {
        setIsInviteFlow(true);
        setStep("update");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const requestForm = useForm<RequestForm>({
    resolver: zodResolver(requestSchema),
  });

  const updateForm = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
  });

  const onRequestSubmit = async (data: RequestForm) => {
    try {
      setError(null);
      await resetPassword(data.email);
      setStep("sent");
    } catch (err: any) {
      setError(err.message || "Error al enviar el correo de recuperación");
    }
  };

  const onUpdateSubmit = async (data: UpdateForm) => {
    try {
      setError(null);
      setIsUpdating(true);
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        router.push(isInviteFlow ? "/admin" : "/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] flex flex-col md:flex-row bg-epoch-background overflow-hidden relative">
      {/* Visual Side (Desktop) - matches login */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 overflow-hidden items-center justify-center bg-epoch-surface">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/landing/Hero.webp"
            alt="Vintage Optics"
            fill
            className="object-cover opacity-30 grayscale"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-epoch-primary via-epoch-primary/40 to-transparent" />
        </div>

        <div className="relative z-10 p-12 xl:p-20 w-full h-full flex flex-col justify-between">
          <Link href="/" className="group flex flex-col items-start w-fit">
            <div className="relative mb-1 group-hover:scale-110 transition-transform duration-500">
              <Image
                src="/logo-text-default.svg"
                alt="Opttius"
                width={192}
                height={56}
                className="h-14 w-48 opacity-100 object-contain object-left"
              />
            </div>
          </Link>

          <div className="max-w-xl animate-in fade-in slide-in-from-left-10 duration-1000">
            <h2 className="text-5xl xl:text-6xl font-display font-bold text-white leading-tight tracking-tight mb-8">
              Recupera tu
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                acceso seguro
              </span>
            </h2>
            <div className="w-24 h-[1px] bg-epoch-accent mb-8"></div>
            <p className="text-lg xl:text-xl text-white/70 font-serif italic tracking-wide leading-relaxed">
              Restablece tu contraseña de forma segura y vuelve a gestionar tu
              óptica.
            </p>
          </div>

          <div className="flex items-center gap-8 text-white/30 text-[9px] font-display uppercase tracking-[0.4em]">
            <span className="flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-epoch-accent animate-pulse" />
              SISTEMA DE ÉLITE
            </span>
            <span>V3.0.0</span>
          </div>
        </div>
      </div>

      {/* Form Side - mobile-first, touch-optimized */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-6 md:p-12 lg:p-20 relative z-10 overflow-y-auto min-h-0">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-10 duration-700 py-4 sm:py-0">
          {/* Mobile logo - visible when left panel hidden */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Link href="/" className="group">
              <Image
                src="/logo-text-default.svg"
                alt="Opttius"
                width={160}
                height={48}
                className="h-12 w-40 sm:h-14 sm:w-48 opacity-100 object-contain group-hover:opacity-90 transition-opacity"
              />
            </Link>
          </div>

          <div className="text-center mb-8 sm:mb-10 lg:text-left space-y-3">
            <div className="inline-flex items-center gap-4 px-4 sm:px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/60 text-[10px] font-display tracking-[0.3em] sm:tracking-[0.4em] uppercase">
              {step === "update"
                ? isInviteFlow
                  ? "Tu demo está lista"
                  : "Actualizar contraseña"
                : "Recuperación de cuenta"}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight">
              {step === "sent"
                ? "Correo enviado"
                : step === "update"
                  ? isInviteFlow
                    ? "Crea tu contraseña"
                    : "Nueva contraseña"
                  : "¿Olvidaste tu contraseña?"}
            </h1>
            <p className="text-epoch-primary/60 font-display font-bold uppercase text-[10px] tracking-[0.2em] sm:tracking-widest leading-relaxed">
              {step === "sent"
                ? "Revisa tu bandeja de entrada para continuar."
                : step === "update"
                  ? isInviteFlow
                    ? "Tu demo de Opttius está lista. Crea una contraseña para acceder."
                    : "Ingresa tu nueva contraseña para restablecer el acceso."
                  : "Ingresa tu email para recibir un enlace de recuperación."}
            </p>
          </div>

          <Card className="border-epoch-primary/5 bg-white shadow-2xl rounded-xl">
            <CardContent className="p-6 sm:p-8 md:p-12">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-6 bg-red-500/10 border-red-500/20 rounded-xl animate-in shake-in duration-500"
                >
                  <AlertDescription className="text-red-950 font-serif italic text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/20 rounded-xl">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <AlertDescription className="text-emerald-700 font-serif italic text-xs">
                    ¡Contraseña actualizada! Redirigiendo...
                  </AlertDescription>
                </Alert>
              )}

              {step === "request" && (
                <form
                  onSubmit={requestForm.handleSubmit(onRequestSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label
                      htmlFor="email"
                      className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em] ml-1"
                    >
                      Email
                    </Label>
                    <div className="relative group">
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@opttius.com"
                        {...requestForm.register("email")}
                        className={cn(
                          "h-14 min-h-[44px] rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-14 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          requestForm.formState.errors.email &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={authLoading}
                      />
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    </div>
                    {requestForm.formState.errors.email && (
                      <p className="text-[10px] text-red-900 font-display italic tracking-[0.1em] ml-1 uppercase">
                        {requestForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 min-h-[44px] sm:h-16 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.4em] group overflow-hidden transition-all duration-500 shadow-xl"
                    disabled={authLoading}
                  >
                    {authLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Enviar enlace
                        <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 py-3 min-h-[44px] text-[10px] font-display font-bold text-epoch-primary/60 hover:text-epoch-primary uppercase tracking-widest transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3 shrink-0" />
                    Volver al login
                  </Link>
                </form>
              )}

              {step === "sent" && (
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto">
                    <Mail className="h-8 w-8 sm:h-10 sm:w-10 text-emerald-500" />
                  </div>
                  <p className="text-epoch-primary/80 font-body text-sm sm:text-base">
                    Hemos enviado un enlace de recuperación a:
                    <br />
                    <span className="font-bold text-epoch-primary">
                      {requestForm.getValues("email")}
                    </span>
                  </p>
                  <Button
                    variant="outline"
                    className="w-full h-14 min-h-[44px] rounded-xl border-2 border-epoch-primary/20 font-display font-bold hover:bg-epoch-primary/5 hover:border-epoch-primary/30"
                    onClick={() => setStep("request")}
                  >
                    Intentar con otro correo
                  </Button>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 py-3 min-h-[44px] text-[10px] font-display font-bold text-epoch-accent hover:text-epoch-primary uppercase tracking-widest transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3 shrink-0" />
                    Regresar al login
                  </Link>
                </div>
              )}

              {step === "update" && (
                <form
                  onSubmit={updateForm.handleSubmit(onUpdateSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label
                      htmlFor="password"
                      className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em] ml-1"
                    >
                      {isInviteFlow ? "Contraseña" : "Nueva contraseña"}
                    </Label>
                    <div className="relative group">
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...updateForm.register("password")}
                        className={cn(
                          "h-14 min-h-[44px] rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-14 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          updateForm.formState.errors.password &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={isUpdating}
                      />
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />
                    </div>
                    {updateForm.formState.errors.password && (
                      <p className="text-[10px] text-red-900 font-display italic tracking-[0.1em] ml-1 uppercase">
                        {updateForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em] ml-1"
                    >
                      Confirmar contraseña
                    </Label>
                    <div className="relative group">
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...updateForm.register("confirmPassword")}
                        className={cn(
                          "h-14 min-h-[44px] rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-14 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          updateForm.formState.errors.confirmPassword &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={isUpdating}
                      />
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30" />
                    </div>
                    {updateForm.formState.errors.confirmPassword && (
                      <p className="text-[10px] text-red-900 font-display italic tracking-[0.1em] ml-1 uppercase">
                        {updateForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-14 min-h-[44px] sm:h-16 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-[10px] sm:text-xs tracking-[0.2em] sm:tracking-[0.4em] overflow-hidden transition-all duration-500 shadow-xl"
                    disabled={isUpdating}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : isInviteFlow ? (
                      "Crear contraseña y acceder"
                    ) : (
                      "Restablecer contraseña"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
