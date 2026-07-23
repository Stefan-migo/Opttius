/**
 * Appointment email templates for optical shops
 */
import { sendAppointmentEmail } from "./_helpers/appointmentHelpers";

export interface AppointmentData {
  id: string; customer_name: string; customer_first_name: string; customer_email: string;
  date: string; time: string; datetime?: string;
  professional_name?: string; professional_title?: string; professional_license?: string;
  branch_name?: string; branch_address?: string; branch_phone?: string; branch_email?: string;
  branch_hours?: string; appointment_type?: string; duration?: string;
  preparation_instructions?: string; confirmation_url?: string;
  cancellation_url?: string; reschedule_url?: string;
}

export interface AppointmentRescheduleData extends AppointmentData { old_date: string; old_time: string; }

export interface AppointmentFollowUpData {
  id: string; customer_name: string; customer_first_name: string; customer_email: string;
  follow_up_date: string; branch_name?: string; branch_phone?: string; branch_email?: string; booking_url?: string;
}

export async function sendAppointmentConfirmation(appointment: AppointmentData, organizationId?: string) {
  return sendAppointmentEmail({ templateKey: "appointment_confirmation", appointment, organizationId, previewText: `Confirmación de tu cita para el ${appointment.date}`, logLabel: "appointment confirmation" });
}

export async function sendAppointmentReminder(appointment: AppointmentData, organizationId?: string) {
  return sendAppointmentEmail({ templateKey: "appointment_reminder", appointment, organizationId, previewText: `Recordatorio: Tienes una cita el ${appointment.date} a las ${appointment.time}`, logLabel: "appointment reminder" });
}

export async function sendAppointmentReminder2h(appointment: AppointmentData, organizationId?: string) {
  return sendAppointmentEmail({ templateKey: "appointment_reminder_2h", appointment, organizationId, previewText: `Tu cita es en 2 horas a las ${appointment.time}`, logLabel: "appointment reminder 2h" });
}

export async function sendAppointmentCancellation(appointment: AppointmentData, organizationId?: string) {
  return sendAppointmentEmail({ templateKey: "appointment_cancelation", appointment, organizationId, previewText: `Tu cita del ${appointment.date} fue cancelada`, logLabel: "appointment cancellation" });
}

export async function sendAppointmentRescheduled(appointment: AppointmentRescheduleData, organizationId?: string) {
  return sendAppointmentEmail({
    templateKey: "appointment_rescheduled", appointment, organizationId,
    extraVariables: { old_appointment_date: appointment.old_date, old_appointment_time: appointment.old_time },
    previewText: `Tu cita fue reprogramada para el ${appointment.date}`, logLabel: "appointment rescheduled",
  });
}

export async function sendAppointmentFollowUpReminder(appointment: AppointmentFollowUpData, organizationId?: string) {
  const followUpDateFormatted = appointment.follow_up_date ? new Date(appointment.follow_up_date).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" }) : appointment.follow_up_date;
  return sendAppointmentEmail({
    templateKey: "appointment_follow_up_reminder", appointment, organizationId,
    extraVariables: { follow_up_date: followUpDateFormatted, booking_url: appointment.booking_url || "" },
    previewText: `Recuerda tu control programado para el ${appointment.follow_up_date}`, logLabel: "appointment follow-up reminder",
  });
}
