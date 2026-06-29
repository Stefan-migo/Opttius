"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  getAppointmentsForDate,
  getAppointmentStatusColor,
  hasAppointments,
  isPast,
  isToday,
} from "./appointmentCalendarHelpers";
import type { Appointment } from "./appointmentCalendarHelpers";

interface CalendarMonthViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateChange: (date: Date) => void;
  monthDays: Date[];
}

export default function CalendarMonthView({
  currentDate,
  appointments,
  onAppointmentClick,
  onDateChange,
  monthDays,
}: CalendarMonthViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  return (
    <div className="space-y-4 pb-4">
      {/* Month Header */}
      <div className="grid grid-cols-7 gap-2 bg-admin-bg-tertiary/20 p-2 rounded-2xl border border-admin-border-primary/30 backdrop-blur-sm">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <div
            className="text-center font-bold text-[10px] text-admin-text-tertiary uppercase tracking-widest py-2"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month Days */}
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, idx) => {
          const dayAppointments = getAppointmentsForDate(appointments, day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isDayToday = isToday(day);
          const isDayPast = isPast(day);

          return (
            <Card
              className={cn(
                "min-h-[140px] cursor-pointer hover:shadow-premium-md transition-all duration-300 border-admin-border-primary/20 bg-white/50 backdrop-blur-sm relative overflow-hidden group",
                !isCurrentMonth && "opacity-30",
                isDayPast && "bg-admin-bg-tertiary/10",
                isDayToday &&
                  "bg-admin-accent-primary/[0.03] border-admin-accent-primary/40 shadow-premium-sm ring-1 ring-admin-accent-primary/20",
              )}
              key={idx}
              onClick={() => {
                setSelectedDate(day);
                onDateChange(day);
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={cn(
                      "text-sm font-black tracking-tighter",
                      isDayToday
                        ? "text-admin-accent-primary text-lg"
                        : "text-admin-text-secondary",
                    )}
                  >
                    {day.getDate()}
                  </span>
                  {dayAppointments.length > 0 && (
                    <div className="h-1.5 w-1.5 bg-admin-accent-primary rounded-full animate-pulse" />
                  )}
                </div>

                {dayAppointments.length > 0 && (
                  <div className="space-y-1.5">
                    {dayAppointments.slice(0, 3).map((apt) => {
                      return (
                        <div
                          className={cn(
                            "text-[8px] p-1.5 rounded-lg cursor-pointer hover:scale-[1.03] transition-all border font-bold uppercase tracking-tighter truncate leading-tight shadow-sm",
                            getAppointmentStatusColor(apt.status),
                          )}
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                        >
                          <div className="flex items-center gap-1">
                            <span className="opacity-70">
                              {apt.appointment_time.substring(0, 5)}
                            </span>
                            <span className="truncate">
                              {apt.customer
                                ? `${apt.customer.first_name}`
                                : `${apt.guest_first_name}`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {dayAppointments.length > 3 && (
                      <div className="text-[9px] font-black text-admin-text-tertiary text-center pt-1 opacity-50 uppercase">
                        +{dayAppointments.length - 3} adicional
                      </div>
                    )}
                  </div>
                )}

                {!isDayPast && !hasAppointments(dayAppointments) && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-admin-accent-primary/[0.02]">
                    <Plus className="h-4 w-4 text-admin-accent-primary opacity-30" />
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
