"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function SaasConfigPage() {
  const router = useRouter();
  const [trialDays, setTrialDays] = useState<string>("7");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/system/config")
      .then((res) => res.json())
      .then((data) => {
        const config = (data.configs || []).find(
          (c: { config_key: string }) =>
            c.config_key === "membership_trial_days",
        );
        if (config?.config_value != null) {
          setTrialDays(String(config.config_value));
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
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/saas-management/dashboard")}
          title="Volver al dashboard"
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

      <Card className="admin-card rounded-none">
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
                type="number"
                min={1}
                max={365}
                value={trialDays}
                onChange={(e) => setTrialDays(e.target.value)}
              />
            </div>
            <Button onClick={handleSave} disabled={saving}>
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
    </div>
  );
}
