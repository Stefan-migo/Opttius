"use client";

import { Bell, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";

export function PreferencesTab() {
  const { profile, updateProfile, refetchProfile } = useAuthContext();
  const { branches } = useBranch();
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState({
    timezone: profile?.timezone || "America/Santiago",
    language: profile?.language || "es",
    newsletter_subscribed: profile?.newsletter_subscribed ?? false,
    preferred_branch_id: profile?.preferred_branch_id || "",
  });

  useEffect(() => {
    if (profile) {
      setPreferences({
        timezone: profile.timezone || "America/Santiago",
        language: profile.language || "es",
        newsletter_subscribed: profile.newsletter_subscribed ?? false,
        preferred_branch_id: profile.preferred_branch_id || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      setIsLoading(true);
      await updateProfile({
        timezone: preferences.timezone,
        language: preferences.language,
        newsletter_subscribed: preferences.newsletter_subscribed,
        preferred_branch_id: preferences.preferred_branch_id || null,
      });
      await refetchProfile();
      toast.success("Preferencias actualizadas exitosamente");
    } catch (error) {
      console.error("Error updating preferences:", error);
      toast.error("Error al actualizar las preferencias");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-2xl overflow-hidden" variant="elevated">
      <CardHeader
        className="bg-[var(--admin-bg-tertiary)] p-4 sm:p-6"
        padding="lg"
      >
        <CardTitle className="flex items-center gap-2 sm:gap-3 text-base sm:text-lg md:text-xl font-bold font-cormorant tracking-tight">
          <div className="p-1.5 sm:p-2 bg-amber-500/10 rounded-lg sm:rounded-xl">
            <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
          </div>
          Personalización
        </CardTitle>
        <CardDescription className="text-sm">
          Ajusta el sistema a tus necesidades regionales.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6" padding="lg" spacing="relaxed">
        <div className="space-y-4 sm:space-y-6 max-w-md">
          <div className="space-y-3">
            <Label className="text-sm font-bold" htmlFor="timezone">
              Zona Horaria Regional
            </Label>
            <Select
              value={preferences.timezone}
              onValueChange={(value) =>
                setPreferences((prev) => ({ ...prev, timezone: value }))
              }
            >
              <SelectTrigger
                className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
                id="timezone"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                <SelectItem value="America/Santiago">
                  Santiago, Chile (GMT-3)
                </SelectItem>
                <SelectItem value="America/Argentina/Buenos_Aires">
                  Buenos Aires, Argentina (GMT-3)
                </SelectItem>
                <SelectItem value="America/Lima">Lima, Perú (GMT-5)</SelectItem>
                <SelectItem value="America/Bogota">
                  Bogotá, Colombia (GMT-5)
                </SelectItem>
                <SelectItem value="America/Mexico_City">
                  CDMX, México (GMT-6)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-bold" htmlFor="language">
              Idioma
            </Label>
            <Select
              value={preferences.language}
              onValueChange={(value) =>
                setPreferences((prev) => ({ ...prev, language: value }))
              }
            >
              <SelectTrigger
                className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
                id="language"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {branches.length > 1 && (
            <div className="space-y-3">
              <Label className="text-sm font-bold" htmlFor="preferred_branch">
                Sucursal Preferida
              </Label>
              <Select
                value={preferences.preferred_branch_id || "none"}
                onValueChange={(value) =>
                  setPreferences((prev) => ({
                    ...prev,
                    preferred_branch_id: value === "none" ? "" : value,
                  }))
                }
              >
                <SelectTrigger
                  className="h-12 rounded-2xl border-slate-200 dark:border-slate-800"
                  id="preferred_branch"
                >
                  <SelectValue placeholder="Sin preferencia" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl border-slate-200 dark:border-slate-800">
                  <SelectItem value="none">Sin preferencia</SelectItem>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-bold" htmlFor="newsletter">
                Recibir novedades y ofertas por email
              </Label>
              <p className="text-xs text-muted-foreground">
                Suscripción a newsletter
              </p>
            </div>
            <Switch
              checked={preferences.newsletter_subscribed}
              id="newsletter"
              onCheckedChange={(checked) =>
                setPreferences((prev) => ({
                  ...prev,
                  newsletter_subscribed: checked,
                }))
              }
            />
          </div>

          <Button
            shimmer
            className="w-full h-12 min-h-[44px] shadow-xl shadow-amber-500/20"
            onClick={handleSave}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5 mr-2" />
            )}
            Guardar Preferencias
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
