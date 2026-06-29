"use client";

import { Clock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CUSTOM_SCROLLBAR_CSS,
  getAppointmentsForTimeSlot,
  getAppointmentStatusColor,
  getAppointmentTypeIcon,
  isPast,
  isSlotAvailableForDate,
  isToday,
} from "./appointmentCalendarHelpers";
import type { Appointment, ScheduleSettings } from "./appointmentCalendarHelpers";

interface CalendarWeekViewProps {
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onSlotClick?: (date: Date, time: string) => void;
  scheduleSettings?: ScheduleSettings | null;
  lastRefresh?: number;
  timeSlots: string[];
  weekDays: Date[];
}

export default function CalendarWeekView({
  currentDate,
  appointments,
  onAppointmentClick,
  onSlotClick,
  scheduleSettings,
  lastRefresh,
  timeSlots,
  weekDays,
}: CalendarWeekViewProps) {
  return (
    <div
      className="space-y-4 pb-4"
      key={`week-view-${lastRefresh}-${appointments.length}`}
    >
      <style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_CSS }} />

      <div className="border border-admin-border-primary/20 rounded-2xl overflow-hidden bg-white/40">
        <div className="max-h-[70vh] sm:max-h-[700px] overflow-auto pr-1 custom-scrollbar custom-calendar-grid relative z-10">
          <div className="inline-block min-w-[520px] w-full">
            {/* Week Header */}
            <div className="grid grid-cols-8 gap-1.5 sm:gap-2 bg-admin-bg-tertiary/20 p-2 border-b border-admin-border-primary/30 backdrop-blur-md sticky top-0 z-20 [isolation:isolate]">
              <div className="flex items-center justify-center font-bold text-[10px] text-admin-text-tertiary uppercase tracking-widest pl-2">
                <Clock className="h-3.5 w-3.5 mr-2 opacity-30" />
                Hora
              </div>
              {weekDays.map((day, idx) => (
                <div
                  className={cn(
                    "relative text-center py-2 px-1 rounded-xl transition-all duration-300 border border-transparent",
                    isToday(day)
                      ? "bg-admin-accent-primary/10 border-admin-accent-primary/20 shadow-premium-sm"
                      : "hover:bg-white/40",
                  )}
                  key={idx}
                >
                  <div
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-tight",
                      isToday(day)
                        ? "text-admin-accent-primary"
                        : "text-admin-text-tertiary",
                    )}
                  >
                    {day.toLocaleDateString("es-CL", { weekday: "short" })}
                  </div>
                  <div
                    className={cn(
                      "text-xl font-black tracking-tighter",
                      isToday(day)
                        ? "text-admin-accent-primary"
                        : "text-admin-text-primary",
                    )}
                  >
                    {day.getDate()}
                  </div>
                  {isToday(day) && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-admin-accent-primary rounded-full" />
                  )}
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="p-2 space-y-1 w-full relative">
              {timeSlots.map((timeSlot) => (
                <div
                  className="grid grid-cols-8 gap-1.5 sm:gap-2 min-h-[60px] sm:min-h-[70px] w-full"
                  key={timeSlot}
                >
                  <div className="text-[10px] font-black text-admin-text-tertiary py-4 text-right pr-4 flex flex-col justify-start opacity-40">
                    <span>{timeSlot.split(":")[0]}</span>
                    <span className="text-[8px] font-bold opacity-50">
                      {timeSlot.split(":")[1]}
                    </span>
                  </div>
                  {weekDays.map((day, dayIdx) => {
                    const slotAppointments = getAppointmentsForTimeSlot(
                      appointments,
                      day,
                      timeSlot,
                    );
                    const isSlotPast = isPast(day, timeSlot);
                    const hasApts = slotAppointments.length > 0;
                    const isSlotAvailable = isSlotAvailableForDate(
                      day,
                      timeSlot,
                      scheduleSettings,
                    );
                    const isPastDate = day < new Date() && !isToday(day);
                    const isPastTime = isSlotPast;
                    const isClickable =
                      !hasApts && !isPastDate && !isPastTime && isSlotAvailable;

                    return (
                      <div
                        className={cn(
                          "min-h-[70px] border border-admin-border-primary/20 rounded-xl p-1 relative transition-all duration-300 group",
                          (!isSlotAvailable || isPastDate || isPastTime) &&
                            "bg-admin-bg-tertiary/10 opacity-40 cursor-not-allowed",
                          isToday(day) && !isSlotPast && isSlotAvailable &&
                            "bg-admin-accent-primary/[0.02]",
                          isClickable && onSlotClick &&
                            "cursor-pointer hover:bg-white hover:border-admin-accent-primary/30 hover:shadow-premium-sm",
                        )}
                        key={dayIdx}
                        onClick={(e) => {
                          if (isClickable && onSlotClick) {
                            e.stopPropagation();
                            onSlotClick(day, timeSlot);
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
                              const isMainSlot =
                                apt.appointment_time.substring(0, 5) === timeSlot;
                              if (!isMainSlot) return null;

                              return (
                                <div
                                  className={cn(
                                    "text-[10px] p-2 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border backdrop-blur-md z-10 flex flex-col justify-between overflow-hidden",
                                    getAppointmentStatusColor(apt.status),
                                  )}
                                  key={apt.id}
                                  style={{
                                    height: `${(apt.duration_minutes / (scheduleSettings?.slot_duration_minutes || 15)) * 70 - 4}px`,
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
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <Icon className="h-3 w-3 opacity-70" />
                                      <span className="font-black truncate uppercase tracking-tighter">
                                        {apt.customer
                                          ? `${apt.customer.first_name || ""} ${apt.customer.last_name || ""}`.trim()
                                          : `${apt.guest_first_name || ""} ${apt.guest_last_name || ""}`.trim()}
                                      </span>
                                    </div>
                                    <div className="text-[9px] font-bold opacity-60 uppercase tracking-widest truncate">
                                      {apt.appointment_type.replace(/_/g, " ")}
                                    </div>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-current/10 mt-auto">
                                    <span className="font-bold opacity-70">
                                      {apt.appointment_time.substring(0, 5)}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded bg-white/30 font-black text-[8px] uppercase">
                                      {apt.duration_minutes}m
                                    </span>
                                  </div>
                                </div>
                              );
                            })
                          : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
