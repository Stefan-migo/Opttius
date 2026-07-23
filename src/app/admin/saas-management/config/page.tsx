"use client";

import {
  ArrowLeft,
  Calendar,
  Loader2,
  Save,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { OpticasTokensSection } from "./_components/OpticasTokensSection";

export default function SaasConfigPage() {
  const router = useRouter();
  const [trialDays, setTrialDays] = useState<string>("7");
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [onboardingStageMode, setOnboardingStageMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOnboarding, setSavingOnboarding] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system/config")
      .then((res) => res.json())
      .then((data) => {
        const configs = data.configs || [];
        const trial = configs.find(
          (c: { config_key: string }) =>
            c.config_key === "membership_trial_days",
        );
        if (trial?.config_value != null) {
          setTrialDays(String(trial.config_value));
        }
        const signup = configs.find(
          (c: { config_key: string }) => c.config_key === "signup_enabled",
        );
        if (signup?.config_value != null) {
          setSignupEnabled(
            signup.config_value === true ||
              signup.config_value === "true" ||
              signup.config_value === 1,
          );
        }
        const stage = configs.find(
          (c: { config_key: string }) =>
            c.config_key === "onboarding_stage_mode",
        );
        if (stage?.config_value != null) {
          setOnboardingStageMode(
            stage.config_value === true ||
              stage.config_value === "true" ||
              stage.config_value === 1,
          );
        }
      })
      .catch(() => toast.error("Error al cargar configuración"))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const num = parseInt(trialDays, 10);
    if (isNaN(num) || num < 1 || num > 365) {
      toast.error("Ingresa un número entre 1 y 365 días.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/system/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [{ config_key: "membership_trial_days", config_value: num }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      const result = data.results?.[0];
      if (result?.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Período de prueba por defecto actualizado.");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOnboarding = async () => {
    setSavingOnboarding(true);
    try {
      const res = await fetch("/api/admin/system/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: [
            { config_key: "signup_enabled", config_value: signupEnabled },
            {
              config_key: "onboarding_stage_mode",
              config_value: onboardingStageMode,
            },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Error al guardar");
        return;
      }
      const results = data.results || [];
      const hasError = results.some((r: { error?: string }) => r.error);
      if (hasError) {
        const firstError = results.find((r: { error?: string }) => r.error);
        toast.error(firstError?.error || "Error al guardar");
        return;
      }
      toast.success("Configuración de onboarding actualizada.");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSavingOnboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button
          size="icon"
          title="Volver al dashboard"
          variant="ghost"
          onClick={() => router.push("/admin/saas-management/dashboard")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-epoch-primary tracking-tight">
            Configuración SaaS
          </h1>
          <p className="text-muted-foreground mt-2">
            Parámetros por defecto del período de prueba y suscripciones
          </p>
        </div>
      </div>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período de prueba por defecto
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Número de días de prueba gratuita que se asignan a cada nueva
            organización al completar el onboarding. Este valor se usa cuando no
            se define un override por organización.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2 w-40">
              <Label htmlFor="trial_days">Días de prueba</Label>
              <Input
                id="trial_days"
                max={365}
                min={1}
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
            </div>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Flujos de onboarding (Etapa 1)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Controla el signup público y el modo de flujos duales (ópticas
            conocidas vs orgánicos). Durante la etapa 1, el signup suele estar
            deshabilitado; las ópticas conocidas usan /acceso-opticas.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Label className="text-base font-medium">
                Signup público habilitado
              </Label>
              <p className="text-sm text-muted-foreground">
                Si está activo, cualquiera puede registrarse en /signup. Si está
                desactivado, se redirige a /solicitar-demo.
              </p>
            </div>
            <Switch
              checked={signupEnabled}
              disabled={savingOnboarding}
              onCheckedChange={setSignupEnabled}
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Label className="text-base font-medium">
                Modo etapa 1 (flujos duales)
              </Label>
              <p className="text-sm text-muted-foreground">
                Indica que estamos en etapa 1: ópticas conocidas vía
                /acceso-opticas, orgánicos vía aprobación root.
              </p>
            </div>
            <Switch
              checked={onboardingStageMode}
              disabled={savingOnboarding}
              onCheckedChange={setOnboardingStageMode}
            />
          </div>
          <Button
            className="mt-2"
            disabled={savingOnboarding}
            onClick={handleSaveOnboarding}
          >
            {savingOnboarding ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar configuración onboarding
          </Button>
        </CardContent>
      </Card>

      <OpticasTokensSection />
    </div>
  );
}
