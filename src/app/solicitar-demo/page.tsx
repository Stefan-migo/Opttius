"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Mail,
  User,
  Building2,
  Phone,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const solicitarDemoSchema = z.object({
  email: z.string().email("Por favor ingresa un email válido"),
  full_name: z.string().optional(),
  optica_name: z.string().optional(),
  phone: z.string().optional(),
});

type SolicitarDemoForm = z.infer<typeof solicitarDemoSchema>;

export default function SolicitarDemoPage() {
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SolicitarDemoForm>({
    resolver: zodResolver(solicitarDemoSchema),
  });

  const onSubmit = async (data: SolicitarDemoForm) => {
    try {
      setError(null);
      const res = await fetch("/api/demo-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: data.email,
          full_name: data.full_name || undefined,
          optica_name: data.optica_name || undefined,
          phone: data.phone || undefined,
          source: "landing",
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Error al enviar la solicitud");
        return;
      }

      setIsSuccess(true);
    } catch (err) {
      setError("Error de conexión. Intenta de nuevo.");
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-epoch-background p-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
          <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-epoch-accent/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-epoch-primary/5 rounded-full blur-[120px]" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-in zoom-in-95 duration-700 rounded-3xl overflow-hidden">
          <Card className="overflow-hidden rounded-3xl shadow-2xl border-0 bg-epoch-primary">
            <div className="bg-epoch-primary p-6 sm:p-10 text-center">
              <div className="relative mx-auto mb-6 flex justify-center">
                <Image
                  src="/logoYopttius.png"
                  alt="Opttius"
                  width={248}
                  height={227}
                  className="h-24 w-28 object-contain"
                />
              </div>
              <div className="inline-flex items-center justify-center w-20 h-20 border-2 border-epoch-accent/40 rounded-full mb-6">
                <CheckCircle2 className="h-10 w-10 text-epoch-accent stroke-[1.5px]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight mb-2">
                Solicitud Recibida
              </h1>
              <p className="text-white/95 font-serif italic text-base uppercase tracking-[0.2em]">
                Nos pondremos en contacto pronto
              </p>
            </div>

            <CardContent className="p-6 sm:p-10 text-center bg-epoch-primary border-t border-white/10">
              <p className="text-[15px] font-serif italic text-white/90 leading-relaxed mb-8">
                Hemos recibido tu solicitud de demo. Revisaremos tu información
                y te contactaremos a la brevedad para darte acceso a la
                plataforma.
              </p>
              <Link href="/">
                <Button className="w-full min-h-14 bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary font-display font-bold uppercase tracking-widest">
                  Volver al inicio
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-epoch-background overflow-hidden relative">
      <div className="relative hidden lg:flex lg:w-1/2 xl:w-7/12 overflow-hidden items-center justify-center bg-epoch-surface">
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/landing/Hero.webp"
            alt="Óptica"
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
            <Badge className="bg-epoch-accent/20 text-epoch-accent border-epoch-accent/30 rounded-xl px-4 py-1 text-[10px] uppercase font-display tracking-[0.3em] mb-6">
              Solicitar Demo
            </Badge>
            <h2 className="text-5xl xl:text-6xl font-display font-bold text-white leading-tight tracking-tight mb-6">
              Prueba Opttius
              <br />
              <span className="text-epoch-accent italic font-serif lowercase tracking-normal">
                sin compromiso
              </span>
            </h2>
            <p className="text-lg text-white/70 font-serif italic tracking-wide leading-relaxed">
              Completa el formulario y te daremos acceso a una demo de la
              plataforma para que conozcas todas las funcionalidades.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center p-6 sm:p-12 lg:p-16">
        <div className="w-full max-w-md mx-auto">
          <div className="lg:hidden mb-8">
            <Link href="/">
              <Image
                src="/logo-text-default.svg"
                alt="Opttius"
                width={140}
                height={40}
                className="h-10"
              />
            </Link>
          </div>

          <h1 className="text-2xl sm:text-3xl font-display font-bold text-epoch-primary tracking-tight mb-2">
            Solicitar Demo
          </h1>
          <p className="text-epoch-primary/70 mb-8">
            Déjanos tus datos y te contactaremos para darte acceso.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@optica.cl"
                  className="pl-10"
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Nombre completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="full_name"
                  placeholder="Juan Pérez"
                  className="pl-10"
                  {...register("full_name")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="optica_name">Nombre de la óptica</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="optica_name"
                  placeholder="Óptica Vista Clara"
                  className="pl-10"
                  {...register("optica_name")}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+56 9 1234 5678"
                  className="pl-10"
                  {...register("phone")}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full min-h-12 bg-epoch-primary hover:bg-epoch-primary/90 text-white font-display font-bold uppercase tracking-widest"
            >
              Enviar solicitud
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-epoch-primary hover:underline">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
