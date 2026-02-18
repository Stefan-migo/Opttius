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
import { Badge } from "@/components/ui/badge";
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

  // Check if we are in recovery mode
  useEffect(() => {
    const checkRecovery = async () => {
      // Supabase sets a session if returning from recovery email
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Also check URL for recovery type
      const hash = window.location.hash;
      if (
        hash.includes("type=recovery") ||
        (session && !session.user.is_anonymous)
      ) {
        // If we have a session, we can show the update password form
        // But only if we are specifically here for recovery
        if (hash.includes("type=recovery")) {
          setStep("update");
        }
      }
    };

    checkRecovery();

    // Listen for the recovery event
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
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
        router.push("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar la contraseña");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-premium-float"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      {/* Left Side: Branding */}
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 overflow-hidden z-10">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-1000 scale-105"
          style={{
            backgroundImage: `url('/luxury_optics_auth_bg_1769965128142.png')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/40 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-16 w-full">
          <div
            className="flex items-center gap-5 group cursor-pointer"
            onClick={() => router.push("/")}
          >
            <div className="h-16 w-16 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 group-hover:bg-white group-hover:scale-110">
              <Image
                src="/LogoCircle.svg"
                alt="Opttius Logo"
                width={44}
                height={44}
                className="object-contain transition-all duration-500 group-hover:brightness-100 invert group-hover:invert-0"
              />
            </div>
            <span className="text-4xl font-black text-white tracking-tighter uppercase font-heading">
              Opttius
            </span>
          </div>

          <div className="max-w-xl">
            <h2 className="text-6xl font-black text-white leading-[1.1] tracking-tight mb-8">
              Tu <span className="text-primary">Visión</span>,<br />
              Nuestra{" "}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-indigo-400">
                Prioridad
              </span>
              .
            </h2>
            <p className="text-2xl text-slate-200/90 font-medium leading-relaxed">
              Recupera el acceso a tu ecosistema administrativo de forma segura
              y rápida.
            </p>
          </div>

          <div className="flex items-center gap-8 text-white/40 text-xs font-black uppercase tracking-[0.2em]">
            <span>Seguridad Avanzada</span>
            <div className="h-1 w-1 rounded-full bg-white/20" />
            <span>Encriptación de Grado Militar</span>
          </div>
        </div>
      </div>

      {/* Right Side: Forms */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-20 relative z-10 overflow-y-auto">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="text-center mb-10 lg:text-left space-y-3">
            <Badge
              variant="healty"
              className="bg-primary/10 text-primary border-none text-[10px] font-black tracking-widest px-4 py-1.5 rounded-full inline-block uppercase"
            >
              {step === "update"
                ? "Actualizar Contraseña"
                : "Recuperación de Cuenta"}
            </Badge>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {step === "sent"
                ? "Correo Enviado"
                : step === "update"
                  ? "Nueva Contraseña"
                  : "¿Olvidaste tu llave?"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest leading-loose">
              {step === "sent"
                ? "Revisa tu bandeja de entrada para continuar con el proceso."
                : step === "update"
                  ? "Ingresa tu nueva llave maestra para restablecer el acceso."
                  : "Ingresa tu email para recibir un enlace de recuperación seguro."}
            </p>
          </div>

          <Card
            variant="glass"
            rounded="lg"
            className="border-white/40 dark:border-slate-800/50 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden"
          >
            <CardContent className="p-8 sm:p-12">
              {error && (
                <Alert
                  variant="destructive"
                  className="mb-6 bg-red-500/10 border-red-500/20 rounded-2xl"
                >
                  <AlertDescription className="text-red-500 font-bold text-xs">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="mb-6 bg-emerald-500/10 border-emerald-500/20 rounded-2xl">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <AlertDescription className="text-emerald-500 font-bold text-xs">
                    ¡Contraseña actualizada con éxito! Redirigiendo...
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
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1"
                    >
                      Correo Electrónico
                    </Label>
                    <div className="relative group">
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@opttius.com"
                        {...requestForm.register("email")}
                        className={cn(
                          "h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-14 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200",
                          requestForm.formState.errors.email &&
                            "border-red-500",
                        )}
                        disabled={authLoading}
                      />
                      <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors group-focus-within:text-accent-foreground" />
                    </div>
                    {requestForm.formState.errors.email && (
                      <p className="text-[10px] text-red-500 font-black uppercase tracking-tight ml-1">
                        {requestForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-16 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase text-xs tracking-[0.2em] group"
                    disabled={authLoading}
                    shimmer
                  >
                    {authLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Enviar Enlace
                        <ArrowRight className="ml-3 h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </Button>

                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary uppercase tracking-widest transition-colors mt-6"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Volver al login
                  </Link>
                </form>
              )}

              {step === "sent" && (
                <div className="text-center space-y-6">
                  <div className="w-20 h-20 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-10 w-10 text-emerald-500" />
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 font-medium">
                    Hemos enviado un enlace de recuperación a:
                    <br />
                    <span className="font-bold text-slate-900 dark:text-white">
                      {requestForm.getValues("email")}
                    </span>
                  </p>
                  <Button
                    variant="outline"
                    className="w-full h-14 rounded-2xl border-2 font-bold"
                    onClick={() => setStep("request")}
                  >
                    Intentar con otro correo
                  </Button>
                  <Link
                    href="/login"
                    className="flex items-center justify-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest transition-colors"
                  >
                    <ArrowLeft className="h-3 w-3" />
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
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1"
                    >
                      Nueva Contraseña
                    </Label>
                    <div className="relative group">
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        {...updateForm.register("password")}
                        className={cn(
                          "h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-14 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200",
                          updateForm.formState.errors.password &&
                            "border-red-500",
                        )}
                        disabled={isUpdating}
                      />
                      <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1"
                    >
                      Confirmar Contraseña
                    </Label>
                    <div className="relative group">
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        {...updateForm.register("confirmPassword")}
                        className={cn(
                          "h-14 rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 pl-14 focus:bg-white dark:focus:bg-slate-900 transition-all font-bold text-slate-700 dark:text-slate-200",
                          updateForm.formState.errors.confirmPassword &&
                            "border-red-500",
                        )}
                        disabled={isUpdating}
                      />
                      <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    </div>
                    {updateForm.formState.errors.confirmPassword && (
                      <p className="text-[10px] text-red-500 font-black uppercase tracking-tight ml-1">
                        {updateForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-16 rounded-2xl shadow-xl shadow-primary/20 font-black uppercase text-xs tracking-[0.2em]"
                    disabled={isUpdating}
                    shimmer
                  >
                    {isUpdating ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      "Restablecer Contraseña"
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
