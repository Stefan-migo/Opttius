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

export {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentReminder2h,
  sendAppointmentCancellation,
  sendAppointmentRescheduled,
  sendAppointmentFollowUpReminder,
} from "./appointments";
export type {
  AppointmentData,
  AppointmentRescheduleData,
  AppointmentFollowUpData,
} from "./appointments";

export { sendPrescriptionReady, sendPrescriptionExpiring } from "./prescriptions";
export type { PrescriptionData } from "./prescriptions";

export { sendWorkOrderReady } from "./workOrders";
export type { WorkOrderData } from "./workOrders";

export { sendQuoteSent, sendQuoteExpiring } from "./quotes";
export type { QuoteData } from "./quotes";

export { sendAccountWelcomeEmail, sendContactFormNotification, sendBirthdayPromo } from "./welcome";
export type { CustomerData, ContactFormData, BirthdayPromoData } from "./welcome";

import {
  sendAppointmentConfirmation,
  sendAppointmentReminder,
  sendAppointmentReminder2h,
  sendAppointmentCancellation,
  sendAppointmentRescheduled,
  sendAppointmentFollowUpReminder,
} from "./appointments";
import { sendPrescriptionReady, sendPrescriptionExpiring } from "./prescriptions";
import { sendWorkOrderReady } from "./workOrders";
import { sendQuoteSent, sendQuoteExpiring } from "./quotes";
import { sendAccountWelcomeEmail, sendContactFormNotification, sendBirthdayPromo } from "./welcome";

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
