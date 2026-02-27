"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  User,
  Eye,
  Package,
  Truck,
  Wrench,
  AlertCircle,
  RefreshCw,
  Plus,
  Calendar as CalendarIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CUSTOM_SCROLLBAR_CSS =
  ".custom-scrollbar::-webkit-scrollbar{width:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.3);border-radius:10px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,0.5)}";

// Helper to check for appointments in a date
function hasAppointments(apts: Appointment[]) {
  return apts.length > 0;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status: string;
  customer?: {
    id: string;
    first_name?: string;
    last_name?: string;
  } | null;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_rut?: string;
  guest_email?: string;
  guest_phone?: string;
  notes?: string;
}

interface ScheduleSettings {
  slot_duration_minutes: number;
  working_hours: {
    [key: string]: {
      enabled: boolean;
      start_time: string;
      end_time: string;
      lunch_start?: string | null;
      lunch_end?: string | null;
    };
  };
}

interface AppointmentCalendarProps {
  view: "day" | "week" | "month";
  currentDate: Date;
  appointments: Appointment[];
  onAppointmentClick: (appointment: Appointment) => void;
  onDateChange: (date: Date) => void;
  onSlotClick?: (date: Date, time: string) => void;
  scheduleSettings?: ScheduleSettings | null;
  lastRefresh?: number;
}

