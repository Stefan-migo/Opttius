"use client";

import { useEffect, useMemo, useState } from "react";

import {
  generateTimeSlots,
  getWeekDays,
  getMonthDays,
} from "./_components/appointmentCalendarHelpers";
import type { Appointment, ScheduleSettings } from "./_components/appointmentCalendarHelpers";
import CalendarDayView from "./_components/CalendarDayView";
import CalendarWeekView from "./_components/CalendarWeekView";
import CalendarMonthView from "./_components/CalendarMonthView";

export type { Appointment, ScheduleSettings };

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

  useEffect(() => {
    // Force re-render when lastRefresh changes
  }, [lastRefresh, appointments]);

  const timeSlots = useMemo(
    () => generateTimeSlots(scheduleSettings),
    [scheduleSettings],
  );

  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  const monthDays = useMemo(() => getMonthDays(currentDate), [currentDate]);

  if (view === "day") {
    return (
      <CalendarDayView
        currentDate={currentDate}
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        onSlotClick={onSlotClick}
        scheduleSettings={scheduleSettings}
        lastRefresh={lastRefresh}
        timeSlots={timeSlots}
      />
    );
  }

  if (view === "week") {
    return (
      <CalendarWeekView
        currentDate={currentDate}
        appointments={appointments}
        onAppointmentClick={onAppointmentClick}
        onSlotClick={onSlotClick}
        scheduleSettings={scheduleSettings}
        lastRefresh={lastRefresh}
        timeSlots={timeSlots}
        weekDays={weekDays}
      />
    );
  }

  return (
    <CalendarMonthView
      currentDate={currentDate}
      appointments={appointments}
      onAppointmentClick={onAppointmentClick}
      onDateChange={onDateChange}
      monthDays={monthDays}
    />
  );
}
