import {
  createAdminNotification,
  formatCurrency,
} from "./_helpers/create-notification";

export async function notifyNewQuote(
  quoteId: string,
  quoteNumber: string,
  customerName: string,
  totalAmount: number,
  branchId?: string | null,
) {
  return createAdminNotification({
    type: "quote_new",
    priority: "high",
    title: "Nuevo Presupuesto",
    message: `Presupuesto ${quoteNumber} creado para ${customerName} - ${formatCurrency(totalAmount)}`,
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

export async function notifyQuoteStatusChange(
  quoteId: string,
  quoteNumber: string,
  oldStatus: string,
  newStatus: string,
  branchId?: string | null,
) {
  const statusLabels: Record<string, string> = {
    draft: "Borrador",
    sent: "Enviado",
    accepted: "Aceptado",
    rejected: "Rechazado",
    expired: "Expirado",
  };
  return createAdminNotification({
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

export async function notifyQuoteConverted(
  quoteId: string,
  quoteNumber: string,
  workOrderId: string,
  workOrderNumber: string,
  branchId?: string | null,
) {
  return createAdminNotification({
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

export async function notifyNewWorkOrder(
  workOrderId: string,
  workOrderNumber: string,
  customerName: string,
  totalAmount: number,
  branchId?: string | null,
) {
  return createAdminNotification({
    type: "work_order_new",
    priority: "high",
    title: "Nuevo Trabajo",
    message: `Trabajo ${workOrderNumber} creado para ${customerName} - ${formatCurrency(totalAmount)}`,
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

export async function notifyWorkOrderStatusChange(
  workOrderId: string,
  workOrderNumber: string,
  oldStatus: string,
  newStatus: string,
  branchId?: string | null,
) {
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
  return createAdminNotification({
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

export async function notifyWorkOrderCompleted(
  workOrderId: string,
  workOrderNumber: string,
  customerName: string,
  branchId?: string | null,
) {
  return createAdminNotification({
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

export async function notifyNewCustomer(
  customerId: string,
  customerName: string,
  email?: string,
  branchId?: string | null,
) {
  return createAdminNotification({
    type: "new_customer",
    priority: "medium",
    title: "Nuevo Cliente",
    message: `Nuevo cliente registrado: ${customerName}${email ? ` (${email})` : ""}`,
    relatedEntityType: "customer",
    relatedEntityId: customerId,
    actionUrl: `/admin/customers/${customerId}`,
    actionLabel: "Ver Cliente",
    metadata: { customer_name: customerName, email },
    branchId: branchId ?? null,
  });
}

export async function notifyNewSale(
  orderId: string,
  orderNumber: string,
  customerEmail: string,
  totalAmount: number,
  branchId?: string | null,
) {
  return createAdminNotification({
    type: "sale_new",
    priority: "high",
    title: "Nueva Venta",
    message: `Nueva venta ${orderNumber} - ${formatCurrency(totalAmount)}`,
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

export async function notifyAppointmentCancelled(
  appointmentId: string,
  customerName: string,
  appointmentDate: string,
  appointmentTime: string,
  branchId?: string | null,
) {
  return createAdminNotification({
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

export async function notifyNewAppointment(
  appointmentId: string,
  customerName: string,
  appointmentDate: string,
  appointmentTime: string,
  branchId?: string | null,
) {
  return createAdminNotification({
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

export async function notifySaasSupportTicketNew(
  ticketId: string,
  ticketNumber: string,
  subject: string,
  requesterEmail: string,
  organizationName?: string,
) {
  return createAdminNotification({
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

export async function notifySaasSupportTicketAssigned(
  ticketId: string,
  ticketNumber: string,
  subject: string,
  assignedToAdminId: string,
) {
  return createAdminNotification({
    type: "support_ticket_update",
    priority: "high",
    title: "Ticket de soporte asignado",
    message: `Te han asignado el ticket #${ticketNumber}: ${subject}`,
    relatedEntityType: "saas_support_ticket",
    relatedEntityId: ticketId,
    actionUrl: `/admin/saas-management/support/tickets/${ticketId}`,
    actionLabel: "Ver ticket",
    targetAdminId: assignedToAdminId,
    metadata: { ticket_number: ticketNumber, subject },
  });
}

export async function notifySaasSupportNewMessage(
  ticketId: string,
  ticketNumber: string,
  subject: string,
  fromCustomer: boolean,
) {
  return createAdminNotification({
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
