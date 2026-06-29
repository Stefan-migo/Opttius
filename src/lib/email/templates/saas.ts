/**
 * SaaS email templates — barrel export
 *
 * Each template group is split into its own file:
 * - saas-subscription.ts: welcome, trial ending, subscription success, payment failed/reminder
 * - saas-security.ts: security alert, onboarding step
 * - saas-notifications.ts: terms update, maintenance notice, usage alert, feature announcement
 * - saas-demo.ts: demo approved, expiring, expired, post-meeting followup
 */

export {
  sendSaaSWelcome,
  sendSaaSTrialEnding,
  sendSaaSSubscriptionSuccess,
  sendSaaSPaymentFailed,
  sendSaaSPaymentReminder,
} from "./saas-subscription";
export type {
  SaaSUserData,
  SaaSSubscriptionData,
  SaaSTrialData,
  SaaSPaymentData,
} from "./saas-subscription";

export { sendSaaSSecurityAlert, sendSaaSOnboardingStep } from "./saas-security";
export type { SaaSSecurityData, SaaSOnboardingData } from "./saas-security";

export {
  sendSaaSTermsUpdate,
  sendSaaSMaintenanceNotice,
  sendSaaSUsageAlert,
  sendSaaSFeatureAnnouncement,
} from "./saas-notifications";

export {
  sendDemoApprovedEmail,
  sendDemoExpiringEmail,
  sendDemoExpiredEmail,
  sendDemoPostMeetingFollowupEmail,
} from "./saas-demo";
export type {
  DemoApprovedData,
  DemoExpiringData,
  DemoExpiredData,
  DemoPostMeetingFollowupData,
} from "./saas-demo";

import {
  sendSaaSWelcome,
  sendSaaSTrialEnding,
  sendSaaSSubscriptionSuccess,
  sendSaaSPaymentFailed,
  sendSaaSPaymentReminder,
} from "./saas-subscription";
import { sendSaaSSecurityAlert, sendSaaSOnboardingStep } from "./saas-security";
import {
  sendSaaSTermsUpdate,
  sendSaaSMaintenanceNotice,
  sendSaaSUsageAlert,
  sendSaaSFeatureAnnouncement,
} from "./saas-notifications";
import {
  sendDemoApprovedEmail,
  sendDemoExpiringEmail,
  sendDemoExpiredEmail,
  sendDemoPostMeetingFollowupEmail,
} from "./saas-demo";

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
