/**
 * Client-side email template utilities
 * These functions don't require server-side access and can be used in client components
 */

/**
 * Format order items as HTML table for email
 */
export function formatOrderItemsHTML(
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant_title?: string;
  }>,
): string {
  if (!items || items.length === 0) return "";

  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">
          ${item.name}${item.variant_title ? ` - ${item.variant_title}` : ""}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
          x${item.quantity}
        </td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
          $${item.price.toLocaleString("es-CL")}
        </td>
      </tr>
    `,
    )
    .join("");

  return `
    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
      <thead>
        <tr>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #1A2B23;">Producto</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #1A2B23;">Cant.</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #1A2B23;">Precio</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

/**
 * Format order items as plain text for email
 */
export function formatOrderItemsText(
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant_title?: string;
  }>,
): string {
  if (!items || items.length === 0) return "";

  return items
    .map(
      (item) =>
        `• ${item.name}${item.variant_title ? ` - ${item.variant_title}` : ""} x${item.quantity} - $${item.price.toLocaleString("es-CL")}`,
    )
    .join("\n");
}

/**
 * Replace variables in template content
 * Supports {{variable_name}} syntax
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  let result = template;

  // Replace all variables in the format {{variable_name}}
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
    result = result.replace(regex, String(value ?? ""));
  });

  return result;
}

/**
 * Get default variables for email templates
 * organization.support_email y organization.contact_email se usan para reply-to y variables de plantilla
 */
export function getDefaultVariables(organization?: {
  name?: string;
  email?: string;
  support_email?: string;
  contact_email?: string;
}): Record<string, string> {
  const websiteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";
  const supportEmail =
    organization?.support_email ||
    organization?.contact_email ||
    "soporte@opttius.cl";
  const contactEmail =
    organization?.contact_email ||
    organization?.email ||
    organization?.support_email ||
    "contacto@opttius.cl";

  return {
    organization_name: organization?.name || "Opttius",
    organization_email: contactEmail,
    organization_support_email: supportEmail,
    website_url: websiteUrl,
    support_email: supportEmail,
    login_url: `${websiteUrl}/login`,
    contact_email: contactEmail,
  };
}
