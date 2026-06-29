/**
 * Appointment Calendar Helpers — pure functions extracted from AppointmentCalendar.tsx.
 *
 * No behavioral changes — pure extraction.
 */

import { AlertCircle, Calendar as CalendarIcon, Clock, Eye, Package, Plus, RefreshCw, Truck, User, Wrench } from "lucide-react";

export interface Appointment {
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

export interface ScheduleSettings {
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

export const CUSTOM_SCROLLBAR_CSS =
  ".custom-scrollbar::-webkit-scrollbar{width:6px}.custom-scrollbar::-webkit-scrollbar-track{background:transparent}.custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(148,163,184,0.3);border-radius:10px}.custom-scrollbar::-webkit-scrollbar-thumb:hover{background:rgba(148,163,184,0.5)}";

export function hasAppointments(apts: Appointment[]) {
  return apts.length > 0;
}

export function getAppointmentTypeColor(type: string) {
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
}

export function getAppointmentStatusColor(status: string) {
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
}

export function getAppointmentTypeIcon(type: string) {
  const icons: Record<string, typeof Eye> = {
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
}

export function getAppointmentsForDate(appointments: Appointment[], date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  return appointments.filter((apt) => apt.appointment_date === dateStr);
}

export function getAppointmentsForTimeSlot(appointments: Appointment[], date: Date, timeSlot: string) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;

  return appointments.filter((apt) => {
    if (apt.appointment_date !== dateStr) return false;
    const aptTime = apt.appointment_time.substring(0, 5);
    return (
      aptTime <= timeSlot &&
      parseInt(aptTime.split(":")[0]) * 60 +
        parseInt(aptTime.split(":")[1]) +
        apt.duration_minutes >
        parseInt(timeSlot.split(":")[0]) * 60 +
          parseInt(timeSlot.split(":")[1])
    );
  });
}

export function isToday(date: Date) {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isPast(date: Date, time?: string) {
  const now = new Date();
  if (time) {
    const timeOnly = time.substring(0, 5);
    const [hours, minutes] = timeOnly.split(":").map(Number);
    const dateTime = new Date(date);
    dateTime.setHours(hours, minutes, 0, 0);
    return dateTime < now;
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  return checkDate < today;
}

export function isSlotAvailableForDate(
  date: Date,
  timeSlot: string,
  scheduleSettings?: ScheduleSettings | null,
): boolean {
  if (!scheduleSettings?.working_hours) return true;

  const dayNames = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];
  const dayIndex = date.getDay();
  const dayName = dayNames[dayIndex];
  const dayConfig = scheduleSettings.working_hours[dayName];

  if (!dayConfig || !dayConfig.enabled) return false;

  const [slotHour, slotMinute] = timeSlot.split(":").map(Number);
  const slotTimeDecimal = slotHour + slotMinute / 60;

  const [startHour, startMinute] = dayConfig.start_time.split(":").map(Number);
  const startTimeDecimal = startHour + startMinute / 60;

  const [endHour, endMinute] = dayConfig.end_time.split(":").map(Number);
  const endTimeDecimal = endHour + endMinute / 60;

  if (slotTimeDecimal < startTimeDecimal || slotTimeDecimal >= endTimeDecimal) return false;

  if (dayConfig.lunch_start && dayConfig.lunch_end) {
    const [lunchStartHour, lunchStartMinute] = dayConfig.lunch_start.split(":").map(Number);
    const lunchStartDecimal = lunchStartHour + lunchStartMinute / 60;

    const [lunchEndHour, lunchEndMinute] = dayConfig.lunch_end.split(":").map(Number);
    const lunchEndDecimal = lunchEndHour + lunchEndMinute / 60;

    if (slotTimeDecimal >= lunchStartDecimal && slotTimeDecimal < lunchEndDecimal) return false;
  }

  return true;
}

export function generateTimeSlots(scheduleSettings?: ScheduleSettings | null): string[] {
  const slots: string[] = [];

  if (!scheduleSettings?.working_hours) {
    for (let hour = 8; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        slots.push(
          `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
        );
      }
    }
    return slots;
  }

  const slotDuration = scheduleSettings.slot_duration_minutes || 15;

  let earliestStart = 24;
  let latestEnd = 0;

  Object.values(scheduleSettings.working_hours).forEach((dayConfig) => {
    if (dayConfig.enabled) {
      const startHour = parseInt(dayConfig.start_time.split(":")[0]);
      const endHour = parseInt(dayConfig.end_time.split(":")[0]);
      const endMinute = parseInt(dayConfig.end_time.split(":")[1]);
      const endTimeDecimal = endHour + endMinute / 60;

      if (startHour < earliestStart) earliestStart = startHour;
      if (endTimeDecimal > latestEnd) latestEnd = endTimeDecimal;
    }
  });

  let currentHour = Math.floor(earliestStart);
  let currentMinute = Math.round((earliestStart - currentHour) * 60);
  const endHour = Math.floor(latestEnd);
  const endMinute = Math.round((latestEnd - endHour) * 60);

  while (
    currentHour < endHour ||
    (currentHour === endHour && currentMinute < endMinute)
  ) {
    slots.push(
      `${currentHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`,
    );
    currentMinute += slotDuration;
    if (currentMinute >= 60) {
      currentHour += Math.floor(currentMinute / 60);
      currentMinute = currentMinute % 60;
    }
  }

  return slots;
}

export function getWeekDays(currentDate: Date): Date[] {
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    days.push(date);
  }
  return days;
}

export function getMonthDays(currentDate: Date): Date[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1));

  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= lastDay || days.length < 35) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
    if (days.length >= 42) break;
  }
  return days;
}
