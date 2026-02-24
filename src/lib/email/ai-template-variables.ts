/**
 * Variables disponibles por tipo de plantilla de email B2C
 * Fuente de verdad para el agente de IA en la creación de plantillas.
 * Alineado con: notifications.ts, optica.ts, migraciones 20260230*
 *
 * IMPORTANTE: Usar organization_name (no company_name). Las variables deben
 * coincidir exactamente con lo que envían las funciones send*.
 */

export const VARIABLES_BY_TYPE: Record<string, string[]> = {
  order_confirmation: [
    "customer_name",
    "order_number",
    "order_date",
    "order_total",
    "order_items",
    "order_items_text",
    "payment_method",
    "organization_name",
    "support_email",
    "contact_email",
  ],
  order_shipped: [
    "customer_name",
    "order_number",
    "carrier",
    "tracking_number",
    "estimated_delivery",
    "organization_name",
  ],
  order_delivered: [
    "customer_name",
    "order_number",
    "delivery_date",
    "organization_name",
  ],
  payment_success: [
    "customer_name",
    "order_number",
    "amount",
    "payment_method",
    "transaction_id",
    "organization_name",
  ],
  payment_failed: [
    "customer_name",
    "order_number",
    "amount",
    "payment_method",
    "organization_name",
    "support_email",
  ],
  appointment_confirmation: [
    "customer_name",
    "customer_first_name",
    "appointment_date",
    "appointment_time",
    "professional_name",
    "appointment_type",
    "branch_name",
    "organization_name",
  ],
  appointment_reminder: [
    "customer_name",
    "appointment_date",
    "appointment_time",
    "branch_name",
    "organization_name",
  ],
  appointment_reminder_2h: [
    "customer_name",
    "customer_first_name",
    "appointment_time",
    "professional_name",
    "branch_name",
    "branch_address",
    "branch_phone",
    "organization_name",
  ],
  appointment_cancelation: [
    "customer_name",
    "customer_first_name",
    "appointment_date",
    "appointment_time",
    "branch_name",
    "branch_phone",
    "branch_email",
    "booking_url",
    "organization_name",
  ],
  appointment_rescheduled: [
    "customer_name",
    "customer_first_name",
    "appointment_date",
    "appointment_time",
    "old_appointment_date",
    "old_appointment_time",
    "branch_name",
    "branch_phone",
    "organization_name",
  ],
  appointment_follow_up_reminder: [
    "customer_name",
    "customer_first_name",
    "follow_up_date",
    "branch_name",
    "branch_phone",
    "booking_url",
    "organization_name",
  ],
  prescription_ready: [
    "customer_name",
    "customer_first_name",
    "prescription_date",
    "prescription_expiry_date",
    "prescription_number",
    "doctor_name",
    "branch_name",
    "branch_phone",
    "prescription_url",
    "organization_name",
  ],
  prescription_expiring: [
    "customer_name",
    "customer_first_name",
    "prescription_expiry_date",
    "prescription_number",
    "branch_name",
    "branch_address",
    "branch_phone",
    "branch_email",
    "booking_url",
    "organization_name",
  ],
  quote_sent: [
    "customer_name",
    "quote_number",
    "quote_date",
    "quote_total",
    "quote_expiry",
    "quote_items",
    "organization_name",
  ],
  quote_expiring: [
    "customer_name",
    "customer_first_name",
    "quote_number",
    "quote_expiry_date",
    "total",
    "accept_url",
    "quote_url",
    "branch_phone",
    "branch_email",
    "organization_name",
  ],
  work_order_ready: ["customer_name", "work_order_number", "organization_name"],
  low_stock_alert: [
    "low_stock_products",
    "low_stock_products_text",
    "product_count",
    "organization_name",
  ],
  account_welcome: ["customer_name", "account_url", "organization_name"],
  password_reset: [
    "customer_name",
    "reset_link",
    "reset_url",
    "organization_name",
  ],
  custom: [
    "customer_name",
    "organization_name",
    "support_email",
    "contact_email",
    "website_url",
  ],
};

/** Descripciones para el agente de IA - qué contiene cada variable */
export const VARIABLE_DESCRIPTIONS: Record<string, string> = {
  customer_name: "Nombre completo del cliente",
  customer_first_name: "Primer nombre del cliente",
  order_number: "Número único de la orden",
  order_date: "Fecha formateada de la orden (ej: 15 de enero de 2025)",
  order_total: "Total formateado en moneda (ej: $50.000)",
  order_items: "Lista HTML de productos de la orden",
  order_items_text: "Lista en texto plano de productos",
  payment_method: "Método de pago (Efectivo, Tarjeta de Crédito, etc.)",
  organization_name: "Nombre de la óptica/organización",
  support_email: "Email de soporte de la óptica",
  contact_email: "Email de contacto",
  website_url: "URL del sitio web",
  carrier: "Nombre del transportista",
  tracking_number: "Número de seguimiento del envío",
  estimated_delivery: "Fecha estimada de entrega formateada",
  delivery_date: "Fecha de entrega formateada",
  amount: "Monto formateado en moneda",
  transaction_id: "ID de la transacción de pago",
  appointment_date: "Fecha de la cita formateada",
  appointment_time: "Hora de la cita (ej: 10:00)",
  professional_name: "Nombre del profesional/oftalmólogo",
  appointment_type: "Tipo de consulta (examen visual, etc.)",
  branch_name: "Nombre de la sucursal",
  branch_address: "Dirección de la sucursal",
  branch_phone: "Teléfono de la sucursal",
  branch_email: "Email de la sucursal",
  old_appointment_date: "Fecha anterior (para reprogramación)",
  old_appointment_time: "Hora anterior (para reprogramación)",
  follow_up_date: "Fecha del control de seguimiento",
  booking_url: "URL para agendar/reagendar cita",
  prescription_date: "Fecha de emisión de la receta",
  prescription_expiry_date: "Fecha de vencimiento de la receta",
  prescription_number: "Número de la receta",
  doctor_name: "Nombre del profesional que emitió la receta",
  prescription_url: "URL para ver la receta",
  quote_number: "Número del presupuesto",
  quote_date: "Fecha del presupuesto",
  quote_total: "Total del presupuesto formateado",
  quote_expiry: "Fecha de vencimiento del presupuesto",
  quote_items: "Contenido HTML o texto de los ítems del presupuesto",
  quote_expiry_date: "Fecha de vencimiento del presupuesto",
  total: "Total formateado",
  accept_url: "URL para aceptar el presupuesto",
  quote_url: "URL para ver el presupuesto",
  work_order_number: "Número de la orden de trabajo",
  low_stock_products: "Lista HTML de productos con stock bajo",
  low_stock_products_text: "Lista en texto de productos con stock bajo",
  product_count: "Cantidad de productos afectados",
  account_url: "URL del panel de cuenta del usuario",
  reset_link: "URL para restablecer contraseña",
  reset_url: "URL para restablecer contraseña",
};

/**
 * Obtiene las variables para un tipo de plantilla.
 * Fallback a custom si el tipo no existe.
 */
export function getVariablesForType(type: string): string[] {
  return VARIABLES_BY_TYPE[type] || VARIABLES_BY_TYPE.custom;
}

/**
 * Genera el prompt de variables para el agente de IA,
 * incluyendo descripciones cuando están disponibles.
 */
export function buildVariablesPromptForAgent(type: string): string {
  const vars = getVariablesForType(type);
  const lines = vars.map((v) => {
    const desc = VARIABLE_DESCRIPTIONS[v];
    return desc ? `- {{${v}}}: ${desc}` : `- {{${v}}}`;
  });
  return lines.join("\n");
}
