/**
 * Email Module Barrel
 *
 * Centralized export point for all email functionality.
 */
export {
  type BaseEmailData,
  type EmailType,
  emailConfig,
  resend,
  sendBatchEmails,
  sendEmail,
} from "./client";
export {
  type LayoutOptions,
  wrapInModernLayout,
} from "./layout";
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
export {
  type OrgInfoForEmail,
  getOrganizationInfoWithFallbacks,
} from "./org-utils";
export {
  B2C_CANONICAL_VARIABLES,
  VARIABLE_DESCRIPTIONS,
  VARIABLES_BY_TYPE,
  buildVariablesPromptForAgent,
  getVariablesForEditor,
  getVariablesForType,
} from "./ai-template-variables";
export {
  type Order,
  type OrderItem,
} from "./notifications/types";
export {
  type DeliveryCompletionParams,
  sendDeliveryCompletionEmail,
} from "./send-delivery-completion-email";
export {
  type SendQuoteEmailContext,
  type SendQuoteEmailResult,
  sendQuoteEmailToClient,
} from "./send-quote-email";
// Template re-exports — unique function names, no collision risk with barrel members above
export * from "./templates/optica";
export * from "./templates/saas";
export * from "./templates/saas-support";
export * from "./templates/support";
