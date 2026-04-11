"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthContext } from "@/contexts/AuthContext";
import { useSlugValidation } from "@/hooks/useSlugValidation";
import {
  type CreateOrganizationInput,
  createOrganizationSchema,
} from "@/lib/api/validation/organization-schemas";
import { cn } from "@/lib/utils";
import { generateSlug } from "@/lib/utils/slug-generator";

export default function CreateOrganizationPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasOrganization, setHasOrganization] = useState<boolean | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      subscription_tier: "pro",
      branchName: "Casa Matriz",
    },
  });

  const slug = watch("slug");

  // Validación en vivo del slug
  const slugValidation = useSlugValidation(slug || "");

  // Generar slug solo cuando el usuario termina de escribir en "Nombre comercial" (onBlur)
  const handleNameBlur = () => {
    const name = getValues("name");
    if (name && name.trim().length > 0) {
      const autoSlug = generateSlug(name);
      if (autoSlug && autoSlug.length > 0) {
        setValue("slug", autoSlug);
      }
    }
  };

  // Verificar si el usuario ya tiene organización
  useEffect(() => {
    const checkOrganization = async () => {
      if (!user || authLoading) return;

      try {
        const response = await fetch("/api/admin/check-status");
        const data = await response.json();

        if (
          data.organization?.hasOrganization &&
          !data.organization?.isDemoMode
        ) {
          // Ya tiene organización real, redirigir al admin
          router.push("/admin");
          return;
        }

        setHasOrganization(data.organization?.hasOrganization || false);
      } catch (err) {
        console.error("Error checking organization status:", err);
        setHasOrganization(false);
      }
    };

    checkOrganization();
  }, [user, authLoading, router]);

  const onSubmit = async (data: CreateOrganizationInput) => {
    // Validar que el slug esté disponible antes de enviar
    if (slugValidation.isAvailable === false) {
      setError("El identificador no está disponible. Por favor, elige otro.");
      return;
    }

    if (slugValidation.isValidating) {
      setError("Espera a que termine la validación del identificador.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const endpoint = hasOrganization
        ? "/api/onboarding/activate-real-org"
        : "/api/admin/organizations";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Mostrar detalles del error si están disponibles
        const errorMessage = result.details
          ? `${result.error}: ${result.details}`
          : result.error || "Error al crear la organización";

        console.error("❌ Error creating organization:", {
          status: response.status,
          error: result.error,
          details: result.details,
          code: result.code,
          hint: result.hint,
          fullResponse: result,
        });

        throw new Error(errorMessage);
      }

      // Redirigir a página de completado
      router.push("/onboarding/complete");
    } catch (err: unknown) {
      setError(err.message || "Error al crear la organización");
      setIsSubmitting(false);
    }
  };

  // Mostrar loading mientras se verifica autenticación
  if (authLoading || hasOrganization === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
          <p className="text-gray-600">Verificando estado...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, redirigir a login
  if (!user) {
    router.push("/login");
    return null;
  }

  const isSlugValid = slugValidation.isAvailable === true;
  const isSlugInvalid = slugValidation.isAvailable === false;
  const showSlugValidation = slug && slug.length >= 2;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--admin-bg-primary)] relative overflow-hidden px-4 py-12">
      {/* Premium Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-premium-float" />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-premium-float"
          style={{ animationDelay: "-2s" }}
        />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--admin-border-primary)] rounded-[2rem] shadow-2xl mb-6 relative group">
            <div className="absolute inset-0 bg-[var(--admin-bg-tertiary)] rounded-[2rem] scale-90 group-hover:scale-110 transition-transform duration-500" />
            <Building2 className="h-10 w-10 text-primary relative z-10" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
            {hasOrganization ? "Activar tu Óptica" : "Configura tu Óptica"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            {hasOrganization
              ? "Estamos a un paso de comenzar. Completa los detalles finales para activar tu entorno profesional."
              : "Definamos la identidad de tu organización en el sistema Opttius."}
          </p>
        </div>

        <Card
          className="border-0 shadow-2xl overflow-visible"
          variant="elevated"
        >
          <CardHeader padding="lg">
            <CardTitle size="lg" theme="modern">
              Identidad de la Organización
            </CardTitle>
            <CardDescription className="text-accent-foreground" size="lg">
              Esta información será la base de tu perfil empresarial y aparecerá
              en tus documentos oficiales.
            </CardDescription>
          </CardHeader>
          <CardContent padding="lg" spacing="relaxed">
            <form className="space-y-8" onSubmit={handleSubmit(onSubmit)}>
              {error && (
                <Alert
                  className="animate-in zoom-in-95 duration-300"
                  variant="destructive"
                >
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid gap-8">
                {/* Nombre de la organización */}
                <div className="space-y-3">
                  <Label
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    htmlFor="name"
                  >
                    Nombre comercial <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative group">
                    <Input
                      id="name"
                      {...register("name", {
                        onBlur: handleNameBlur,
                      })}
                      className={cn(
                        "h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10",
                        errors.name && "border-red-500 focus:ring-red-500/10",
                      )}
                      disabled={isSubmitting}
                      placeholder="Ej. Óptica Visión Premium"
                    />
                  </div>
                  {errors.name && (
                    <p className="text-xs font-medium text-red-500 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />{" "}
                      {String(errors.name.message)}
                    </p>
                  )}
                </div>

                {/* Slug */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      className="text-sm font-bold text-slate-700 dark:text-slate-300"
                      htmlFor="slug"
                    >
                      Identificador de URL (slug){" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    {isSlugValid && (
                      <Badge
                        className="bg-green-500/10 text-green-600 border-none px-2 text-[10px]"
                        variant="healty"
                      >
                        ✓ Disponible
                      </Badge>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="slug"
                      {...register("slug")}
                      className={cn(
                        "h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10 pr-12",
                        (errors.slug || isSlugInvalid) &&
                          "border-red-500 focus:ring-red-500/10",
                        isSlugValid &&
                          "border-green-500/50 focus:ring-green-500/5",
                      )}
                      disabled={isSubmitting}
                      placeholder="vision-premium"
                    />
                    {showSlugValidation && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 transition-all">
                        {slugValidation.isValidating ? (
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : isSlugValid ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : isSlugInvalid ? (
                          <XCircle className="h-5 w-5 text-red-500" />
                        ) : null}
                      </div>
                    )}
                  </div>
                  {errors.slug && (
                    <p className="text-xs font-medium text-red-500">
                      {String(errors.slug.message)}
                    </p>
                  )}
                  {slugValidation.error && (
                    <p className="text-xs font-medium text-red-500">
                      {slugValidation.error}
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    Tu acceso será:{" "}
                    <span className="text-primary font-bold">
                      opttius.com/{slug || "..."}
                    </span>
                    . Solo letras minúsculas y guiones.
                  </p>
                </div>

                {/* Nombre de primera sucursal */}
                <div className="space-y-3">
                  <Label
                    className="text-sm font-bold text-slate-700 dark:text-slate-300"
                    htmlFor="branchName"
                  >
                    Nombre de tu primera sucursal
                  </Label>
                  <Input
                    id="branchName"
                    {...register("branchName")}
                    className="h-12 bg-[var(--admin-bg-primary)] border-[var(--admin-border-secondary)] transition-all focus:ring-4 focus:ring-primary/10"
                    disabled={isSubmitting}
                    placeholder="Ej. Sucursal Central o Casa Matriz"
                  />
                  <p className="text-[11px] text-slate-500 font-medium italic">
                    Puedes crear más sucursales después en la configuración.
                  </p>
                </div>
              </div>

              {/* Botones */}
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <Button
                  className="flex-1 min-w-0 h-12 border-2 bg-[var(--admin-bg-tertiary)] border-[var(--admin-accent-primary)]"
                  disabled={isSubmitting}
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                >
                  Regresar
                </Button>
                <Button
                  shimmer
                  className="flex-1 min-w-0 h-12 shadow-xl shadow-primary/20 overflow-hidden"
                  disabled={
                    isSubmitting ||
                    slugValidation.isValidating ||
                    slugValidation.isAvailable === false
                  }
                  type="submit"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 shrink-0 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 truncate">
                        {hasOrganization
                          ? "Activar Ahora"
                          : "Crear Organización"}
                      </span>
                      <ArrowRight className="ml-2 h-5 w-5 shrink-0" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-10 text-center animate-in fade-in duration-1000 delay-300">
          <p className="text-sm text-slate-500 dark:text-slate-500 font-medium">
            ¿Solo quieres dar un vistazo?{" "}
            <Link
              className="text-primary hover:text-primary/80 font-bold hover:underline transition-all"
              href="/onboarding/choice"
            >
              Explorar demo primero
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
