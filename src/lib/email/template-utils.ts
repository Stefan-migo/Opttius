/**
 * Client-side email template utilities
 * These functions don't require server-side access and can be used in client components
 */

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
    organization?.support_email || organization?.contact_email || "soporte@opttius.cl";
  const contactEmail =
    organization?.contact_email || organization?.email || organization?.support_email || "contacto@opttius.cl";

  return {
    organization_name: organization?.name || "Opttius",
    organization_email: contactEmail,
    organization_support_email: supportEmail,
    website_url: websiteUrl,
    company_name: organization?.name || "Opttius",
    support_email: supportEmail,
    contact_email: contactEmail,
  };
}

/**
 * Format order items as HTML list
 */
export function formatOrderItemsHTML(
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant_title?: string;
  }>,
  currency = "CLP",
): string {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return items
    .map((item) => {
      const itemName = item.variant_title
        ? `${item.name} - ${item.variant_title}`
        : item.name;
      const itemTotal = item.price * item.quantity;

      return `
      <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee;">
        <span>${itemName} (x${item.quantity})</span>
        <span style="font-weight: 600;">${formatCurrency(itemTotal)}</span>
      </div>
    `;
    })
    .join("");
}

/**
 * Format order items as plain text
 */
export function formatOrderItemsText(
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    variant_title?: string;
  }>,
  currency = "CLP",
): string {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
    }).format(amount);
  };

  return items
    .map((item) => {
      const itemName = item.variant_title
        ? `${item.name} - ${item.variant_title}`
        : item.name;
      const itemTotal = item.price * item.quantity;

      return `${itemName} (x${item.quantity}): ${formatCurrency(itemTotal)}`;
    })
    .join("\n");
}
