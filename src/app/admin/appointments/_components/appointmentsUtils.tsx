"use client";

import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  Package,
  RefreshCw,
  Truck,
  User,
  Wrench,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

// ─── Types ────────────────────────────────────────────────────────────────────

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
    email?: string;
    phone?: string;
  } | null;
  guest_first_name?: string;
  guest_last_name?: string;
  guest_rut?: string;
  guest_email?: string;
  guest_phone?: string;
  assigned_staff?: {
    id: string;
    first_name?: string;
    last_name?: string;
  };
  notes?: string;
  reason?: string;
}

// ─── Date Helpers ─────────────────────────────────────────────────────────────

export function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// ─── Navigation ───────────────────────────────────────────────────────────────

export function navigateDate(
  currentDate: Date,
  view: string,
  direction: "prev" | "next",
  setCurrentDate: (d: Date) => void,
): void {
  const newDate = new Date(currentDate);
  if (view === "day") {
    newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  } else if (view === "week") {
    const monday = getMondayOfWeek(currentDate);
    monday.setDate(monday.getDate() + (direction === "next" ? 7 : -7));
    setCurrentDate(monday);
  } else {
    newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    setCurrentDate(newDate);
  }
}

export function goToToday(setCurrentDate: (d: Date) => void): void {
  setCurrentDate(new Date());
}

// ─── Appointment Type Helpers ─────────────────────────────────────────────────

export function getAppointmentTypeIcon(type: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    eye_exam: Eye,
    consultation: User,
    fitting: Package,
    delivery: Truck,
    repair: Wrench,
    follow_up: RefreshCw,
    emergency: AlertCircle,
    other: Calendar,
  };
  return icons[type] || Calendar;
}

export function getAppointmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    eye_exam: "Examen de la Vista",
    consultation: "Consulta",
    fitting: "Ajuste",
    delivery: "Entrega",
    repair: "Reparación",
    follow_up: "Seguimiento",
    emergency: "Emergencia",
    other: "Otro",
  };
  return labels[type] || type;
}

export function getStatusBadge(status: string): ReactNode {
  switch (status) {
    case "scheduled":
      return (
        <Badge
          className="bg-admin-bg-tertiary/50 text-admin-info border-admin-info/30 font-bold text-[10px] uppercase tracking-wider"
          variant="outline"
        >
          <Clock className="h-3 w-3 mr-1" />
          Programada
        </Badge>
      );
    case "confirmed":
      return (
        <Badge
          className="bg-admin-bg-tertiary/50 text-admin-success border-admin-success/30 font-bold text-[10px] uppercase tracking-wider"
          variant="outline"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Confirmada
        </Badge>
      );
    case "completed":
      return (
        <Badge
          className="bg-admin-bg-tertiary/50 text-admin-accent-secondary border-admin-accent-secondary/30 font-bold text-[10px] uppercase tracking-wider"
          variant="outline"
        >
          <CheckCircle className="h-3 w-3 mr-1" />
          Completada
        </Badge>
      );
    case "cancelled":
      return (
        <Badge
          className="bg-admin-error/10 text-admin-error border-admin-error/30 font-bold text-[10px] uppercase tracking-wider"
          variant="outline"
        >
          <XCircle className="h-3 w-3 mr-1" />
          Cancelada
        </Badge>
      );
    case "no_show":
      return (
        <Badge
          className="bg-admin-bg-tertiary/50 text-admin-text-tertiary border-admin-border-secondary font-bold text-[10px] uppercase tracking-wider"
          variant="outline"
        >
          <XCircle className="h-3 w-3 mr-1" />
          No asistó
        </Badge>
      );
    default:
      return (
        <Badge
          className="text-[10px] font-bold uppercase tracking-wider"
          variant="secondary"
        >
          {status}
        </Badge>
      );
  }
}

// Re-export weekly report helpers from extracted file
export {
  getWeeklyReportData,
  handlePrintWeeklyReport,
} from "./_helpers/weeklyReport";

// ─── Slot Click Handler ───────────────────────────────────────────────────────

export function handleSlotClick(
  date: Date,
  time: string,
  setSelectedAppointment: (a: Appointment | null) => void,
  setPrefilledAppointmentData: (
    d: { date?: string; time?: string; lockDateTime?: boolean } | null,
  ) => void,
  setShowCreateAppointment: (v: boolean) => void,
): void {
  setSelectedAppointment(null);
  const timeFormatted = time.length >= 5 ? time.substring(0, 5) : time;
  setPrefilledAppointmentData({
    date: date.toISOString().split("T")[0],
    time: timeFormatted,
    lockDateTime: true,
  });
  setShowCreateAppointment(true);
}
