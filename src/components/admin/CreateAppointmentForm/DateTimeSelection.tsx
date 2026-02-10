import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimeSlot } from "./types/appointment.types";

interface DateTimeSelectionProps {
  date: string;
  time: string;
  duration: number;
  lockDateTime: boolean;
  availableSlots: TimeSlot[];
  loadingAvailability: boolean;
  minDate: string;
  maxDate: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
  onDurationChange: (duration: number) => void;
  onLoadAvailability: () => void;
  formatTime: (time: string) => string;
  isSlotAvailable: (timeSlot: string) => boolean;
}

export default function DateTimeSelection({
  date,
  time,
  duration,
  lockDateTime,
  availableSlots,
  loadingAvailability,
  minDate,
  maxDate,
  onDateChange,
  onTimeChange,
  onDurationChange,
  onLoadAvailability,
  formatTime,
  isSlotAvailable,
}: DateTimeSelectionProps) {
  return (
    <Card className="border-none bg-admin-bg-tertiary/20 shadow-premium-sm rounded-2xl overflow-hidden border border-admin-border-primary/30">
      <CardHeader className="pb-4 border-b border-admin-border-primary/10">
        <CardTitle className="flex items-center text-lg font-bold text-admin-text-primary tracking-tight">
          <div className="h-8 w-8 bg-admin-info/10 rounded-lg flex items-center justify-center mr-3">
            <Calendar className="h-4 w-4 text-admin-info" />
          </div>
          Agenda de la Sesión
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
              Fecha de Atención *
            </Label>
            <div className="relative">
              <Input
                type="date"
                value={date}
                onChange={(e) => onDateChange(e.target.value)}
                min={minDate}
                max={maxDate}
                className={cn(
                  "h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold px-4",
                  lockDateTime &&
                    "opacity-60 grayscale cursor-not-allowed bg-admin-bg-tertiary",
                )}
                disabled={lockDateTime}
                required
              />
              {lockDateTime && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[10px]">🔒</span>
                </div>
              )}
            </div>
            {lockDateTime && (
              <p className="text-[9px] font-bold text-admin-info uppercase tracking-tight ml-1">
                Fijada desde el Calendario Maestro
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
              Duración Estimada *
            </Label>
            <Select
              value={duration.toString()}
              onValueChange={(value) => onDurationChange(parseInt(value))}
            >
              <SelectTrigger className="h-11 rounded-xl border-admin-border-primary/50 bg-white/50 focus:bg-white transition-all font-bold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-admin-border-primary shadow-premium-lg">
                <SelectItem value="15" className="font-bold">
                  15 MINUTOS
                </SelectItem>
                <SelectItem value="30" className="font-bold">
                  30 MINUTOS
                </SelectItem>
                <SelectItem value="45" className="font-bold">
                  45 MINUTOS
                </SelectItem>
                <SelectItem value="60" className="font-bold">
                  1 HORA
                </SelectItem>
                <SelectItem value="90" className="font-bold">
                  1.5 HORAS
                </SelectItem>
                <SelectItem value="120" className="font-bold">
                  2 HORAS
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Available Time Slots Handling */}
        {date && (
          <div className="space-y-4 pt-4 border-t border-admin-border-primary/10">
            <div className="flex items-center justify-between px-1">
              <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                Bloques Disponibles
              </Label>
              {loadingAvailability && (
                <Loader2 className="h-3 w-3 animate-spin text-admin-accent-primary" />
              )}
            </div>

            {loadingAvailability ? (
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-10 bg-admin-bg-tertiary/30 rounded-lg animate-pulse"
                  />
                ))}
              </div>
            ) : availableSlots.filter((s) => s.available).length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-admin-bg-tertiary/10 border border-dashed border-admin-border-primary/30">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-10" />
                <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Sin disponibilidad inmediata
                </p>
                <p className="text-[9px] text-admin-text-tertiary mt-1">
                  Intente con otra fecha o verifique la configuración
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto p-1 custom-scrollbar">
                {availableSlots
                  .filter(
                    (slot) =>
                      slot && slot.time_slot && slot.available !== false,
                  )
                  .map((slot) => {
                    const isSelected = time === slot.time_slot;
                    const isLocked = lockDateTime && isSelected;

                    return (
                      <Button
                        key={slot.time_slot}
                        type="button"
                        variant="ghost"
                        onClick={(e) => {
                          if (lockDateTime && !isSelected) return;
                          e.preventDefault();
                          onTimeChange(slot.time_slot);
                        }}
                        className={cn(
                          "h-10 rounded-xl font-black text-[10px] tracking-tighter transition-all duration-300 border flex flex-col items-center justify-center p-0",
                          isSelected
                            ? "bg-admin-accent-primary text-white border-admin-accent-primary shadow-premium-sm scale-[1.05] z-10"
                            : "bg-white border-admin-border-primary/30 text-admin-text-secondary hover:border-admin-accent-primary/40 hover:bg-admin-accent-primary/[0.02]",
                          lockDateTime &&
                            !isSelected &&
                            "opacity-30 grayscale cursor-not-allowed",
                        )}
                        disabled={lockDateTime && !isSelected}
                      >
                        <span className="leading-none">
                          {formatTime(slot.time_slot)}
                        </span>
                        {isLocked && (
                          <span className="text-[8px] mt-0.5">🔒</span>
                        )}
                      </Button>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}