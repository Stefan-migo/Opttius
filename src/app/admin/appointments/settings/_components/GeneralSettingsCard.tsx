"use client";

import { Settings } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ScheduleSettings } from "../../../../api/admin/schedule-settings/_helpers/defaultSettings";

interface GeneralSettingsCardProps {
  settings: ScheduleSettings;
  onChange: (settings: ScheduleSettings) => void;
}

export function GeneralSettingsCard({
  settings,
  onChange,
}: GeneralSettingsCardProps) {
  const updateField = (field: keyof ScheduleSettings, value: number) => {
    onChange({ ...settings, [field]: value });
  };

  return (
    <Card className="border-none bg-admin-bg-tertiary shadow-premium-sm rounded-2xl sm:rounded-3xl overflow-hidden border border-admin-border-primary/30">
      <CardHeader className="pb-3 sm:pb-4 border-b border-admin-border-primary/10 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-bold text-admin-text-primary flex items-center gap-2 uppercase tracking-widest">
          <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-admin-accent-primary" />
          Configuración General
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
              Duración de Slot
            </Label>
            <div className="relative group">
              <Input
                className="h-10 sm:h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                max="60"
                min="5"
                step="5"
                type="number"
                value={settings.slot_duration_minutes}
                onChange={(e) =>
                  updateField(
                    "slot_duration_minutes",
                    parseInt(e.target.value) || 15,
                  )
                }
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
                className="h-10 sm:h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                max="240"
                min="15"
                step="15"
                type="number"
                value={settings.default_appointment_duration}
                onChange={(e) =>
                  updateField(
                    "default_appointment_duration",
                    parseInt(e.target.value) || 30,
                  )
                }
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
                className="h-10 sm:h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                max="48"
                min="0"
                type="number"
                value={settings.min_advance_booking_hours}
                onChange={(e) =>
                  updateField(
                    "min_advance_booking_hours",
                    parseInt(e.target.value) || 0,
                  )
                }
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
                className="h-10 sm:h-12 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold pl-4"
                max="365"
                min="1"
                type="number"
                value={settings.max_advance_booking_days}
                onChange={(e) =>
                  updateField(
                    "max_advance_booking_days",
                    parseInt(e.target.value) || 90,
                  )
                }
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
  );
}
