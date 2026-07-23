import type { TimeSlot } from "@/types/supabase-rpc";

export const DEFAULT_SCHEDULE_SETTINGS = {
  slot_duration_minutes: 15,
  default_appointment_duration: 30,
  buffer_time_minutes: 0,
  working_hours: {
    monday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    tuesday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    wednesday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    thursday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    friday: {
      enabled: true,
      start_time: "09:00",
      end_time: "18:00",
      lunch_start: null,
      lunch_end: null,
    },
    saturday: {
      enabled: false,
      start_time: "09:00",
      end_time: "13:00",
      lunch_start: null,
      lunch_end: null,
    },
    sunday: {
      enabled: false,
      start_time: "09:00",
      end_time: "13:00",
      lunch_start: null,
      lunch_end: null,
    },
  },
  blocked_dates: [] as string[],
  min_advance_booking_hours: 2,
  max_advance_booking_days: 90,
  staff_specific_settings: {} as Record<string, unknown>,
};

export function formatTimeSlot(slot: TimeSlot): {
  time_slot: string;
  available: boolean;
} {
  let timeSlot = "";
  if (typeof slot.time_slot === "string") {
    timeSlot = slot.time_slot;
  } else if (slot.time_slot) {
    const timeValue = slot.time_slot as { hours?: number; minutes?: number };
    if (
      typeof timeValue === "object" &&
      "hours" in timeValue &&
      "minutes" in timeValue
    ) {
      timeSlot = `${String(timeValue.hours).padStart(2, "0")}:${String(timeValue.minutes).padStart(2, "0")}`;
    } else {
      timeSlot = String(slot.time_slot);
    }
  }
  if (timeSlot.includes(":")) {
    const parts = timeSlot.split(":");
    timeSlot = `${parts[0]}:${parts[1]}`;
  }
  let isAvailable = true;
  if (typeof slot.available === "boolean") {
    isAvailable = slot.available;
  } else if (typeof slot.available === "string") {
    isAvailable = slot.available === "t" || slot.available === "true";
  } else if (slot.available !== undefined && slot.available !== null) {
    isAvailable = Boolean(slot.available);
  }
  return { time_slot: timeSlot, available: isAvailable };
}
