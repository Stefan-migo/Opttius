/**
 * API Services Index
 *
 * Centralized export of all API services.
 * Provides a single import point for all service layers.
 */

// Customer Service
export type {
  CreateCustomerData,
  CreatePrescriptionData,
  Customer,
  CustomerAnalytics,
  CustomerListResponse,
  CustomerSearchParams,
  LensPurchase,
  Prescription,
  UpdateCustomerData,
} from "./customerService";
export {
  createCustomer,
  createPrescription,
  customerService,
  deleteCustomer,
  getCustomer,
  getCustomers,
  getCustomerStats,
  getPrescriptions,
  searchCustomers,
  updateCustomer,
} from "./customerService";

// Product Service
export type {
  BulkProductOperationData,
  CreateProductData,
  Product,
  ProductListResponse,
  ProductSearchParams,
  UpdateProductData,
} from "./productService";
export {
  bulkProductOperations,
  createProduct,
  deleteProduct,
  getProduct,
  getProducts,
  productService,
  searchProducts,
  updateProduct,
  updateProductStock,
} from "./productService";

// Appointment Service
export type {
  Appointment,
  AppointmentListResponse,
  AppointmentSearchParams,
  AvailabilitySlot,
  CreateAppointmentData,
  ScheduleSettings,
  UpdateAppointmentData,
} from "./appointmentService";
export {
  appointmentService,
  cancelAppointment,
  confirmAppointment,
  createAppointment,
  deleteAppointment,
  getAppointment,
  getAppointments,
  getAvailability,
  getScheduleSettings,
  updateAppointment,
  updateScheduleSettings,
} from "./appointmentService";

// Quote Service
export type {
  CreateQuoteData,
  Quote,
  QuoteItem,
  QuoteListResponse,
  QuoteSearchParams,
  QuoteWithItems,
  UpdateQuoteData,
} from "./quoteService";
export {
  acceptQuote,
  addQuoteItem,
  convertQuoteToOrder,
  createQuote,
  deleteQuote,
  getQuote,
  getQuotes,
  quoteService,
  rejectQuote,
  removeQuoteItem,
  sendQuote,
  updateQuote,
  updateQuoteItem,
} from "./quoteService";

// Order Service
export type {
  CreateOrderData,
  Order,
  OrderItem,
  OrderListResponse,
  OrderSearchParams,
  OrderWithItems,
  ShippingInfo,
  UpdateOrderData,
} from "./orderService";
export {
  addOrderItem,
  createManualOrder,
  createOrder,
  deleteOrder,
  getOrder,
  getOrders,
  orderService,
  processRefund,
  removeOrderItem,
  updateOrder,
  updateOrderItem,
  updateOrderStatus,
  updatePaymentStatus,
} from "./orderService";

// POS Service
export type {
  CashRegisterStatus,
  PendingBalanceOrder,
  PendingPaymentRequest,
  PendingPaymentResponse,
  ProcessSaleRequest,
  ProcessSaleResponse,
} from "./posService";
export { posService } from "./posService";

// Quote Settings Service
export type {
  QuoteSettings,
  UpdateQuoteSettingsData,
} from "./quoteSettingsService";
export { quoteSettingsService } from "./quoteSettingsService";

// Lens Family Service
export type { LensFamily, LensFamilyListResponse } from "./lensFamilyService";
export { lensFamilyService } from "./lensFamilyService";

// Contact Lens Family Service
export type {
  ContactLensFamily,
  ContactLensFamilyListResponse,
} from "./contactLensFamilyService";
export { contactLensFamilyService } from "./contactLensFamilyService";

// Contact Lens Matrix Service
export type {
  ContactLensMatrixCalculationRequest,
  ContactLensMatrixCalculationResponse,
  ContactLensMatrixCalculationResult,
} from "./contactLensMatrixService";
export { contactLensMatrixService } from "./contactLensMatrixService";

// Agreement Service
export type {
  Agreement,
  AgreementInstitutionalBalance,
  AgreementListParams,
  AgreementListResponse,
  AgreementPurchaseOrder,
  CreateAgreementData,
  CreatePurchaseOrderData,
  ReconcileData,
} from "./agreementService";
export {
  agreementService,
  createAgreement,
  createPurchaseOrder,
  getAgreement,
  getAgreementAnalytics,
  getAgreements,
  getInstitutionalBalances,
  getPurchaseOrders,
  reconcileBalances,
  updateAgreement,
  updateAgreementStatus,
  updatePurchaseOrder,
} from "./agreementService";
