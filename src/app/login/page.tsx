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
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Por favor ingresa un email válido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading } = useAuthContext();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      const result = await signIn(data.email, data.password);
      if (result.error) {
        setError(result.error.message || "Login failed");
      } else {
        // Ir a onboarding/choice: si tiene org redirige a /admin, si no muestra opciones (demo/crear)
        router.replace("/onboarding/choice");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-epoch-background overflow-hidden relative">
      {/* Visual Side (Desktop) */}
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

        <div className="relative z-10 p-20 w-full h-full flex flex-col justify-between">
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
            <h2 className="text-6xl font-display font-bold text-white leading-tight tracking-tight mb-8">
              Redefiniendo la
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                precisión ocular
              </span>
            </h2>
            <div className="w-24 h-[1px] bg-epoch-accent mb-8"></div>
            <p className="text-xl text-white/70 font-serif italic tracking-wide leading-relaxed">
              Acceda al sistema de gestión diseñado para su óptica.
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

      {/* Form Side */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 md:p-12 lg:p-20 relative z-10 bg-epoch-background">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-10 duration-700">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-4 px-6 py-2 border border-epoch-primary/10 rounded-full text-epoch-primary/60 text-[10px] font-display tracking-[0.4em] uppercase mb-8">
              <Sparkles className="h-3 w-3" />
              <span>Iniciar sesión</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold text-epoch-primary tracking-tight mb-4">
              Bienvenido a
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                Opttius
              </span>
            </h1>
          </div>

          <Card className="border-epoch-primary/5 bg-white shadow-2xl rounded-none">
            <CardContent className="p-8 sm:p-12">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {error && (
                  <Alert
                    variant="destructive"
                    className="bg-red-500/10 border-red-500/20 rounded-none animate-in shake-in duration-500"
                  >
                    <AlertDescription className="text-red-950 font-serif italic text-xs">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label
                    htmlFor="email"
                    className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em] ml-1"
                  >
                    Credencial (Email)
                  </Label>
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="maestro@opttius.com"
                      {...register("email")}
                      className={cn(
                        "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-14 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                        errors.email &&
                          "border-red-900 focus-visible:ring-red-900",
                      )}
                      disabled={loading}
                    />
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] text-red-900 font-display italic tracking-[0.1em] ml-1 uppercase">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1 px-1">
                    <Label
                      htmlFor="password"
                      className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-[0.3em]"
                    >
                      Llave de Acceso
                    </Label>
                    <Link
                      href="/reset-password"
                      title="Restablecer"
                      className="text-[10px] font-display font-bold text-epoch-accent hover:text-epoch-primary uppercase tracking-widest transition-colors"
                    >
                      ¿Olvidó su llave?
                    </Link>
                  </div>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      {...register("password")}
                      className={cn(
                        "h-14 rounded-none border-epoch-primary/10 bg-epoch-background/50 pl-14 pr-14 focus:bg-white transition-all font-body text-epoch-primary shadow-inner",
                        errors.password &&
                          "border-red-900 focus-visible:ring-red-900",
                      )}
                      disabled={loading}
                    />
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-epoch-primary/30 group-focus-within:text-epoch-primary transition-colors stroke-[1px]" />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-none hover:bg-epoch-primary/5 text-epoch-primary/30"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={loading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 stroke-[1px]" />
                      ) : (
                        <Eye className="h-4 w-4 stroke-[1px]" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-16 rounded-none bg-epoch-primary hover:bg-epoch-surface text-white font-display font-bold uppercase text-xs tracking-[0.4em] group overflow-hidden transition-all duration-500 shadow-xl"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-3">
                      Sincronizar Acceso
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-2" />
                    </span>
                  )}
                </Button>
              </form>

              <div className="mt-12 text-center pt-8 border-t border-epoch-primary/5">
                <p className="text-[10px] font-display font-bold text-epoch-primary/40 uppercase tracking-widest mb-6">
                  ¿Primera vez aquí?
                </p>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-4 px-10 py-4 border border-epoch-primary/10 text-xs font-display font-bold text-epoch-primary uppercase tracking-[0.3em] hover:bg-epoch-primary hover:text-white transition-all duration-500 hover:-translate-y-1"
                >
                  Crear cuenta
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="mt-12 flex justify-center gap-8 text-[9px] font-display font-bold text-epoch-primary/30 uppercase tracking-[0.3em]">
            <Link
              href="#"
              className="hover:text-epoch-accent transition-colors"
            >
              Soporte
            </Link>
            <Link
              href="#"
              className="hover:text-epoch-accent transition-colors"
            >
              Privacidad
            </Link>
            <Link
              href="#"
              className="hover:text-epoch-accent transition-colors"
            >
              Legales
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
