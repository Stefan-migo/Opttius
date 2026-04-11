"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  User,
} from "lucide-react";
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

const signupSchema = z
  .object({
    firstName: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
    lastName: z.string().min(2, "El apellido debe tener al menos 2 caracteres"),
    email: z.string().email("Por favor ingresa un email válido"),
    phone: z.string().optional().or(z.literal("")),
    password: z
      .string()
      .min(6, "La contraseña debe tener al menos 6 caracteres")
      .regex(
        /[A-Z]/,
        "La contraseña debe contener al menos una letra mayúscula",
      )
      .regex(
        /[a-z]/,
        "La contraseña debe contener al menos una letra minúscula",
      )
      .regex(/[0-9]/, "La contraseña debe contener al menos un número"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signUp, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [configChecked, setConfigChecked] = useState(false);

  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/landing/onboarding-config");
        const data = await res.json();
        const accessOpticas = searchParams.get("access") === "opticas";
        if (data.signupEnabled === false && !accessOpticas) {
          router.replace("/solicitar-demo");
          return;
        }
      } catch {
        // Si falla la API, permitir signup (fail open para no bloquear)
      }
      setConfigChecked(true);
    };
    checkConfig();
  }, [router, searchParams]);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupForm) => {
    try {
      setError(null);
      const result = await signUp(data.email, data.password, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });

      if (result.error) {
        setError(result.error.message || "Signup failed");
        return;
      }

      const user = result.data?.user;
      const session = result.data?.session;
      // Si hay sesión = no requiere confirmación (local) o ya confirmó
      const needsEmailConfirmation = !session && user;

      setRequiresEmailConfirmation(needsEmailConfirmation);
      setIsSuccess(true);

      if (needsEmailConfirmation) {
        try {
          const { createClient } = await import("@/utils/supabase/client");
          const supabase = createClient();
          await supabase.auth.signOut();
        } catch (signOutError) {
          console.warn("⚠️ Could not sign out user:", signOutError);
        }
        return;
      }

      // Usuario con sesión: ir a onboarding (elegir demo o crear org)
      setTimeout(() => {
        router.push("/onboarding/choice");
      }, 1500);
    } catch (err: unknown) {
      setError(err.message || "An error occurred during signup");
    }
  };

  if (!configChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-epoch-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-epoch-primary" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-epoch-background p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-epoch-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-epoch-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-700 rounded-3xl overflow-hidden">
          <Card className="overflow-hidden rounded-3xl shadow-2xl border-0 bg-epoch-primary">
            {/* Header: mismo tamaño visual que el contenido */}
            <div className="bg-epoch-primary p-6 sm:p-10 text-center">
              <div className="relative mx-auto mb-6 flex justify-center">
                <Image
                  alt="Opttius"
                  className="h-24 w-28 object-contain"
                  height={227}
                  src="/logoYopttius.png"
                  width={248}
                />
              </div>
              <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-epoch-accent/40 rounded-full mb-6">
                <CheckCircle2 className="h-10 w-10 text-epoch-accent stroke-[1.5px]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mb-2">
                Bienvenido al Nuevo Estándar
              </h1>
              <p className="text-white/95 font-serif italic text-base uppercase tracking-[0.2em]">
                Registro Exitoso
              </p>
            </div>

            {/* Contenido: verde oscuro con texto y botón en contraste */}
            <CardContent className="p-6 sm:p-10 text-center bg-epoch-primary border-t border-white/10">
              {requiresEmailConfirmation ? (
                <div className="space-y-6 sm:space-y-8">
                  <p className="text-[15px] font-serif italic text-white/90 leading-relaxed">
                    Su óptica está a un paso de la automatización. Revise su
                    bandeja de entrada y active su cuenta para comenzar.
                  </p>
                  <Button
                    className="w-full min-h-14 sm:h-16 px-4 overflow-hidden bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary rounded-xl font-display font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.3em] transition-all shadow-xl group flex items-center justify-center gap-2 py-3 sm:py-4 whitespace-normal"
                    onClick={() => router.push("/login")}
                  >
                    <span className="break-words text-center">
                      REGRESAR AL ACCESO
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 sm:space-y-8">
                  <p className="text-[15px] font-serif italic text-white/90 leading-relaxed">
                    Su cuenta ha sido creada. Redirigiéndole a la configuración
                    inicial...
                  </p>
                  <Button
                    className="w-full min-h-14 sm:h-16 px-4 overflow-hidden bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary rounded-xl font-display font-bold uppercase text-[10px] sm:text-[11px] tracking-[0.12em] sm:tracking-[0.3em] transition-all shadow-xl group flex items-center justify-center gap-2 py-3 sm:py-4 whitespace-normal"
                    onClick={() => router.push("/onboarding/choice")}
                  >
                    <span className="break-words text-center">CONTINUAR</span>
                    <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="mt-12 text-center text-[10px] font-body text-epoch-primary/50">
            © 2026 Opttius. Ingeniería clínica para ópticas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-epoch-background overflow-hidden relative">
      {/* Branding Side (Desktop) */}
      <div className="relative hidden lg:flex lg:w-5/12 xl:w-1/2 overflow-hidden items-center justify-center bg-epoch-primary">
        <div className="absolute inset-0 z-0">
          <Image
            fill
            priority
            alt="Elite Setup"
            className="object-cover opacity-20 grayscale"
            sizes="(max-width: 1024px) 100vw, 50vw"
            src="/images/landing/Hero.webp"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-epoch-primary via-epoch-primary/80 to-epoch-accent/10" />
        </div>

        <div className="relative z-10 p-20 w-full h-full flex flex-col justify-between">
          <Link className="group flex flex-col items-start w-fit" href="/">
            <div className="relative mb-1 group-hover:scale-110 transition-transform duration-500">
              <Image
                alt="Opttius"
                className="h-14 w-48 opacity-100 object-contain object-left"
                height={56}
                src="/logo-text-default.svg"
                width={192}
              />
            </div>
          </Link>

          <div className="space-y-12 animate-in fade-in slide-in-from-left-10 duration-1000">
            <div className="space-y-6">
              <Badge className="bg-epoch-accent/20 text-epoch-accent border-epoch-accent/30 rounded-xl px-4 py-1 text-[10px] uppercase font-display tracking-[0.3em]">
                Registro
              </Badge>
              <h2 className="text-6xl xl:text-7xl font-display font-bold text-white leading-tight tracking-tight">
                Diseña el futuro
                <br />
                <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                  de tu óptica
                </span>
              </h2>
              <p className="text-xl text-white/60 font-serif italic tracking-wide max-w-lg leading-relaxed">
                Únete a las ópticas que ya gestionan su negocio con tecnología
                pensada para el sector.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Infraestructura de alta seguridad",
                "Inteligencia visual predictiva",
                "Acompañamiento especializado",
              ].map((item, i) => (
                <div
                  className="flex items-center gap-4 text-white/80 font-display text-[10px] uppercase tracking-[0.2em]"
                  key={i}
                >
                  <div className="w-1.5 h-[1px] bg-epoch-accent" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="text-[9px] font-display font-bold text-white/30 uppercase tracking-[0.4em]">
            © OPTTIUS ELITE SERVICES
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 xl:p-24 bg-epoch-background relative z-10 overflow-y-auto">
        <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="mb-12">
            <h1 className="text-5xl font-display font-bold text-epoch-primary tracking-tight leading-none">
              Cree su cuenta en
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                Opttius
              </span>
            </h1>
            <p className="mt-4 text-epoch-primary/60 font-body text-sm">
              El sistema de gestión diseñado para su óptica.
            </p>
          </div>

          <Card className="border-epoch-primary/5 bg-white shadow-2xl rounded-xl">
            <CardContent className="p-8 sm:p-12">
              <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
                {error && (
                  <Alert
                    className="bg-red-500/10 border-red-500/20 rounded-xl"
                    variant="destructive"
                  >
                    <AlertDescription className="text-red-950 font-serif italic text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Nombre
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="Alejandro"
                        {...register("firstName")}
                        className={cn(
                          "h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.firstName &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Apellido
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="Valdivia"
                        {...register("lastName")}
                        className={cn(
                          "h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.lastName &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Email Corporativo
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="directorio@optica.com"
                        type="email"
                        {...register("email")}
                        className={cn(
                          "h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.email &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Teléfono Móvil
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="+1 555-0100"
                        type="tel"
                        {...register("phone")}
                        className="h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner"
                        disabled={loading}
                      />
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Contraseña
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        {...register("password")}
                        className={cn(
                          "h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 pr-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.password &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                      <Button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent text-epoch-primary/30"
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 stroke-[1px]" />
                        ) : (
                          <Eye className="h-4 w-4 stroke-[1px]" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Confirmar contraseña
                    </Label>
                    <div className="relative group">
                      <Input
                        placeholder="••••••••"
                        type={showConfirmPassword ? "text" : "password"}
                        {...register("confirmPassword")}
                        className={cn(
                          "h-14 rounded-xl border-epoch-primary/10 bg-epoch-background/50 pl-12 pr-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.confirmPassword &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                      <Button
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent text-epoch-primary/30"
                        size="sm"
                        type="button"
                        variant="ghost"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 stroke-[1px]" />
                        ) : (
                          <Eye className="h-4 w-4 stroke-[1px]" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full h-16 rounded-xl bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.4em] group transition-all shadow-xl"
                  disabled={loading}
                  size="lg"
                  type="submit"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-3">
                      Crear cuenta
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-3" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-12 text-center pt-8 border-t border-epoch-primary/5">
                <p className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest mb-4">
                  ¿Ya tiene cuenta?
                </p>
                <Link
                  className="inline-flex items-center gap-2 text-xs font-display font-bold text-epoch-accent uppercase tracking-[0.2em] hover:text-epoch-primary transition-all group"
                  href="/login"
                >
                  Iniciar sesión
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-12 text-center text-[8px] font-display font-bold text-epoch-primary/30 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">
            Al registrarse en Opttius, usted acepta nuestros{" "}
            <Link className="underline hover:text-epoch-primary" href="#">
              Términos de uso
            </Link>{" "}
            y{" "}
            <Link className="underline hover:text-epoch-primary" href="#">
              Política de Privacidad
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
