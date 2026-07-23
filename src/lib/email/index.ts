/**
 * Email Module Barrel
 *
 * Centralized export point for all email functionality.
 */
export {
  B2C_CANONICAL_VARIABLES,
  buildVariablesPromptForAgent,
  getVariablesForEditor,
  getVariablesForType,
  VARIABLE_DESCRIPTIONS,
  VARIABLES_BY_TYPE,
} from "./ai-template-variables";
export {
  type BaseEmailData,
  emailConfig,
  type EmailType,
  resend,
  sendBatchEmails,
  sendEmail,
} from "./client";
export {
  type LayoutOptions,
  wrapInModernLayout,
} from "./layout";
export {
  type Order,
  type OrderItem,
} from "./notifications/types";
export {
  getOrganizationInfoWithFallbacks,
  type OrgInfoForEmail,
} from "./org-utils";
export {
  type DeliveryCompletionParams,
  sendDeliveryCompletionEmail,
} from "./send-delivery-completion-email";
export {
  type SendQuoteEmailContext,
  type SendQuoteEmailResult,
  sendQuoteEmailToClient,
} from "./send-quote-email";
export {
  type EmailTemplate,
  incrementTemplateUsage,
  loadEmailTemplate,
} from "./template-loader";
export {
  formatOrderItemsHTML,
  formatOrderItemsText,
  getDefaultVariables,
  replaceTemplateVariables,
} from "./template-utils";
// Template re-exports — unique function names, no collision risk with barrel members above
export * from "./templates/optica";
export * from "./templates/saas";
export * from "./templates/saas-support";
export * from "./templates/support";
