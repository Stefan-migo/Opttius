"use client";

import { Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CUSTOM_SCROLLBAR_CSS,
  getAppointmentsForDate,
  getAppointmentsForTimeSlot,
  getAppointmentStatusColor,
  getAppointmentTypeIcon,
  isPast,
  isSlotAvailableForDate,
  isToday,
} from "./appointmentCalendarHelpers";
import type { Appointment, ScheduleSettings } from "./appointmentCalendarHelpers";

interface CalendarDayViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
  scheduleSettings?: ScheduleSettings | null;
  lastRefresh?: number;
  timeSlots: string[];
}

export default function CalendarDayView({
  currentDate,
  appointments,
  onAppointmentClick,
  onSlotClick,
  scheduleSettings,
  lastRefresh,
  timeSlots,
}: CalendarDayViewProps) {
  const dayDate = new Date(currentDate);
  const dayAppointments = getAppointmentsForDate(appointments, dayDate);

  return (
    <div
      className="space-y-4 pb-4"
      key={`day-view-${lastRefresh}-${appointments.length}`}
    >
      <style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_CSS }} />
      <div className="border border-admin-border-primary/20 rounded-2xl overflow-hidden bg-white/40">
        <div className="max-h-[70vh] sm:max-h-[700px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
          {/* Day header */}
          <div className="grid grid-cols-[auto_1fr] gap-2 sm:gap-3 bg-admin-bg-tertiary/20 p-2 sm:p-3 border-b border-admin-border-primary/30 backdrop-blur-md sticky top-0 z-20 [isolation:isolate]">
            <div className="flex items-center justify-center font-bold text-[9px] sm:text-[10px] text-admin-text-tertiary uppercase tracking-widest">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-2 opacity-30" />
              Hora
            </div>
            <div
              className={cn(
                "text-center py-2 px-1 rounded-xl border border-transparent",
                isToday(dayDate)
                  ? "bg-admin-accent-primary/10 border-admin-accent-primary/20 shadow-premium-sm"
                  : "hover:bg-white/40",
              )}
            >
              <div
                className={cn(
                  "text-[9px] sm:text-[10px] font-bold uppercase tracking-tight",
                  isToday(dayDate)
                    ? "text-admin-accent-primary"
                    : "text-admin-text-tertiary",
                )}
              >
                {dayDate.toLocaleDateString("es-CL", { weekday: "long" })}
              </div>
              <div
                className={cn(
                  "text-lg sm:text-xl font-black tracking-tighter",
                  isToday(dayDate)
                    ? "text-admin-accent-primary"
                    : "text-admin-text-primary",
                )}
              >
                {dayDate.getDate()}{" "}
                {dayDate.toLocaleDateString("es-CL", { month: "short" })}
              </div>
            </div>
          </div>

          {/* Time slots */}
          <div className="p-2 sm:p-3 space-y-1 w-full">
            {timeSlots.map((timeSlot) => {
              const slotAppointments = getAppointmentsForTimeSlot(
                appointments,
                dayDate,
                timeSlot,
              );
              const isSlotPast = isPast(dayDate, timeSlot);
              const hasApts = slotAppointments.length > 0;
              const isSlotAvailable = isSlotAvailableForDate(
                dayDate,
                timeSlot,
                scheduleSettings,
              );
              const isPastDate = dayDate < new Date() && !isToday(dayDate);
              const isPastTime = isSlotPast;
              const isClickable =
                !hasApts && !isPastDate && !isPastTime && isSlotAvailable;

              return (
                <div
                  className="grid grid-cols-[auto_1fr] gap-2 sm:gap-3 min-h-[60px] sm:min-h-[70px] w-full items-stretch"
                  key={timeSlot}
                >
                  <div className="text-[9px] sm:text-[10px] font-black text-admin-text-tertiary py-3 sm:py-4 text-right pr-2 sm:pr-4 flex flex-col justify-start opacity-40">
                    <span>{timeSlot.split(":")[0]}</span>
                    <span className="text-[7px] sm:text-[8px] font-bold opacity-50">
                      {timeSlot.split(":")[1]}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "min-h-[60px] sm:min-h-[70px] border border-admin-border-primary/20 rounded-xl p-1.5 sm:p-2 relative transition-all duration-300 group",
                      (!isSlotAvailable || isPastDate || isPastTime) &&
                        "bg-admin-bg-tertiary/10 opacity-40 cursor-not-allowed",
                      isToday(dayDate) && !isSlotPast && isSlotAvailable &&
                        "bg-admin-accent-primary/[0.02]",
                      isClickable && onSlotClick &&
                        "cursor-pointer hover:bg-white hover:border-admin-accent-primary/30 hover:shadow-premium-sm",
                    )}
                    onClick={(e) => {
                      if (isClickable && onSlotClick) {
                        e.stopPropagation();
                        onSlotClick(dayDate, timeSlot);
                      }
                    }}
                  >
                    {isClickable && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="h-6 w-6 bg-admin-accent-primary/10 rounded-full flex items-center justify-center">
                          <Plus className="h-3 w-3 text-admin-accent-primary" />
                        </div>
                      </div>
                    )}

                    {hasApts
                      ? slotAppointments.map((apt) => {
                          const Icon = getAppointmentTypeIcon(apt.appointment_type);
                          const isMainSlot = apt.appointment_time.substring(0, 5) === timeSlot;
                          if (!isMainSlot) return null;

                          return (
                            <div
                              className={cn(
                                "text-[9px] sm:text-[10px] p-2 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border backdrop-blur-md z-10 flex flex-col justify-between overflow-hidden",
                                getAppointmentStatusColor(apt.status),
                              )}
                              key={apt.id}
                              style={{
                                height: `${Math.max(56, (apt.duration_minutes / (scheduleSettings?.slot_duration_minutes || 15)) * 60 - 4)}px`,
                                position: "absolute",
                                width: "calc(100% - 8px)",
                                top: "4px",
                                left: "4px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                onAppointmentClick(apt);
                              }}
                            >
                              <div className="space-y-0.5 sm:space-y-1">
                                <div className="flex items-center gap-1 sm:gap-1.5">
                                  <Icon className="h-2.5 w-2.5 sm:h-3 sm:w-3 opacity-70 shrink-0" />
                                  <span className="font-black truncate uppercase tracking-tighter">
                                    {apt.customer
                                      ? `${apt.customer.first_name || ""} ${apt.customer.last_name || ""}`.trim()
                                      : `${apt.guest_first_name || ""} ${apt.guest_last_name || ""}`.trim()}
                                  </span>
                                </div>
                                <div className="text-[8px] sm:text-[9px] font-bold opacity-60 uppercase tracking-widest truncate">
                                  {apt.appointment_type.replace(/_/g, " ")}
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-current/10 mt-auto">
                                <span className="font-bold opacity-70 text-[8px] sm:text-[9px]">
                                  {apt.appointment_time.substring(0, 5)}
                                </span>
                                <span className="px-1 sm:px-1.5 py-0.5 rounded bg-white/30 font-black text-[7px] sm:text-[8px] uppercase">
                                  {apt.duration_minutes}m
                                </span>
                              </div>
                            </div>
                          );
                        })
                      : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
