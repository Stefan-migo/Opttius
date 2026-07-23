/**
 * Optica email templates — barrel export
 *
 * Each template group is split into its own file:
 * - appointments.ts: appointment confirmation, reminder, cancellation, reschedule, follow-up
 * - prescriptions.ts: prescription ready, prescription expiring
 * - workOrders.ts: work order ready
 * - quotes.ts: quote sent, quote expiring
 * - welcome.ts: account welcome, contact form, birthday promo
 */

export type {
  AppointmentData,
  AppointmentFollowUpData,
  AppointmentRescheduleData,
} from "./appointments";
export {
  sendAppointmentCancellation,
  sendAppointmentConfirmation,
  sendAppointmentFollowUpReminder,
  sendAppointmentReminder,
  sendAppointmentReminder2h,
  sendAppointmentRescheduled,
} from "./appointments";
export type { PrescriptionData } from "./prescriptions";
export { sendPrescriptionExpiring,sendPrescriptionReady } from "./prescriptions";
export type { QuoteData } from "./quotes";
export { sendQuoteExpiring,sendQuoteSent } from "./quotes";
export type { BirthdayPromoData,ContactFormData, CustomerData } from "./welcome";
export { sendAccountWelcomeEmail, sendBirthdayPromo,sendContactFormNotification } from "./welcome";
export type { WorkOrderData } from "./workOrders";
export { sendWorkOrderReady } from "./workOrders";

import {
  sendAppointmentCancellation,
  sendAppointmentConfirmation,
  sendAppointmentFollowUpReminder,
  sendAppointmentReminder,
  sendAppointmentReminder2h,
  sendAppointmentRescheduled,
} from "./appointments";
import { sendPrescriptionExpiring,sendPrescriptionReady } from "./prescriptions";
import { sendQuoteExpiring,sendQuoteSent } from "./quotes";
import { sendAccountWelcomeEmail, sendBirthdayPromo,sendContactFormNotification } from "./welcome";
import { sendWorkOrderReady } from "./workOrders";

export const opticaEmailTemplates = {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentReminder2h,
  sendAppointmentCancellation,
  sendAppointmentRescheduled,
  sendAppointmentFollowUpReminder,
  sendPrescriptionReady,
  sendPrescriptionExpiring,
  sendWorkOrderReady,
  sendQuoteSent,
  sendQuoteExpiring,
  sendAccountWelcomeEmail,
  sendContactFormNotification,
  sendBirthdayPromo,
};
