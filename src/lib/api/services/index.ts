/**
 * API Services Index
 *
 * Centralized export of all API services.
 * Provides a single import point for all service layers.
 */

// Customer Service
export {
  customerService,
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  getCustomerStats,
  getPrescriptions,
  createPrescription,
} from "./customerService";
export type {
  Customer,
  CreateCustomerData,
  UpdateCustomerData,
  CustomerSearchParams,
  CustomerListResponse,
  Prescription,
  CreatePrescriptionData,
  LensPurchase,
  CustomerAnalytics,
} from "./customerService";

// Product Service
export {
  productService,
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  updateProductStock,
  bulkProductOperations,
} from "./productService";
export type {
  Product,
  CreateProductData,
  UpdateProductData,
  ProductSearchParams,
  ProductListResponse,
  BulkProductOperationData,
} from "./productService";

// Appointment Service
export {
  appointmentService,
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
} from "./appointmentService";
export type {
  Appointment,
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentSearchParams,
  AppointmentListResponse,
  AvailabilitySlot,
  ScheduleSettings,
} from "./appointmentService";

// Quote Service
export {
  quoteService,
  getQuotes,
  getQuote,
  createQuote,
  updateQuote,
  deleteQuote,
  sendQuote,
  acceptQuote,
  rejectQuote,
  convertQuoteToOrder,
  addQuoteItem,
  updateQuoteItem,
  removeQuoteItem,
} from "./quoteService";
export type {
  Quote,
  QuoteItem,
  CreateQuoteData,
  UpdateQuoteData,
  QuoteSearchParams,
  QuoteListResponse,
  QuoteWithItems,
} from "./quoteService";

// Order Service
export {
  orderService,
  getOrders,
  getOrder,
  createOrder,
  createManualOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  addOrderItem,
  updateOrderItem,
  removeOrderItem,
  processRefund,
} from "./orderService";
export type {
  Order,
  OrderItem,
  ShippingInfo,
  CreateOrderData,
  UpdateOrderData,
  OrderSearchParams,
  OrderListResponse,
  OrderWithItems,
} from "./orderService";

// POS Service
export { posService } from "./posService";
export type {
  CashRegisterStatus,
  PendingBalanceOrder,
  ProcessSaleRequest,
  ProcessSaleResponse,
  PendingPaymentRequest,
  PendingPaymentResponse,
} from "./posService";

// Quote Settings Service
export { quoteSettingsService } from "./quoteSettingsService";
export type {
  QuoteSettings,
  UpdateQuoteSettingsData,
} from "./quoteSettingsService";

// Lens Family Service
export { lensFamilyService } from "./lensFamilyService";
export type { LensFamily, LensFamilyListResponse } from "./lensFamilyService";

// Contact Lens Family Service
export { contactLensFamilyService } from "./contactLensFamilyService";
export type {
  ContactLensFamily,
  ContactLensFamilyListResponse,
} from "./contactLensFamilyService";

// Contact Lens Matrix Service
export { contactLensMatrixService } from "./contactLensMatrixService";
export type {
  ContactLensMatrixCalculationRequest,
  ContactLensMatrixCalculationResult,
  ContactLensMatrixCalculationResponse,
} from "./contactLensMatrixService";

// Agreement Service
export {
  agreementService,
  getAgreements,
  getAgreement,
  createAgreement,
  updateAgreement,
  updateAgreementStatus,
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  getInstitutionalBalances,
  reconcileBalances,
  getAgreementAnalytics,
} from "./agreementService";
export type {
  Agreement,
  AgreementPurchaseOrder,
  AgreementInstitutionalBalance,
  CreateAgreementData,
  CreatePurchaseOrderData,
  ReconcileData,
  AgreementListParams,
  AgreementListResponse,
} from "./agreementService";
