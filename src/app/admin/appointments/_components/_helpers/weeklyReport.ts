"use client";

import { type RefObject } from "react";

import { Appointment } from "../appointmentsUtils";

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

export function getWeeklyReportData(
  currentDate: Date,
  appointments: Appointment[],
) {
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
