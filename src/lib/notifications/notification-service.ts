import { createAdminNotification } from "./_helpers/create-notification";
import {
  notifyAppointmentCancelled as domainNotifyAppointmentCancelled,
  notifyNewAppointment as domainNotifyNewAppointment,
  notifyNewCustomer as domainNotifyNewCustomer,
  notifyNewQuote as domainNotifyNewQuote,
  notifyNewSale as domainNotifyNewSale,
  notifyNewWorkOrder as domainNotifyNewWorkOrder,
  notifyQuoteConverted as domainNotifyQuoteConverted,
  notifyQuoteStatusChange as domainNotifyQuoteStatusChange,
  notifySaasSupportNewMessage as domainNotifySaasSupportNewMessage,
  notifySaasSupportTicketAssigned as domainNotifySaasSupportTicketAssigned,
  notifySaasSupportTicketNew as domainNotifySaasSupportTicketNew,
  notifyWorkOrderCompleted as domainNotifyWorkOrderCompleted,
  notifyWorkOrderStatusChange as domainNotifyWorkOrderStatusChange,
} from "./domain-notifications";

export type NotificationType =
  | "order_new"
  | "order_status_change"
  | "low_stock"
  | "out_of_stock"
  | "new_customer"
  | "new_review"
  | "review_pending"
  | "support_ticket_new"
  | "support_ticket_update"
  | "payment_received"
  | "payment_failed"
  | "system_alert"
  | "system_update"
  | "security_alert"
  | "custom"
  | "quote_new"
  | "quote_status_change"
  | "quote_converted"
  | "work_order_new"
  | "work_order_status_change"
  | "work_order_completed"
  | "appointment_new"
  | "appointment_cancelled"
  | "sale_new";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface CreateNotificationParams {
  type: NotificationType;
  priority?: NotificationPriority;
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, unknown>;
  targetAdminId?: string;
  targetAdminRole?: string;
  /** Branch ID for óptica-scoped notifications; null for SaaS/broadcast. */
  branchId?: string | null;
  /** Organization ID for óptica-scoped notifications; null for SaaS (target_admin_role=root). Will be auto-detected from branchId if not provided. */
  organizationId?: string | null;
}

export class NotificationService {
  static async createNotification(
    params: CreateNotificationParams,
  ): Promise<{ success: boolean; error?: string }> {
    return createAdminNotification(params);
  }

  static async notifyNewQuote(
    quoteId: string,
    quoteNumber: string,
    customerName: string,
    totalAmount: number,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyNewQuote(
      quoteId,
      quoteNumber,
      customerName,
      totalAmount,
      branchId,
    );
  }

  static async notifyQuoteStatusChange(
    quoteId: string,
    quoteNumber: string,
    oldStatus: string,
    newStatus: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyQuoteStatusChange(
      quoteId,
      quoteNumber,
      oldStatus,
      newStatus,
      branchId,
    );
  }

  static async notifyQuoteConverted(
    quoteId: string,
    quoteNumber: string,
    workOrderId: string,
    workOrderNumber: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyQuoteConverted(
      quoteId,
      quoteNumber,
      workOrderId,
      workOrderNumber,
      branchId,
    );
  }

  static async notifyNewWorkOrder(
    workOrderId: string,
    workOrderNumber: string,
    customerName: string,
    totalAmount: number,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyNewWorkOrder(
      workOrderId,
      workOrderNumber,
      customerName,
      totalAmount,
      branchId,
    );
  }

  static async notifyWorkOrderStatusChange(
    workOrderId: string,
    workOrderNumber: string,
    oldStatus: string,
    newStatus: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyWorkOrderStatusChange(
      workOrderId,
      workOrderNumber,
      oldStatus,
      newStatus,
      branchId,
    );
  }

  static async notifyWorkOrderCompleted(
    workOrderId: string,
    workOrderNumber: string,
    customerName: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyWorkOrderCompleted(
      workOrderId,
      workOrderNumber,
      customerName,
      branchId,
    );
  }

  static async notifyNewCustomer(
    customerId: string,
    customerName: string,
    email?: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyNewCustomer(customerId, customerName, email, branchId);
  }

  static async notifyNewSale(
    orderId: string,
    orderNumber: string,
    customerEmail: string,
    totalAmount: number,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyNewSale(
      orderId,
      orderNumber,
      customerEmail,
      totalAmount,
      branchId,
    );
  }

  static async notifyAppointmentCancelled(
    appointmentId: string,
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyAppointmentCancelled(
      appointmentId,
      customerName,
      appointmentDate,
      appointmentTime,
      branchId,
    );
  }

  static async notifyNewAppointment(
    appointmentId: string,
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    branchId?: string | null,
  ): Promise<void> {
    await domainNotifyNewAppointment(
      appointmentId,
      customerName,
      appointmentDate,
      appointmentTime,
      branchId,
    );
  }

  static async notifySaasSupportTicketNew(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    requesterEmail: string,
    organizationName?: string,
  ): Promise<void> {
    await domainNotifySaasSupportTicketNew(
      ticketId,
      ticketNumber,
      subject,
      requesterEmail,
      organizationName,
    );
  }

  static async notifySaasSupportTicketAssigned(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    assignedToAdminId: string,
  ): Promise<void> {
    await domainNotifySaasSupportTicketAssigned(
      ticketId,
      ticketNumber,
      subject,
      assignedToAdminId,
    );
  }

  static async notifySaasSupportNewMessage(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    fromCustomer: boolean,
  ): Promise<void> {
    await domainNotifySaasSupportNewMessage(
      ticketId,
      ticketNumber,
      subject,
      fromCustomer,
    );
  }
}
