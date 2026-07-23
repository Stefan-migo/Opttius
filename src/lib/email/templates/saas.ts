/**
 * SaaS email templates — barrel export
 *
 * Each template group is split into its own file:
 * - saas-subscription.ts: welcome, trial ending, subscription success, payment failed/reminder
 * - saas-security.ts: security alert, onboarding step
 * - saas-notifications.ts: terms update, maintenance notice, usage alert, feature announcement
 * - saas-demo.ts: demo approved, expiring, expired, post-meeting followup
 */

export type {
  DemoApprovedData,
  DemoExpiredData,
  DemoExpiringData,
  DemoPostMeetingFollowupData,
} from "./saas-demo";
export {
  sendDemoApprovedEmail,
  sendDemoExpiredEmail,
  sendDemoExpiringEmail,
  sendDemoPostMeetingFollowupEmail,
} from "./saas-demo";
export {
  sendSaaSFeatureAnnouncement,
  sendSaaSMaintenanceNotice,
  sendSaaSTermsUpdate,
  sendSaaSUsageAlert,
} from "./saas-notifications";
export type { SaaSOnboardingData,SaaSSecurityData } from "./saas-security";
export { sendSaaSOnboardingStep,sendSaaSSecurityAlert } from "./saas-security";
export type {
  SaaSPaymentData,
  SaaSSubscriptionData,
  SaaSTrialData,
  SaaSUserData,
} from "./saas-subscription";
export {
  sendSaaSPaymentFailed,
  sendSaaSPaymentReminder,
  sendSaaSSubscriptionSuccess,
  sendSaaSTrialEnding,
  sendSaaSWelcome,
} from "./saas-subscription";

import {
  sendDemoApprovedEmail,
  sendDemoExpiredEmail,
  sendDemoExpiringEmail,
  sendDemoPostMeetingFollowupEmail,
} from "./saas-demo";
import {
  sendSaaSFeatureAnnouncement,
  sendSaaSMaintenanceNotice,
  sendSaaSTermsUpdate,
  sendSaaSUsageAlert,
} from "./saas-notifications";
import { sendSaaSOnboardingStep,sendSaaSSecurityAlert } from "./saas-security";
import {
  sendSaaSPaymentFailed,
  sendSaaSPaymentReminder,
  sendSaaSSubscriptionSuccess,
  sendSaaSTrialEnding,
  sendSaaSWelcome,
} from "./saas-subscription";

export const saasEmailTemplates = {
  sendSaaSWelcome,
  sendSaaSTrialEnding,
  sendSaaSSubscriptionSuccess,
  sendSaaSPaymentFailed,
  sendSaaSPaymentReminder,
  sendSaaSSecurityAlert,
  sendSaaSOnboardingStep,
  sendSaaSTermsUpdate,
  sendSaaSMaintenanceNotice,
  sendSaaSUsageAlert,
  sendSaaSFeatureAnnouncement,
  sendDemoApprovedEmail,
  sendDemoExpiringEmail,
  sendDemoExpiredEmail,
  sendDemoPostMeetingFollowupEmail,
};
