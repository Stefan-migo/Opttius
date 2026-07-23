"use client";

import { Clock } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type {
  DayConfig,
  ScheduleSettings,
} from "../../../../api/admin/schedule-settings/_helpers/defaultSettings";

interface WorkingHoursCardProps {
  settings: ScheduleSettings;
  onDayConfigChange: (
    day: keyof ScheduleSettings["working_hours"],
    field: keyof DayConfig,
    value: unknown,
  ) => void;
}

const DAY_LABELS: Record<keyof ScheduleSettings["working_hours"], string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as Array<keyof ScheduleSettings["working_hours"]>;

export function WorkingHoursCard({
  settings,
  onDayConfigChange,
}: WorkingHoursCardProps) {
  return (
    <Card className="border-none bg-admin-bg-tertiary shadow-premium-sm rounded-2xl sm:rounded-3xl overflow-hidden border border-admin-border-primary/30">
      <CardHeader className="pb-3 sm:pb-4 border-b border-admin-border-primary/10 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-bold text-admin-text-primary flex items-center gap-2 uppercase tracking-widest">
          <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-admin-info" />
          Horarios de Operación
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 space-y-3 sm:space-y-4">
        {DAYS.map((day) => {
          const dayConfig = settings.working_hours[day];
          return (
            <div
              className={cn(
                "rounded-xl p-3 sm:p-4 transition-all duration-300 border",
                dayConfig.enabled
                  ? "bg-admin-bg-tertiary/50 border-admin-border-primary/20 shadow-none hover:shadow-md"
                  : "bg-admin-bg-tertiary/20 border-admin-border-primary/10 opacity-70",
              )}
              key={day}
            >
              <div className="flex items-center justify-between mb-3 sm:mb-4 px-0 sm:px-2">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      dayConfig.enabled
                        ? "bg-epoch-primary"
                        : "bg-admin-text-tertiary",
                    )}
                  />
                  <span className="text-xs sm:text-sm font-bold text-admin-text-primary uppercase tracking-tight">
                    {DAY_LABELS[day]}
                  </span>
                </div>
                <Switch
                  checked={dayConfig.enabled}
                  className="data-[state=checked]:bg-admin-accent-primary shrink-0"
                  onCheckedChange={(checked) =>
                    onDayConfigChange(day, "enabled", checked)
                  }
                />
              </div>

              {dayConfig.enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 animate-in slide-in-from-top-2 duration-300">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                      Apertura
                    </Label>
                    <Input
                      className="h-11 sm:h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs min-h-[44px]"
                      type="time"
                      value={dayConfig.start_time}
                      onChange={(e) =>
                        onDayConfigChange(day, "start_time", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                      <span className="hidden sm:inline">
                        Cierre Profesional
                      </span>
                      <span className="sm:hidden">Cierre</span>
                    </Label>
                    <Input
                      className="h-11 sm:h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs min-h-[44px]"
                      type="time"
                      value={dayConfig.end_time}
                      onChange={(e) =>
                        onDayConfigChange(day, "end_time", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                      <span className="hidden sm:inline">Ini. Almuerzo</span>
                      <span className="sm:hidden">Almuerzo Inicio</span>
                    </Label>
                    <Input
                      className="h-11 sm:h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs min-h-[44px]"
                      type="time"
                      value={dayConfig.lunch_start || ""}
                      onChange={(e) =>
                        onDayConfigChange(
                          day,
                          "lunch_start",
                          e.target.value || null,
                        )
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-admin-text-tertiary uppercase ml-1">
                      <span className="hidden sm:inline">Fin Almuerzo</span>
                      <span className="sm:hidden">Almuerzo Fin</span>
                    </Label>
                    <Input
                      className="h-11 sm:h-10 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs min-h-[44px]"
                      type="time"
                      value={dayConfig.lunch_end || ""}
                      onChange={(e) =>
                        onDayConfigChange(
                          day,
                          "lunch_end",
                          e.target.value || null,
                        )
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
