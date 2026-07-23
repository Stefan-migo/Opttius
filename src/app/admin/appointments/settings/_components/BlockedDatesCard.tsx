"use client";

import { AlertCircle, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { ScheduleSettings } from "../../../../api/admin/schedule-settings/_helpers/defaultSettings";

interface BlockedDatesCardProps {
  settings: ScheduleSettings;
  newBlockedDate: string;
  onNewBlockedDateChange: (value: string) => void;
  onAddBlockedDate: () => void;
  onRemoveBlockedDate: (date: string) => void;
}

export function BlockedDatesCard({
  settings,
  newBlockedDate,
  onNewBlockedDateChange,
  onAddBlockedDate,
  onRemoveBlockedDate,
}: BlockedDatesCardProps) {
  return (
    <Card className="border-none bg-admin-bg-tertiary shadow-premium-sm rounded-2xl sm:rounded-3xl overflow-hidden border border-admin-border-primary/30 h-fit">
      <CardHeader className="pb-3 sm:pb-4 border-b border-admin-border-primary/10 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-xs sm:text-sm font-bold text-admin-text-primary flex items-center gap-2 uppercase tracking-widest">
          <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-admin-error" />
          Fechas No Laborales
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="flex flex-col gap-2 sm:gap-3">
          <Label className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-widest ml-1">
            Agregar Nueva Fecha
          </Label>
          <div className="flex gap-2">
            <Input
              className="h-10 sm:h-11 rounded-xl bg-admin-bg-tertiary/20 border-admin-border-primary/40 focus:bg-white transition-all font-bold text-xs flex-1 min-h-[44px]"
              type="date"
              value={newBlockedDate}
              onChange={(e) => onNewBlockedDateChange(e.target.value)}
            />
            <Button
              className="h-10 sm:h-11 w-11 sm:w-auto sm:px-4 rounded-xl bg-admin-bg-tertiary text-admin-text-primary hover:bg-admin-bg-tertiary/80 font-bold shrink-0"
              type="button"
              onClick={onAddBlockedDate}
            >
              +
            </Button>
          </div>
        </div>

        <div className="space-y-2 sm:space-y-3">
          {settings.blocked_dates.length > 0 ? (
            <div className="flex flex-col gap-2">
              {settings.blocked_dates.map((date) => (
                <div
                  className="flex items-center justify-between bg-admin-bg-tertiary/20 border border-admin-border-primary/30 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-white transition-all group"
                  key={date}
                >
                  <span className="text-[11px] sm:text-xs font-bold text-admin-text-primary truncate">
                    {new Date(date).toLocaleDateString("es-CL", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  <Button
                    className="h-8 w-8 sm:h-7 sm:w-7 p-0 rounded-lg text-admin-text-tertiary hover:text-admin-error hover:bg-admin-error/5 transition-all shrink-0"
                    size="sm"
                    type="button"
                    variant="ghost"
                    onClick={() => onRemoveBlockedDate(date)}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 sm:py-10 px-4 rounded-2xl sm:rounded-3xl bg-admin-bg-tertiary/10 border border-dashed border-admin-border-primary/40">
              <AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 sm:mb-4 text-admin-text-tertiary opacity-30" />
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
  );
}
