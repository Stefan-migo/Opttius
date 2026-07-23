"use client";

import { ArrowLeft, Loader2, Save, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { appLogger } from '@/lib/logger';
import { getBranchHeader } from "@/lib/utils/branch";

import type {
  DayConfig,
  ScheduleSettings,
} from "../../../api/admin/schedule-settings/_helpers/defaultSettings";
import { BlockedDatesCard } from "./_components/BlockedDatesCard";
import { GeneralSettingsCard } from "./_components/GeneralSettingsCard";
import { WorkingHoursCard } from "./_components/WorkingHoursCard";

export default function ScheduleSettingsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const router = useRouter();
  const {
    currentBranchId,
    isSuperAdmin,
    isLoading: branchLoading,
  } = useBranch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ScheduleSettings | null>(null);
  const [newBlockedDate, setNewBlockedDate] = useState("");

  const fetchSettings = useCallback(async () => {
    if (!user || authLoading) return;

    try {
      setLoading(true);
      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };
      const response = await fetch("/api/admin/schedule-settings", { headers });
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }

      const data = await response.json();
      setSettings(data.data ?? data.settings);
    } catch (error) {
      appLogger.error("Error fetching settings:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, user, authLoading]);

  // Fetch settings when user is ready or when global branch selection changes
  useEffect(() => {
    if (!branchLoading && !authLoading && user) {
      fetchSettings();
    }
  }, [currentBranchId, branchLoading, authLoading, user, fetchSettings]);

  const updateDayConfig = (
    day: keyof ScheduleSettings["working_hours"],
    field: keyof DayConfig,
    value: unknown,
  ) => {
    if (!settings) return;

    setSettings({
      ...settings,
      working_hours: {
        ...settings.working_hours,
        [day]: {
          ...settings.working_hours[day],
          [field]: value,
        },
      },
    });
  };

  const addBlockedDate = () => {
    if (!newBlockedDate || !settings) return;

    if (settings.blocked_dates.includes(newBlockedDate)) {
      toast.error("Esta fecha ya está bloqueada");
      return;
    }

    setSettings({
      ...settings,
      blocked_dates: [...settings.blocked_dates, newBlockedDate].sort(),
    });
    setNewBlockedDate("");
  };

  const removeBlockedDate = (date: string) => {
    if (!settings) return;

    setSettings({
      ...settings,
      blocked_dates: settings.blocked_dates.filter((d) => d !== date),
    });
  };

  const isGlobalView = !currentBranchId && isSuperAdmin;

  const handleSave = async () => {
    if (!settings) return;

    if (isGlobalView) {
      const confirmGlobal = window.confirm(
        "¿Está seguro de que desea guardar esta configuración de horarios GLOBALMENTE? Se aplicará a todas las sucursales existentes y futuras.",
      );
      if (!confirmGlobal) return;
    }

    setSaving(true);
    try {
      const headers = {
        "Content-Type": "application/json",
        ...getBranchHeader(currentBranchId),
      };
      const response = await fetch("/api/admin/schedule-settings", {
        method: "PUT",
        headers,
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar configuración");
      }

      toast.success("Configuración guardada exitosamente");
      router.push("/admin/appointments");
    } catch (error: unknown) {
      appLogger.error("Error saving settings:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al guardar configuración";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex items-center gap-4">
          <Button
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0"
            size="sm"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-epoch-primary">
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <div className="flex items-center gap-4">
          <Button
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl shrink-0"
            size="sm"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-epoch-primary">
              Error
            </h1>
            <p className="text-sm text-admin-text-tertiary mt-1">
              No se pudo cargar la configuración
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header - multi-row layout for harmony */}
      <div className="flex flex-col gap-4 sm:gap-6 pb-6 border-b border-admin-border-primary/10">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Button
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-white shadow-soft border border-admin-border-primary/30 text-admin-text-tertiary hover:text-admin-accent-primary transition-all shrink-0"
            size="icon"
            variant="ghost"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-admin-text-primary tracking-tight">
              Configuración de Horarios
              {isGlobalView && (
                <span className="block sm:inline sm:ml-2 text-sm sm:text-base font-bold text-admin-text-tertiary mt-1 sm:mt-0">
                  (Vista global)
                </span>
              )}
            </h1>
            <p className="text-[10px] sm:text-xs font-bold text-admin-text-tertiary uppercase tracking-widest mt-1.5 max-w-xl">
              {isGlobalView
                ? "Configura los horarios de operación para toda la organización"
                : "Personaliza los horarios de trabajo y disponibilidad de esta sucursal"}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            className="h-10 w-10 sm:h-12 sm:w-auto sm:px-8 rounded-xl bg-admin-accent-primary hover:bg-admin-accent-primary/90 text-white shadow-premium-md font-bold uppercase text-[10px] sm:text-[11px] tracking-widest transition-all active:scale-[0.98]"
            disabled={saving}
            onClick={handleSave}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Sincronizando...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Guardar Cambios</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
        <div className="lg:col-span-2 space-y-4 sm:space-y-6 md:space-y-8">
          <GeneralSettingsCard settings={settings} onChange={setSettings} />
          <WorkingHoursCard
            settings={settings}
            onDayConfigChange={updateDayConfig}
          />
        </div>

        <div className="space-y-4 sm:space-y-6 md:space-y-8">
          <BlockedDatesCard
            newBlockedDate={newBlockedDate}
            settings={settings}
            onAddBlockedDate={addBlockedDate}
            onNewBlockedDateChange={setNewBlockedDate}
            onRemoveBlockedDate={removeBlockedDate}
          />

          {/* Tips Card */}
          <Card className="border-none bg-admin-accent-primary/5 shadow-soft rounded-2xl sm:rounded-3xl overflow-hidden border border-admin-accent-primary/10">
            <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-admin-accent-primary" />
                <span className="text-[10px] sm:text-[11px] font-black text-admin-accent-primary uppercase tracking-wider">
                  Tip de Agenda
                </span>
              </div>
              <p className="text-[11px] sm:text-xs leading-relaxed text-admin-text-secondary font-medium">
                Recuerda que los **Slots** definen la rejilla visual, mientras
                que la **Duración por Defecto** determina el tamaño inicial de
                cada cita nueva. Mantén esta última como múltiplo del slot para
                una estética perfecta.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Final Save Button - Floating Style for convenience */}
      <div className="fixed bottom-8 right-8 z-50 md:hidden">
        <Button
          className="h-14 w-14 rounded-full bg-admin-accent-primary shadow-premium-lg text-white font-bold transition-all active:scale-90"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Save className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
