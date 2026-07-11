"use client";

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
import type { LucideIcon } from "lucide-react";
import { type ReactNode, type RefObject } from "react";

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

export function getWeekRange(date: Date): { start: Date; end: Date } {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d);
  monday.setDate(diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday, end: sunday };
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

// ─── Weekly Report ────────────────────────────────────────────────────────────

export function getWeeklyReportData(currentDate: Date, appointments: Appointment[]) {
  const { start, end } = getWeekRange(currentDate);
  const startStr = start.toISOString().split("T")[0];
  const endStr = end.toISOString().split("T")[0];
  const weekAppointments = appointments.filter((a) => {
    const d = a.appointment_date;
    return d >= startStr && d <= endStr;
  });
  const byDay: Record<string, Appointment[]> = {};
  const days = [
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
    "Domingo",
  ];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    byDay[days[i]] = weekAppointments
      .filter((a) => a.appointment_date === dateStr)
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
  }
  const byStatus = {
    scheduled: weekAppointments.filter((a) => a.status === "scheduled").length,
    confirmed: weekAppointments.filter((a) => a.status === "confirmed").length,
    completed: weekAppointments.filter((a) => a.status === "completed").length,
    cancelled: weekAppointments.filter((a) => a.status === "cancelled").length,
    no_show: weekAppointments.filter((a) => a.status === "no_show").length,
  };
  return {
    start,
    end,
    startStr,
    endStr,
    appointments: weekAppointments,
    byDay,
    byStatus,
  };
}

export function handlePrintWeeklyReport(
  weeklyReportRef: RefObject<HTMLDivElement | null>,
): void {
  const el = weeklyReportRef.current;
  const printWindow = window.open("", "_blank");
  if (!printWindow || !el) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.print());
    });
    return;
  }
  const clone = el.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-print-hide]").forEach((n) => n.remove());
  printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte Semanal de Citas</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 1rem; color: #333; }
            .grid { display: grid; gap: 0.75rem; }
            .grid-cols-5 { grid-template-columns: repeat(5, 1fr); }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .p-4 { padding: 1rem; }
            .rounded-xl { border-radius: 0.75rem; }
            .border { border: 1px solid #e5e7eb; }
            .text-xs { font-size: 0.75rem; }
            .text-sm { font-size: 0.875rem; }
            .text-2xl { font-size: 1.5rem; }
            .font-bold { font-weight: 700; }
            .space-y-4 > * + * { margin-top: 1rem; }
            .divide-y > * + * { border-top: 1px solid #e5e7eb; }
            [class*="print:hidden"] { display: none !important; }
          </style>
        </head>
        <body>${clone.innerHTML}</body>
      </html>
    `);
  printWindow.document.close();
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 100);
  };
}

// ─── Slot Click Handler ───────────────────────────────────────────────────────

export function handleSlotClick(
  date: Date,
  time: string,
  setSelectedAppointment: (a: Appointment | null) => void,
  setPrefilledAppointmentData: (d: { date?: string; time?: string; lockDateTime?: boolean } | null) => void,
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
