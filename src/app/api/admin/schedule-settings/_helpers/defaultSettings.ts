/** Shared default schedule settings — extracted to keep route.ts under 300 lines */
export interface DayConfig {
  enabled: boolean;
  start_time: string;
  end_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
}

export interface ScheduleSettings {
  slot_duration_minutes: number;
  default_appointment_duration: number;
  buffer_time_minutes: number;
  working_hours: {
    monday: DayConfig;
    tuesday: DayConfig;
    wednesday: DayConfig;
    thursday: DayConfig;
    friday: DayConfig;
    saturday: DayConfig;
    sunday: DayConfig;
  };
  blocked_dates: string[];
  min_advance_booking_hours: number;
  max_advance_booking_days: number;
}

export const DEFAULT_SCHEDULE_SETTINGS: ScheduleSettings = {
  slot_duration_minutes: 15,
  default_appointment_duration: 30,
  buffer_time_minutes: 0,
  working_hours: {
    monday: { enabled: true, start_time: "09:00", end_time: "18:00", lunch_start: null, lunch_end: null },
    tuesday: { enabled: true, start_time: "09:00", end_time: "18:00", lunch_start: null, lunch_end: null },
    wednesday: { enabled: true, start_time: "09:00", end_time: "18:00", lunch_start: null, lunch_end: null },
    thursday: { enabled: true, start_time: "09:00", end_time: "18:00", lunch_start: null, lunch_end: null },
    friday: { enabled: true, start_time: "09:00", end_time: "18:00", lunch_start: null, lunch_end: null },
    saturday: { enabled: false, start_time: "09:00", end_time: "13:00", lunch_start: null, lunch_end: null },
    sunday: { enabled: false, start_time: "09:00", end_time: "13:00", lunch_start: null, lunch_end: null },
  },
  blocked_dates: [],
  min_advance_booking_hours: 2,
  max_advance_booking_days: 90,
};
