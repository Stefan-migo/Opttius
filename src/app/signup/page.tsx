"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OpttiusLogoText, OpttiusLogoCompact } from "@/components/ui/brand";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  EyeOff,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Shield,
  CheckCircle2,
  Sparkles,
  Award,
} from "lucide-react";
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
  const { signUp, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
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
    } catch (err: any) {
      setError(err.message || "An error occurred during signup");
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-epoch-background p-6 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-epoch-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-epoch-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-700">
          <div className="text-center mb-10">
            <div className="relative mx-auto mb-10 flex justify-center">
              <OpttiusLogoCompact
                forceLight={false}
                className="h-32 w-44 opacity-100"
              />
            </div>
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white border border-epoch-primary/5 rounded-full mb-8 shadow-premium">
              <div className="w-20 h-20 border border-epoch-accent/20 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10 text-[#2C5E43] stroke-[1px]" />
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-epoch-primary tracking-tight mb-2 uppercase">
              BIENVENIDO A LA ORDEN
            </h1>
            <p className="text-epoch-accent font-serif italic text-lg opacity-80 uppercase tracking-[0.2em]">
              Registro Exitoso
            </p>
          </div>

          <Card className="border-epoch-primary/10 bg-white/90 backdrop-blur-sm shadow-2xl rounded-none overflow-hidden border-t-4 border-t-epoch-accent">
            <CardContent className="p-10 text-center">
              {requiresEmailConfirmation ? (
                <div className="space-y-8">
                  <p className="text-[15px] font-serif italic text-epoch-primary/80 leading-relaxed">
                    Hemos enviado un{" "}
                    <span className="text-epoch-primary font-bold">
                      pergamino digital
                    </span>{" "}
                    de confirmación a su correo. Por favor, verifíquelo para
                    activar su identidad en el ecosistema Opttius.
                  </p>
                  <Button
                    onClick={() => router.push("/login")}
                    className="w-full h-16 bg-epoch-primary hover:bg-epoch-surface text-white rounded-none font-display font-bold uppercase text-[11px] tracking-[0.3em] transition-all shadow-xl group"
                  >
                    REGRESAR AL ACCESO
                    <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-8">
                  <p className="text-[15px] font-serif italic text-epoch-primary/80 leading-relaxed">
                    Su identidad ha sido{" "}
                    <span className="text-epoch-primary font-bold">
                      forjada
                    </span>
                    . Redirigiéndole a los archivos de configuración inicial...
                  </p>
                  <Button
                    onClick={() => router.push("/onboarding/choice")}
                    className="w-full h-16 bg-epoch-primary hover:bg-epoch-surface text-white rounded-none font-display font-bold uppercase text-[11px] tracking-[0.3em] transition-all shadow-xl group"
                  >
                    CONTINUAR EL LEGADO
                    <ArrowRight className="ml-3 h-4 w-4 transition-transform group-hover:translate-x-2" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <p className="mt-12 text-center text-[8px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.4em]">
            © OPTTIUS ELITE SERVICES MMXXIV
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
            src="/images/landing/hero-epoch.png"
            alt="Elite Setup"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover opacity-20 grayscale"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-br from-epoch-primary via-epoch-primary/80 to-epoch-accent/10" />
        </div>

        <div className="relative z-10 p-20 w-full h-full flex flex-col justify-between">
          <Link href="/" className="group flex flex-col items-start w-fit">
            <div className="relative mb-1 group-hover:scale-110 transition-transform duration-500">
              <OpttiusLogoText
                forceLight={true}
                className="h-14 w-48 opacity-100"
              />
            </div>
          </Link>

          <div className="space-y-12 animate-in fade-in slide-in-from-left-10 duration-1000">
            <div className="space-y-6">
              <Badge className="bg-epoch-accent/20 text-epoch-accent border-epoch-accent/30 rounded-none px-4 py-1 text-[10px] uppercase font-display tracking-[0.3em]">
                Registro de Socios
              </Badge>
              <h2 className="text-7xl font-display font-bold text-white leading-none tracking-tighter uppercase">
                DISEÑA EL <br />
                <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                  futuro
                </span>{" "}
                <br />
                DE TU ÓPTICA.
              </h2>
              <p className="text-xl text-white/60 font-serif italic tracking-wide max-w-lg leading-relaxed">
                Únete a la orden de ópticas que trascienden el tiempo.
                Tecnología de élite para el profesional que no acepta menos que
                la perfección.
              </p>
            </div>

            <div className="space-y-4">
              {[
                "Infraestructura de alta seguridad",
                "Inteligencia visual predictiva",
                "Acompañamiento especializado",
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 text-white/80 font-display text-[10px] uppercase tracking-[0.2em]"
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
            <h1 className="text-5xl font-display font-bold text-epoch-primary tracking-tight leading-none uppercase">
              COMIENCE SU
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                gran obra
              </span>
            </h1>
            <p className="mt-4 text-epoch-primary/40 font-display font-bold text-[10px] uppercase tracking-[0.3em]">
              Establezca su presencia en el ecosistema más avanzado del sector.
            </p>
          </div>

          <Card className="border-epoch-primary/5 bg-white shadow-2xl rounded-none">
            <CardContent className="p-8 sm:p-12">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {error && (
                  <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/20 rounded-none"
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
                          "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
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
                          "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
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
                        type="email"
                        placeholder="directorio@optica.com"
                        {...register("email")}
                        className={cn(
                          "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
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
                        type="tel"
                        placeholder="+1 555-0100"
                        {...register("phone")}
                        className="h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner"
                        disabled={loading}
                      />
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest ml-1">
                      Llave Maestra
                    </Label>
                    <div className="relative group">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...register("password")}
                        className={cn(
                          "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-12 pr-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.password &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent text-epoch-primary/30"
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
                      Confirmar Llave
                    </Label>
                    <div className="relative group">
                      <Input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        {...register("confirmPassword")}
                        className={cn(
                          "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-12 pr-12 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                          errors.confirmPassword &&
                            "border-red-900 focus-visible:ring-red-900",
                        )}
                        disabled={loading}
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-transparent text-epoch-primary/30"
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
                  type="submit"
                  size="lg"
                  className="w-full h-16 rounded-none bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.4em] group transition-all shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-3">
                      Iniciar mi Evolución
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-3" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-12 text-center pt-8 border-t border-epoch-primary/5">
                <p className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest mb-4">
                  ¿Ya posee una identidad registrada?
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs font-display font-bold text-epoch-accent uppercase tracking-[0.2em] hover:text-epoch-primary transition-all group"
                >
                  Regresar al Panel Maestro
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <p className="mt-12 text-center text-[8px] font-display font-bold text-epoch-primary/30 uppercase tracking-[0.2em] max-w-lg mx-auto leading-relaxed">
            Al registrarse en Opttius, usted acepta nuestros{" "}
            <Link href="#" className="underline hover:text-epoch-primary">
              Términos de Élite
            </Link>{" "}
            y la{" "}
            <Link href="#" className="underline hover:text-epoch-primary">
              Soberanía de Datos
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
