"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Save,
  Settings,
  Clock,
  Calendar,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useBranch } from "@/hooks/useBranch";
import { getBranchHeader } from "@/lib/utils/branch";
import { useAuthContext } from "@/contexts/AuthContext";
import { BranchSelector } from "@/components/admin/BranchSelector";

interface DayConfig {
  enabled: boolean;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
}

interface ScheduleSettings {
  slot_duration_minutes: number;
  default_appointment_duration: number;
  buffer_time_minutes: number;
  working_hours: {
    monday: DayConfig;
    tuesday: DayConfig;
    wednesday: DayConfig;
    thursday: DayConfig;
    friday: DayConfig;
    saturday: DayConfig;
    sunday: DayConfig;
  };
  blocked_dates: string[];
  min_advance_booking_hours: number;
  max_advance_booking_days: number;
}

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
      console.error("Error fetching settings:", error);
      toast.error("Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }, [currentBranchId, user, authLoading]);

  useEffect(() => {
    if (!branchLoading && !authLoading && user && !settings && !loading) {
      fetchSettings();
    }
  }, [branchLoading, authLoading, user, fetchSettings, settings, loading]);

  // Initial fetch
  useEffect(() => {
    if (!branchLoading && !authLoading && user) {
      fetchSettings();
    }
  }, []);

  const updateDayConfig = (
    day: keyof ScheduleSettings["working_hours"],
    field: keyof DayConfig,
    value: any,
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
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const dayLabels: Record<keyof ScheduleSettings["working_hours"], string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miércoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sábado",
    sunday: "Domingo",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">
              Cargando...
            </h1>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-azul-profundo">Error</h1>
            <p className="text-tierra-media">
              No se pudo cargar la configuración
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-admin-border-primary/10">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-11 w-11 rounded-xl bg-white shadow-soft border border-admin-border-primary/30 text-admin-text-tertiary hover:text-admin-accent-primary transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-black text-admin-text-primary tracking-tight">
              Configuración de Horarios {isGlobalView && "(VISTA GLOBAL)"}
            </h1>
            <p className="text-xs font-bold text-admin-text-tertiary uppercase tracking-widest mt-1">
              {isGlobalView
                ? "Configura los horarios de operación para toda la organización"
                : "Personaliza los horarios de trabajo y disponibilidad de esta sucursal"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isSuperAdmin && <BranchSelector />}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="h-12 px-8 rounded-xl bg-admin-accent-primary hover:bg-admin-accent-primary/90 text-white shadow-premium-md font-bold uppercase text-[11px] tracking-widest transition-all active:scale-[0.98]"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* General Settings - tertiary bg for form contrast (light in light mode) */}
          <Card className="border-none bg-admin-bg-tertiary shadow-premium-sm rounded-3xl overflow-hidden border border-admin-border-primary/30">
            <CardHeader className="pb-4 border-b border-admin-border-primary/10">
              <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2 uppercase tracking-widest">
                <Settings className="h-4 w-4 text-admin-accent-primary" />
                Configuración General
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-center sm:text-left">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                    Duración de Slot
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      min="5"
                      max="60"
                      step="5"
                      value={settings.slot_duration_minutes}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          slot_duration_minutes: parseInt(e.target.value) || 15,
                        })
                      }
                      className="h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-admin-text-tertiary uppercase tracking-tight">
                      min
                    </span>
                  </div>
                  <p className="text-[10px] text-admin-text-tertiary px-1">
                    Intervalo para bloques de reserva.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                    Duración por Defecto
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      min="15"
                      max="240"
                      step="15"
                      value={settings.default_appointment_duration}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          default_appointment_duration:
                            parseInt(e.target.value) || 30,
                        })
                      }
                      className="h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-admin-text-tertiary uppercase tracking-tight">
                      min
                    </span>
                  </div>
                  <p className="text-[10px] text-admin-text-tertiary px-1">
                    Se aplica a nuevas citas automáticamente.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                    Reserva Mínima
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      min="0"
                      max="48"
                      value={settings.min_advance_booking_hours}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          min_advance_booking_hours:
                            parseInt(e.target.value) || 0,
                        })
                      }
                      className="h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-admin-text-tertiary uppercase tracking-tight">
                      horas
                    </span>
                  </div>
                  <p className="text-[10px] text-admin-text-tertiary px-1">
                    Anticipación mínima requerida.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                    Reserva Máxima
                  </Label>
                  <div className="relative group">
                    <Input
                      type="number"
                      min="1"
                      max="365"
                      value={settings.max_advance_booking_days}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          max_advance_booking_days:
                            parseInt(e.target.value) || 90,
                        })
                      }
                      className="h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-admin-text-tertiary uppercase tracking-tight">
                      días
                    </span>
                  </div>
                  <p className="text-[10px] text-admin-text-tertiary px-1">
                    Hasta cuándo se puede agendar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Hours - tertiary bg for form contrast */}
          <Card className="border-none bg-admin-bg-tertiary shadow-premium-sm rounded-3xl overflow-hidden border border-admin-border-primary/30">
            <CardHeader className="pb-4 border-b border-admin-border-primary/10">
              <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2 uppercase tracking-widest">
                <Clock className="h-4 w-4 text-admin-info" />
                Horarios de Operación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {(
                Object.keys(settings.working_hours) as Array<
                  keyof ScheduleSettings["working_hours"]
                >
              ).map((day) => {
                const dayConfig = settings.working_hours[day];
                return (
                  <div
                    key={day}
                    className={cn(
                      "rounded-2xl p-4 transition-all duration-300 border",
                      dayConfig.enabled
                        ? "bg-white border-admin-border-primary/40 shadow-premium-sm"
                        : "bg-admin-bg-tertiary/10 border-transparent opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between mb-4 px-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            dayConfig.enabled
                              ? "bg-admin-success animate-pulse"
                              : "bg-admin-text-tertiary",
                          )}
                        />
                        <span className="text-sm font-black text-admin-text-primary uppercase tracking-tight">
                          {dayLabels[day]}
                        </span>
                      </div>
                      <Switch
                        checked={dayConfig.enabled}
                        onCheckedChange={(checked) =>
                          updateDayConfig(day, "enabled", checked)
                        }
                        className="data-[state=checked]:bg-admin-accent-primary"
                      />
                    </div>

                    {dayConfig.enabled && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                            Apertura
                          </Label>
                          <Input
                            type="time"
                            value={dayConfig.start_time}
                            onChange={(e) =>
                              updateDayConfig(day, "start_time", e.target.value)
                            }
                            className="h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                            Cierre Profesional
                          </Label>
                          <Input
                            type="time"
                            value={dayConfig.end_time}
                            onChange={(e) =>
                              updateDayConfig(day, "end_time", e.target.value)
                            }
                            className="h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                            Ini. Almuerzo
                          </Label>
                          <Input
                            type="time"
                            value={dayConfig.lunch_start || ""}
                            onChange={(e) =>
                              updateDayConfig(
                                day,
                                "lunch_start",
                                e.target.value || null,
                              )
                            }
                            className="h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                            Fin Almuerzo
                          </Label>
                          <Input
                            type="time"
                            value={dayConfig.lunch_end || ""}
                            onChange={(e) =>
                              updateDayConfig(
                                day,
                                "lunch_end",
                                e.target.value || null,
                              )
                            }
                            className="h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Blocked Dates - tertiary bg for form contrast */}
          <Card className="border-none bg-admin-bg-tertiary shadow-premium-sm rounded-3xl overflow-hidden border border-admin-border-primary/30 h-fit">
            <CardHeader className="pb-4 border-b border-admin-border-primary/10">
              <CardTitle className="text-sm font-bold text-admin-text-primary flex items-center gap-2 uppercase tracking-widest">
                <Calendar className="h-4 w-4 text-admin-error" />
                Fechas No Laborales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="flex flex-col gap-3">
                <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
                  Agregar Nueva Fecha
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={newBlockedDate}
                    onChange={(e) => setNewBlockedDate(e.target.value)}
                    className="h-11 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addBlockedDate}
                    className="h-11 rounded-xl bg-admin-bg-tertiary text-admin-text-primary hover:bg-admin-bg-tertiary/80 font-bold px-4"
                  >
                    +
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                {settings.blocked_dates.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {settings.blocked_dates.map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between bg-admin-bg-tertiary/20 border border-admin-border-primary/30 rounded-xl px-4 py-3 hover:bg-white transition-all group"
                      >
                        <span className="text-xs font-bold text-admin-text-primary">
                          {new Date(date).toLocaleDateString("es-CL", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlockedDate(date)}
                          className="h-7 w-7 p-0 rounded-lg text-admin-text-tertiary hover:text-admin-error hover:bg-admin-error/5 transition-all"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 px-4 rounded-3xl bg-admin-bg-tertiary/10 border border-dashed border-admin-border-primary/40">
                    <AlertCircle className="h-10 w-10 mx-auto mb-4 text-admin-text-tertiary opacity-30" />
                    <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                      Todo laborable
                    </p>
                    <p className="text-[9px] text-admin-text-tertiary mt-2">
                      No has bloqueado fechas específicas todavía.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="border-none bg-admin-accent-primary/5 shadow-soft rounded-3xl overflow-hidden border border-admin-accent-primary/10">
            <CardContent className="p-6 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-admin-accent-primary" />
                <span className="text-[11px] font-black text-admin-accent-primary uppercase tracking-wider">
                  Tip de Agenda
                </span>
              </div>
              <p className="text-xs leading-relaxed text-admin-text-secondary font-medium">
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
          onClick={handleSave}
          disabled={saving}
          className="h-14 w-14 rounded-full bg-admin-accent-primary shadow-premium-lg text-white font-bold transition-all active:scale-90"
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
