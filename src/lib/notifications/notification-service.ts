import { appLogger as logger } from "@/lib/logger";
import { createServiceRoleClient } from "@/utils/supabase/server";

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
  /**
   * Create a notification if the notification type is enabled
   */
  static async createNotification(
    params: CreateNotificationParams,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createServiceRoleClient();

      // Resolve organization_id and branch_id (from params, branch, or related entity)
      let organizationId: string | null = params.organizationId ?? null;
      let branchId: string | null = params.branchId ?? null;

      // If organization_id not provided but branch_id is, get it from branch
      if (!organizationId && branchId) {
        const { data: branch } = await supabase
          .from("branches")
          .select("organization_id")
          .eq("id", branchId)
          .single();
        organizationId = branch?.organization_id || null;
      }

      // If org/branch still not set but related entity exists, get from entity
      if (
        (!organizationId || !branchId) &&
        params.relatedEntityId &&
        params.relatedEntityType
      ) {
        const entityTableMap: Record<
          string,
          { table: string; hasBranch: boolean }
        > = {
          order: { table: "orders", hasBranch: true },
          quote: { table: "quotes", hasBranch: true },
          work_order: { table: "lab_work_orders", hasBranch: true },
          appointment: { table: "appointments", hasBranch: true },
          customer: { table: "customers", hasBranch: true },
          product: { table: "products", hasBranch: true },
        };

        const mapping = entityTableMap[params.relatedEntityType];
        if (mapping) {
          const cols = [
            "organization_id",
            ...(mapping.hasBranch ? ["branch_id"] : []),
          ].join(", ");
          const { data: entity } = await supabase
            .from(mapping.table)
            .select(cols)
            .eq("id", params.relatedEntityId)
            .single();
          if (entity) {
            organizationId =
              organizationId ?? (entity as unknown).organization_id ?? null;
            if (mapping.hasBranch) {
              branchId = branchId ?? (entity as unknown).branch_id ?? null;
            }
          }
        }
      }

      // For SaaS notifications (target_admin_role=root), organization_id should be NULL
      if (params.targetAdminRole === "root") {
        organizationId = null;
        branchId = null;
      }

      // Check if notification type is enabled (resolution: branch > org > global)
      const { data: settingsRows, error: settingsError } = await supabase.rpc(
        "get_notification_setting_effective",
        {
          p_notification_type: params.type,
          p_organization_id: organizationId,
          p_branch_id: branchId,
        },
      );

      if (settingsError) {
        logger.error("Error checking notification settings:", settingsError);
        // Continue anyway - default to enabled
      }

      const settingsData = Array.isArray(settingsRows)
        ? settingsRows[0]
        : settingsRows;
      if (settingsData && settingsData.enabled === false) {
        logger.info(
          `Notification type ${params.type} is disabled, skipping...`,
        );
        return { success: true };
      }

      const priority = settingsData?.priority || params.priority || "medium";

      // Create notification (branch_id scopes to óptica; SaaS uses target_admin_role=root, no branch_id)
      const { error: insertError } = await supabase
        .from("admin_notifications")
        .insert({
          type: params.type,
          priority: priority,
          title: params.title,
          message: params.message,
          related_entity_type: params.relatedEntityType,
          related_entity_id: params.relatedEntityId,
          action_url: params.actionUrl,
          action_label: params.actionLabel,
          metadata: params.metadata || {},
          target_admin_id: params.targetAdminId || null,
          target_admin_role: params.targetAdminRole || null,
          branch_id: branchId,
          organization_id: organizationId,
          created_by_system: true,
        });

      if (insertError) {
        logger.error("Error creating notification:", insertError);
        return { success: false, error: insertError.message };
      }

      return { success: true };
    } catch (error) {
      logger.error("Error in NotificationService.createNotification:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create notification for new quote (branchId scopes to óptica)
   */
  static async notifyNewQuote(
    quoteId: string,
    quoteNumber: string,
    customerName: string,
    totalAmount: number,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "quote_new",
      priority: "high",
      title: "Nuevo Presupuesto",
      message: `Presupuesto ${quoteNumber} creado para ${customerName} - ${this.formatCurrency(totalAmount)}`,
      relatedEntityType: "quote",
      relatedEntityId: quoteId,
      actionUrl: `/admin/quotes/${quoteId}`,
      actionLabel: "Ver Presupuesto",
      metadata: {
        quote_number: quoteNumber,
        customer_name: customerName,
        total_amount: totalAmount,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for quote status change (branchId scopes to óptica)
   */
  static async notifyQuoteStatusChange(
    quoteId: string,
    quoteNumber: string,
    oldStatus: string,
    newStatus: string,
    branchId?: string | null,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      draft: "Borrador",
      sent: "Enviado",
      accepted: "Aceptado",
      rejected: "Rechazado",
      expired: "Expirado",
    };

    await this.createNotification({
      type: "quote_status_change",
      priority: "medium",
      title: "Cambio de Estado en Presupuesto",
      message: `Presupuesto ${quoteNumber} cambió de ${statusLabels[oldStatus] || oldStatus} a ${statusLabels[newStatus] || newStatus}`,
      relatedEntityType: "quote",
      relatedEntityId: quoteId,
      actionUrl: `/admin/quotes/${quoteId}`,
      actionLabel: "Ver Presupuesto",
      metadata: {
        quote_number: quoteNumber,
        old_status: oldStatus,
        new_status: newStatus,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for quote converted to work order (branchId scopes to óptica)
   */
  static async notifyQuoteConverted(
    quoteId: string,
    quoteNumber: string,
    workOrderId: string,
    workOrderNumber: string,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "quote_converted",
      priority: "high",
      title: "Presupuesto Convertido a Trabajo",
      message: `Presupuesto ${quoteNumber} convertido a trabajo ${workOrderNumber}`,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      actionUrl: `/admin/work-orders/${workOrderId}`,
      actionLabel: "Ver Trabajo",
      metadata: {
        quote_id: quoteId,
        quote_number: quoteNumber,
        work_order_id: workOrderId,
        work_order_number: workOrderNumber,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for new work order (branchId scopes to óptica)
   */
  static async notifyNewWorkOrder(
    workOrderId: string,
    workOrderNumber: string,
    customerName: string,
    totalAmount: number,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "work_order_new",
      priority: "high",
      title: "Nuevo Trabajo",
      message: `Trabajo ${workOrderNumber} creado para ${customerName} - ${this.formatCurrency(totalAmount)}`,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      actionUrl: `/admin/work-orders/${workOrderId}`,
      actionLabel: "Ver Trabajo",
      metadata: {
        work_order_number: workOrderNumber,
        customer_name: customerName,
        total_amount: totalAmount,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for work order status change (branchId scopes to óptica)
   */
  static async notifyWorkOrderStatusChange(
    workOrderId: string,
    workOrderNumber: string,
    oldStatus: string,
    newStatus: string,
    branchId?: string | null,
  ): Promise<void> {
    const statusLabels: Record<string, string> = {
      quote: "Presupuesto",
      ordered: "Ordenado",
      sent_to_lab: "Enviado al Lab",
      in_progress_lab: "En Lab",
      ready_at_lab: "Listo en Lab",
      received_from_lab: "Recibido",
      mounted: "Montado",
      quality_check: "Control Calidad",
      ready_for_pickup: "Listo para Retiro",
      delivered: "Entregado",
      cancelled: "Cancelado",
      returned: "Devuelto",
    };

    await this.createNotification({
      type: "work_order_status_change",
      priority: "medium",
      title: "Cambio de Estado en Trabajo",
      message: `Trabajo ${workOrderNumber} cambió de ${statusLabels[oldStatus] || oldStatus} a ${statusLabels[newStatus] || newStatus}`,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      actionUrl: `/admin/work-orders/${workOrderId}`,
      actionLabel: "Ver Trabajo",
      metadata: {
        work_order_number: workOrderNumber,
        old_status: oldStatus,
        new_status: newStatus,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for work order completed (branchId scopes to óptica)
   */
  static async notifyWorkOrderCompleted(
    workOrderId: string,
    workOrderNumber: string,
    customerName: string,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "work_order_completed",
      priority: "high",
      title: "Trabajo Completado",
      message: `Trabajo ${workOrderNumber} para ${customerName} ha sido entregado`,
      relatedEntityType: "work_order",
      relatedEntityId: workOrderId,
      actionUrl: `/admin/work-orders/${workOrderId}`,
      actionLabel: "Ver Trabajo",
      metadata: {
        work_order_number: workOrderNumber,
        customer_name: customerName,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for new customer (branchId scopes to óptica)
   */
  static async notifyNewCustomer(
    customerId: string,
    customerName: string,
    email?: string,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "new_customer",
      priority: "medium",
      title: "Nuevo Cliente",
      message: `Nuevo cliente registrado: ${customerName}${email ? ` (${email})` : ""}`,
      relatedEntityType: "customer",
      relatedEntityId: customerId,
      actionUrl: `/admin/customers/${customerId}`,
      actionLabel: "Ver Cliente",
      metadata: {
        customer_name: customerName,
        email: email,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for new sale (branchId scopes to óptica)
   */
  static async notifyNewSale(
    orderId: string,
    orderNumber: string,
    customerEmail: string,
    totalAmount: number,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "sale_new",
      priority: "high",
      title: "Nueva Venta",
      message: `Nueva venta ${orderNumber} - ${this.formatCurrency(totalAmount)}`,
      relatedEntityType: "order",
      relatedEntityId: orderId,
      actionUrl: `/admin/orders/${orderId}`,
      actionLabel: "Ver Pedido",
      metadata: {
        order_number: orderNumber,
        customer_email: customerEmail,
        total_amount: totalAmount,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for cancelled appointment (branchId scopes to óptica)
   */
  static async notifyAppointmentCancelled(
    appointmentId: string,
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "appointment_cancelled",
      priority: "medium",
      title: "Cita Cancelada",
      message: `Cita de ${customerName} del ${appointmentDate} a las ${appointmentTime} fue cancelada`,
      relatedEntityType: "appointment",
      relatedEntityId: appointmentId,
      actionUrl: "/admin/appointments",
      actionLabel: "Ver Citas",
      metadata: {
        customer_name: customerName,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for new appointment (branchId scopes to óptica)
   */
  static async notifyNewAppointment(
    appointmentId: string,
    customerName: string,
    appointmentDate: string,
    appointmentTime: string,
    branchId?: string | null,
  ): Promise<void> {
    await this.createNotification({
      type: "appointment_new",
      priority: "medium",
      title: "Nueva Cita",
      message: `Nueva cita para ${customerName} el ${appointmentDate} a las ${appointmentTime}`,
      relatedEntityType: "appointment",
      relatedEntityId: appointmentId,
      actionUrl: `/admin/appointments`,
      actionLabel: "Ver Citas",
      metadata: {
        customer_name: customerName,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
      },
      branchId: branchId ?? null,
    });
  }

  /**
   * Create notification for new SaaS support ticket (visible to root/dev only)
   */
  static async notifySaasSupportTicketNew(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    requesterEmail: string,
    organizationName?: string,
  ): Promise<void> {
    await this.createNotification({
      type: "support_ticket_new",
      priority: "high",
      title: "Nuevo ticket de soporte SaaS",
      message: organizationName
        ? `#${ticketNumber}: ${subject} — ${requesterEmail} (${organizationName})`
        : `#${ticketNumber}: ${subject} — ${requesterEmail}`,
      relatedEntityType: "saas_support_ticket",
      relatedEntityId: ticketId,
      actionUrl: `/admin/saas-management/support/tickets/${ticketId}`,
      actionLabel: "Ver ticket",
      targetAdminRole: "root",
      metadata: {
        ticket_number: ticketNumber,
        subject,
        requester_email: requesterEmail,
        organization_name: organizationName,
      },
    });
  }

  /**
   * Create notification when SaaS support ticket is assigned (visible to assigned user)
   */
  static async notifySaasSupportTicketAssigned(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    assignedToAdminId: string,
  ): Promise<void> {
    await this.createNotification({
      type: "support_ticket_update",
      priority: "high",
      title: "Ticket de soporte asignado",
      message: `Te han asignado el ticket #${ticketNumber}: ${subject}`,
      relatedEntityType: "saas_support_ticket",
      relatedEntityId: ticketId,
      actionUrl: `/admin/saas-management/support/tickets/${ticketId}`,
      actionLabel: "Ver ticket",
      targetAdminId: assignedToAdminId,
      metadata: {
        ticket_number: ticketNumber,
        subject,
      },
    });
  }

  /**
   * Create notification when customer adds message to SaaS ticket (visible to root/dev)
   */
  static async notifySaasSupportNewMessage(
    ticketId: string,
    ticketNumber: string,
    subject: string,
    fromCustomer: boolean,
  ): Promise<void> {
    await this.createNotification({
      type: "support_ticket_update",
      priority: fromCustomer ? "high" : "medium",
      title: fromCustomer
        ? "Nueva respuesta del cliente (SaaS)"
        : "Nueva actividad en ticket SaaS",
      message: `#${ticketNumber}: ${subject}`,
      relatedEntityType: "saas_support_ticket",
      relatedEntityId: ticketId,
      actionUrl: `/admin/saas-management/support/tickets/${ticketId}`,
      actionLabel: "Ver ticket",
      targetAdminRole: "root",
      metadata: {
        ticket_number: ticketNumber,
        subject,
        from_customer: fromCustomer,
      },
    });
  }

  /**
   * Helper to format currency
   */
  private static formatCurrency(amount: number): string {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      minimumFractionDigits: 0,
    }).format(amount);
  }
}
