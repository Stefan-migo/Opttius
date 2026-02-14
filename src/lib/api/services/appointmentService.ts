/**
 * Appointment Service
 *
 * Service layer for appointment-related API operations.
 * Provides type-safe methods for CRUD operations on appointments.
 */

import { ApiClient, isSuccess, unwrapData } from "../client-helpers";
import { handleApiError } from "@/lib/services/errorService";

// Types
export interface Appointment {
  id: string;
  customer_id: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status:
    | "pending"
    | "scheduled"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show";
  notes?: string;
  branch_id?: string;
  follow_up_required?: boolean;
  reason?: string;
  outcome?: string;
  follow_up_date?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateAppointmentData {
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: string;
  status?: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  notes?: string;
  branch_id?: string;
}

export interface UpdateAppointmentData extends Partial<CreateAppointmentData> {}

export interface AppointmentSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  branch_id?: string;
  customer_id?: string;
}

export interface AppointmentListResponse {
  data: Appointment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AvailabilitySlot {
  date: string;
  time: string;
  available: boolean;
}

export interface ScheduleSettings {
  working_days: number[];
  working_hours: {
    start: string;
    end: string;
  };
  break_time?: {
    start: string;
    end: string;
  };
  appointment_duration: number;
  max_appointments_per_slot: number;
}

// API Client instance
const client = new ApiClient();

/**
 * Get all appointments with optional filters
 */
export async function getAppointments(
  params: AppointmentSearchParams = {},
): Promise<AppointmentListResponse> {
  try {
    const queryString = new URLSearchParams(
      Object.entries(params)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]) as [string, string][],
    ).toString();

    const response = await client.get<Appointment[]>(
      `/api/admin/appointments${queryString ? `?${queryString}` : ""}`,
    );

    if (isSuccess(response)) {
      return {
        data: response.data,
        pagination: response.meta?.pagination || {
          page: params.page || 1,
          limit: params.limit || 10,
          total: response.data.length,
          totalPages: 1,
        },
      };
    }

    const errorMessage =
      response.success === false && response.error?.message
        ? response.error.message
        : "An unknown error occurred";
    throw new Error(errorMessage);
  } catch (error) {
    handleApiError(error, "getAppointments");
    throw error;
  }
}

/**
 * Get a single appointment by ID
 */
export async function getAppointment(id: string): Promise<Appointment> {
  try {
    const response = await client.get<Appointment>(
      `/api/admin/appointments/${id}`,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getAppointment");
    throw error;
  }
}

/**
 * Create a new appointment
 */
export async function createAppointment(
  data: CreateAppointmentData,
): Promise<Appointment> {
  try {
    const response = await client.post<Appointment>(
      "/api/admin/appointments",
      data,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "createAppointment");
    throw error;
  }
}

/**
 * Update an existing appointment
 */
export async function updateAppointment(
  id: string,
  data: UpdateAppointmentData,
): Promise<Appointment> {
  try {
    const response = await client.put<Appointment>(
      `/api/admin/appointments/${id}`,
      data,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateAppointment");
    throw error;
  }
}

/**
 * Delete an appointment
 */
export async function deleteAppointment(id: string): Promise<void> {
  try {
    const response = await client.delete(`/api/admin/appointments/${id}`);
    unwrapData(response);
  } catch (error) {
    handleApiError(error, "deleteAppointment");
    throw error;
  }
}

/**
 * Get available time slots for a specific date
 */
export async function getAvailability(
  date: string,
  duration_minutes: number,
  branch_id?: string,
): Promise<AvailabilitySlot[]> {
  try {
    const queryString = new URLSearchParams({
      date,
      duration_minutes: String(duration_minutes),
      ...(branch_id && { branch_id }),
    }).toString();

    const response = await client.get<AvailabilitySlot[]>(
      `/api/admin/appointments/availability?${queryString}`,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getAvailability");
    throw error;
  }
}

/**
 * Get schedule settings
 */
export async function getScheduleSettings(
  branch_id?: string,
): Promise<ScheduleSettings> {
  try {
    const queryString = branch_id ? `?branch_id=${branch_id}` : "";
    const response = await client.get<ScheduleSettings>(
      `/api/admin/appointments/settings${queryString}`,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "getScheduleSettings");
    throw error;
  }
}

/**
 * Update schedule settings
 */
export async function updateScheduleSettings(
  settings: Partial<ScheduleSettings>,
  branch_id?: string,
): Promise<ScheduleSettings> {
  try {
    const queryString = branch_id ? `?branch_id=${branch_id}` : "";
    const response = await client.put<ScheduleSettings>(
      `/api/admin/appointments/settings${queryString}`,
      settings,
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "updateScheduleSettings");
    throw error;
  }
}

/**
 * Confirm an appointment
 */
export async function confirmAppointment(id: string): Promise<Appointment> {
  try {
    const response = await client.post<Appointment>(
      `/api/admin/appointments/${id}/confirm`,
      {},
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "confirmAppointment");
    throw error;
  }
}

/**
 * Cancel an appointment
 */
export async function cancelAppointment(
  id: string,
  reason?: string,
): Promise<Appointment> {
  try {
    const response = await client.post<Appointment>(
      `/api/admin/appointments/${id}/cancel`,
      { reason },
    );
    return unwrapData(response);
  } catch (error) {
    handleApiError(error, "cancelAppointment");
    throw error;
  }
}

// Export service object for convenience
export const appointmentService = {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  getAvailability,
  getScheduleSettings,
  updateScheduleSettings,
  confirmAppointment,
  cancelAppointment,
};