export default function AppointmentCalendar({
  view,
  currentDate,
  appointments,
  onAppointmentClick,
  onDateChange,
  onSlotClick,
  scheduleSettings,
  lastRefresh,
}: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Force re-render when lastRefresh changes
  useEffect(() => {
    // This effect runs when lastRefresh changes, forcing component to re-render
    // with fresh appointment data
  }, [lastRefresh, appointments]);

  // Generate time slots based on schedule settings
  // If no settings, fallback to default (8:00 to 20:00)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];

    if (!scheduleSettings?.working_hours) {
      // Fallback: default slots from 8:00 to 20:00
      for (let hour = 8; hour < 20; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          slots.push(time);
        }
      }
      return slots;
    }

    // Get slot duration from settings (default 15 minutes)
    const slotDuration = scheduleSettings.slot_duration_minutes || 15;

    // Find the earliest start time and latest end time across all enabled days
    let earliestStart = 24; // hours
    let latestEnd = 0; // hours

    Object.values(scheduleSettings.working_hours).forEach((dayConfig) => {
      if (dayConfig.enabled) {
        const startHour = parseInt(dayConfig.start_time.split(":")[0]);
        const endHour = parseInt(dayConfig.end_time.split(":")[0]);
        const endMinute = parseInt(dayConfig.end_time.split(":")[1]);
        const endTimeDecimal = endHour + endMinute / 60;

        if (startHour < earliestStart) {
          earliestStart = startHour;
        }
        if (endTimeDecimal > latestEnd) {
          latestEnd = endTimeDecimal;
        }
      }
    });

    // Generate slots from earliest start to latest end
    let currentHour = Math.floor(earliestStart);
    let currentMinute = Math.round((earliestStart - currentHour) * 60);
    const endHour = Math.floor(latestEnd);
    const endMinute = Math.round((latestEnd - endHour) * 60);

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMinute < endMinute)
    ) {
      const time = `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`;
      slots.push(time);

      currentMinute += slotDuration;
      if (currentMinute >= 60) {
        currentHour += Math.floor(currentMinute / 60);
        currentMinute = currentMinute % 60;
      }
    }

    return slots;
  }, [scheduleSettings]);

  // Check if a time slot is available for a specific date based on schedule settings
  const isSlotAvailableForDate = (date: Date, timeSlot: string): boolean => {
    if (!scheduleSettings?.working_hours) {
      return true; // If no settings, assume all slots are available
    }

    // Get day name in lowercase (monday, tuesday, etc.)
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const dayIndex = date.getDay();
    const dayName = dayNames[dayIndex];
    const dayConfig = scheduleSettings.working_hours[dayName];

    if (!dayConfig || !dayConfig.enabled) {
      return false; // Day is disabled
    }

    // Parse time slot (format: HH:MM)
    const [slotHour, slotMinute] = timeSlot.split(":").map(Number);
    const slotTimeDecimal = slotHour + slotMinute / 60;

    // Parse working hours
    const [startHour, startMinute] = dayConfig.start_time
      .split(":")
      .map(Number);
    const startTimeDecimal = startHour + startMinute / 60;

    const [endHour, endMinute] = dayConfig.end_time.split(":").map(Number);
    const endTimeDecimal = endHour + endMinute / 60;

    // Check if slot is within working hours
    if (
      slotTimeDecimal < startTimeDecimal ||
      slotTimeDecimal >= endTimeDecimal
    ) {
      return false;
    }

    // Check if slot is during lunch break
    if (dayConfig.lunch_start && dayConfig.lunch_end) {
      const [lunchStartHour, lunchStartMinute] = dayConfig.lunch_start
        .split(":")
        .map(Number);
      const lunchStartDecimal = lunchStartHour + lunchStartMinute / 60;

      const [lunchEndHour, lunchEndMinute] = dayConfig.lunch_end
        .split(":")
        .map(Number);
      const lunchEndDecimal = lunchEndHour + lunchEndMinute / 60;

      if (
        slotTimeDecimal >= lunchStartDecimal &&
        slotTimeDecimal < lunchEndDecimal
      ) {
        return false;
      }
    }

    return true;
  };

  // Get week days
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    return days;
  }, [currentDate]);

  // Get month days
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(
      startDate.getDate() -
        startDate.getDay() +
        (startDate.getDay() === 0 ? -6 : 1),
    ); // Start from Monday

    const days: Date[] = [];
    const current = new Date(startDate);
    while (current <= lastDay || days.length < 35) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
      if (days.length >= 42) break; // 6 weeks max
    }
    return days;
  }, [currentDate]);

  const getAppointmentsForDate = (date: Date) => {
    // Use local date string to avoid UTC timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;
    return appointments.filter((apt) => apt.appointment_date === dateStr);
  };

  const getAppointmentTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      eye_exam: "bg-blue-100 border-blue-300 text-blue-800",
      consultation: "bg-green-100 border-green-300 text-green-800",
      fitting: "bg-purple-100 border-purple-300 text-purple-800",
      delivery: "bg-orange-100 border-orange-300 text-orange-800",
      repair: "bg-yellow-100 border-yellow-300 text-yellow-800",
      follow_up: "bg-indigo-100 border-indigo-300 text-indigo-800",
      emergency: "bg-red-100 border-red-300 text-red-800",
      other: "bg-gray-100 border-gray-300 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  const getAppointmentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled:
        "bg-admin-info/5 border-admin-info/30 text-admin-info hover:bg-admin-info/10 shadow-premium-sm",
      confirmed:
        "bg-admin-success/5 border-admin-success/30 text-admin-success hover:bg-admin-success/10 shadow-premium-sm",
      completed:
        "bg-admin-accent-secondary/5 border-admin-accent-secondary/30 text-admin-accent-secondary hover:bg-admin-accent-secondary/10 shadow-premium-sm",
      cancelled:
        "bg-admin-error/5 border-admin-error/30 text-admin-error hover:bg-admin-error/10 shadow-premium-sm",
      no_show:
        "bg-admin-bg-tertiary/20 border-admin-border-secondary text-admin-text-tertiary hover:bg-admin-bg-tertiary/40 shadow-premium-sm",
    };
    return colors[status] || colors.scheduled;
  };

  const getAppointmentTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      eye_exam: Eye,
      consultation: User,
      fitting: Package,
      delivery: Truck,
      repair: Wrench,
      follow_up: RefreshCw,
      emergency: AlertCircle,
      other: CalendarIcon,
    };
    return icons[type] || CalendarIcon;
  };

  const getAppointmentsForTimeSlot = (date: Date, timeSlot: string) => {
    // Use local date string to avoid UTC timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    return appointments.filter((apt) => {
      if (apt.appointment_date !== dateStr) return false;
      const aptTime = apt.appointment_time.substring(0, 5); // HH:MM
      const slotTime = timeSlot;
      // Check if appointment starts at or overlaps with this slot
      return (
        aptTime <= slotTime &&
        parseInt(aptTime.split(":")[0]) * 60 +
          parseInt(aptTime.split(":")[1]) +
          apt.duration_minutes >
          parseInt(slotTime.split(":")[0]) * 60 +
            parseInt(slotTime.split(":")[1])
      );
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date, time?: string) => {
    const now = new Date();
    if (time) {
      // Parse time slot (format: HH:MM:SS or HH:MM)
      const timeOnly = time.substring(0, 5); // Get HH:MM
      const [hours, minutes] = timeOnly.split(":").map(Number);
      const dateTime = new Date(date);
      dateTime.setHours(hours, minutes, 0, 0);
      return dateTime < now;
    }
    // For dates without time, check if it's before today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Day view: single column, optimized for mobile
  if (view === "day") {
    const dayDate = new Date(currentDate);
    const dayAppointments = getAppointmentsForDate(dayDate);

    return (
      <div
        className="space-y-4 pb-4"
        key={`day-view-${lastRefresh}-${appointments.length}`}
      >
        <style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_CSS }} />
        <div className="border border-admin-border-primary/20 rounded-2xl overflow-hidden bg-white/40">
          <div className="max-h-[70vh] sm:max-h-[700px] overflow-y-auto pr-1 custom-scrollbar relative z-10">
            {/* Day header - compact on mobile */}
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

            {/* Time slots - single column */}
            <div className="p-2 sm:p-3 space-y-1 w-full">
              {timeSlots.map((timeSlot) => {
                const slotAppointments = getAppointmentsForTimeSlot(
                  dayDate,
                  timeSlot,
                );
                const isSlotPast = isPast(dayDate, timeSlot);
                const hasAppointments = slotAppointments.length > 0;
                const isSlotAvailable = isSlotAvailableForDate(
                  dayDate,
                  timeSlot,
                );
                const isPastDate = dayDate < new Date() && !isToday(dayDate);
                const isPastTime = isSlotPast;
                const isClickable =
                  !hasAppointments &&
                  !isPastDate &&
                  !isPastTime &&
                  isSlotAvailable;

                return (
                  <div
                    key={timeSlot}
                    className="grid grid-cols-[auto_1fr] gap-2 sm:gap-3 min-h-[60px] sm:min-h-[70px] w-full items-stretch"
                  >
                    <div className="text-[9px] sm:text-[10px] font-black text-admin-text-tertiary py-3 sm:py-4 text-right pr-2 sm:pr-4 flex flex-col justify-start opacity-40">
                      <span>{timeSlot.split(":")[0]}</span>
                      <span className="text-[7px] sm:text-[8px] font-bold opacity-50">
                        {timeSlot.split(":")[1]}
                      </span>
                    </div>
                    <div
                      onClick={(e) => {
                        if (isClickable && onSlotClick) {
                          e.stopPropagation();
                          onSlotClick(dayDate, timeSlot);
                        }
                      }}
                      className={cn(
                        "min-h-[60px] sm:min-h-[70px] border border-admin-border-primary/20 rounded-xl p-1.5 sm:p-2 relative transition-all duration-300 group",
                        (!isSlotAvailable || isPastDate || isPastTime) &&
                          "bg-admin-bg-tertiary/10 opacity-40 cursor-not-allowed",
                        isToday(dayDate) &&
                          !isSlotPast &&
                          isSlotAvailable &&
                          "bg-admin-accent-primary/[0.02]",
                        isClickable &&
                          onSlotClick &&
                          "cursor-pointer hover:bg-white hover:border-admin-accent-primary/30 hover:shadow-premium-sm",
                      )}
                    >
                      {isClickable && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="h-6 w-6 bg-admin-accent-primary/10 rounded-full flex items-center justify-center">
                            <Plus className="h-3 w-3 text-admin-accent-primary" />
                          </div>
                        </div>
                      )}

                      {hasAppointments
                        ? slotAppointments.map((apt) => {
                            const Icon = getAppointmentTypeIcon(
                              apt.appointment_type,
                            );
                            const isMainSlot =
                              apt.appointment_time.substring(0, 5) === timeSlot;

                            if (!isMainSlot) return null;

                            return (
                              <div
                                key={apt.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAppointmentClick(apt);
                                }}
                                className={cn(
                                  "text-[9px] sm:text-[10px] p-2 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border backdrop-blur-md z-10 flex flex-col justify-between overflow-hidden",
                                  getAppointmentStatusColor(apt.status),
                                )}
                                style={{
                                  height: `${Math.max(56, (apt.duration_minutes / (scheduleSettings?.slot_duration_minutes || 15)) * 60 - 4)}px`,
                                  position: "absolute",
                                  width: "calc(100% - 8px)",
                                  top: "4px",
                                  left: "4px",
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

  if (view === "week") {
    return (
      <div
        className="space-y-4 pb-4"
        key={`week-view-${lastRefresh}-${appointments.length}`}
      >
        {/* Style for custom scrollbar to ensure visibility and interaction */}
        <style dangerouslySetInnerHTML={{ __html: CUSTOM_SCROLLBAR_CSS }} />

        {/* Wrapper with border so backdrop-blur on header doesn't clip the top-left corner */}
        <div className="border border-admin-border-primary/20 rounded-2xl overflow-hidden bg-white/40">
          <div className="max-h-[70vh] sm:max-h-[700px] overflow-auto pr-1 custom-scrollbar custom-calendar-grid relative z-10">
            {/* Week view: min-w enables horizontal scroll on narrow screens */}
            <div className="inline-block min-w-[520px] w-full">
              {/* Week Header */}
              <div className="grid grid-cols-8 gap-1.5 sm:gap-2 bg-admin-bg-tertiary/20 p-2 border-b border-admin-border-primary/30 backdrop-blur-md sticky top-0 z-20 [isolation:isolate]">
                <div className="flex items-center justify-center font-bold text-[10px] text-admin-text-tertiary uppercase tracking-widest pl-2">
                  <Clock className="h-3.5 w-3.5 mr-2 opacity-30" />
                  Hora
                </div>
                {weekDays.map((day, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "relative text-center py-2 px-1 rounded-xl transition-all duration-300 border border-transparent",
                      isToday(day)
                        ? "bg-admin-accent-primary/10 border-admin-accent-primary/20 shadow-premium-sm"
                        : "hover:bg-white/40",
                    )}
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
                    key={timeSlot}
                    className="grid grid-cols-8 gap-1.5 sm:gap-2 min-h-[60px] sm:min-h-[70px] w-full"
                  >
                    <div className="text-[10px] font-black text-admin-text-tertiary py-4 text-right pr-4 flex flex-col justify-start opacity-40">
                      <span>{timeSlot.split(":")[0]}</span>
                      <span className="text-[8px] font-bold opacity-50">
                        {timeSlot.split(":")[1]}
                      </span>
                    </div>
                    {weekDays.map((day, dayIdx) => {
                      const slotAppointments = getAppointmentsForTimeSlot(
                        day,
                        timeSlot,
                      );
                      const isSlotPast = isPast(day, timeSlot);
                      const hasAppointments = slotAppointments.length > 0;
                      const isSlotAvailable = isSlotAvailableForDate(
                        day,
                        timeSlot,
                      );
                      const isPastDate = day < new Date() && !isToday(day);
                      const isPastTime = isSlotPast;
                      const isClickable =
                        !hasAppointments &&
                        !isPastDate &&
                        !isPastTime &&
                        isSlotAvailable;

                      return (
                        <div
                          key={dayIdx}
                          onClick={(e) => {
                            if (isClickable && onSlotClick) {
                              e.stopPropagation();
                              onSlotClick(day, timeSlot);
                            }
                          }}
                          className={cn(
                            "min-h-[70px] border border-admin-border-primary/20 rounded-xl p-1 relative transition-all duration-300 group",
                            (!isSlotAvailable || isPastDate || isPastTime) &&
                              "bg-admin-bg-tertiary/10 opacity-40 cursor-not-allowed",
                            isToday(day) &&
                              !isSlotPast &&
                              isSlotAvailable &&
                              "bg-admin-accent-primary/[0.02]",
                            isClickable &&
                              onSlotClick &&
                              "cursor-pointer hover:bg-white hover:border-admin-accent-primary/30 hover:shadow-premium-sm",
                          )}
                        >
                          {isClickable && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="h-6 w-6 bg-admin-accent-primary/10 rounded-full flex items-center justify-center">
                                <Plus className="h-3 w-3 text-admin-accent-primary" />
                              </div>
                            </div>
                          )}

                          {hasAppointments
                            ? slotAppointments.map((apt) => {
                                const Icon = getAppointmentTypeIcon(
                                  apt.appointment_type,
                                );
                                const isMainSlot =
                                  apt.appointment_time.substring(0, 5) ===
                                  timeSlot;

                                if (!isMainSlot) return null; // Only show on the start slot

                                return (
                                  <div
                                    key={apt.id}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAppointmentClick(apt);
                                    }}
                                    className={cn(
                                      "text-[10px] p-2 rounded-xl cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border backdrop-blur-md z-10 flex flex-col justify-between overflow-hidden",
                                      getAppointmentStatusColor(apt.status),
                                    )}
                                    style={{
                                      height: `${(apt.duration_minutes / (scheduleSettings?.slot_duration_minutes || 15)) * 70 - 4}px`,
                                      position: "absolute",
                                      width: "calc(100% - 8px)",
                                      top: "4px",
                                      left: "4px",
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
                                        {apt.appointment_type.replace(
                                          /_/g,
                                          " ",
                                        )}
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

  // Month view
  return (
    <div
      className="space-y-4 pb-4"
      key={`month-view-${lastRefresh}-${appointments.length}`}
    >
      {/* Month Header */}
      <div className="grid grid-cols-7 gap-2 bg-admin-bg-tertiary/20 p-2 rounded-2xl border border-admin-border-primary/30 backdrop-blur-sm">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
          <div
            key={day}
            className="text-center font-bold text-[10px] text-admin-text-tertiary uppercase tracking-widest py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Month Days */}
      <div className="grid grid-cols-7 gap-2">
        {monthDays.map((day, idx) => {
          const dayAppointments = getAppointmentsForDate(day);
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          const isDayToday = isToday(day);
          const isDayPast = isPast(day);

          return (
            <Card
              key={idx}
              className={cn(
                "min-h-[140px] cursor-pointer hover:shadow-premium-md transition-all duration-300 border-admin-border-primary/20 bg-white/50 backdrop-blur-sm relative overflow-hidden group",
                !isCurrentMonth && "opacity-30",
                isDayPast && "bg-admin-bg-tertiary/10",
                isDayToday &&
                  "bg-admin-accent-primary/[0.03] border-admin-accent-primary/40 shadow-premium-sm ring-1 ring-admin-accent-primary/20",
              )}
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
                          key={apt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(apt);
                          }}
                          className={cn(
                            "text-[8px] p-1.5 rounded-lg cursor-pointer hover:scale-[1.03] transition-all border font-bold uppercase tracking-tighter truncate leading-tight shadow-sm",
                            getAppointmentStatusColor(apt.status),
                          )}
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

                {/* Empty state hover indicator */}
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
