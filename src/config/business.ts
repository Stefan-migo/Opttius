/**
 * Business Configuration
 *
 * This file contains all business-specific configuration that should be
 * customized when adapting this system to a new business.
 */

export const businessConfig = {
  // Business Information
  name: "Opttius",
  displayName: "Opttius",
  tagline: "Automatiza. Controla. Crece.",
  contactEmail: "contacto@opttius.cl",
  contactPhone: "+56926928279",

  // Social links (null = en construcción / no disponible)
  social: {
    instagram: "https://www.instagram.com/opttius/",
    facebook: "https://www.facebook.com/profile.php?id=61585058060650",
    linkedin: "https://www.linkedin.com/company/opttius/",
    twitter: null as string | null, // Opcional: crear cuando esté listo
  },

  // Branding (Sistema Epoch)
  colors: {
    primary: "#1A2B23", // Verde profundo - Títulos, fondos oscuros
    secondary: "#1A1A1A", // Charcoal - Fondos oscuros
    accent: "#C5A059", // Dorado - CTAs, highlights
    success: "#4ade80", // Verde éxito
    warning: "#fbbf24", // Amarillo warning
    danger: "#ef4444", // Rojo danger
    info: "#60a5fa", // Azul info
    background: "#F9F7F2", // Crema - Fondos claros
  },

  // Admin Panel
  admin: {
    title: "Opttius Admin",
    subtitle: "Automatiza. Controla. Crece.",
    logo: "/logo-opttius.svg",
  },

  // Features
  features: {
    products: true,
    orders: true,
    customers: true,
    support: true,
    analytics: true,
    categories: true,
  },

  // Currency
  currency: {
    code: "USD",
    symbol: "$",
    locale: "en-US",
  },

  // Email Configuration
  emailConfig: {
    from: "noreply@yourbusiness.com",
    replyTo: "support@yourbusiness.com",
    templates: {
      orderConfirmation: true,
      orderShipped: true,
      orderDelivered: true,
      supportTicketCreated: true,
      supportTicketUpdated: true,
    },
  },

  // Support System
  support: {
    enabled: true,
    categories: [
      "General Inquiry",
      "Order Issue",
      "Product Question",
      "Technical Support",
      "Billing",
      "Other",
    ],
  },

  // Shipping
  shipping: {
    enabled: true,
    defaultCarrier: "Standard Shipping",
  },

  // Analytics
  analytics: {
    enabled: true,
    trackRevenue: true,
    trackOrders: true,
    trackCustomers: true,
  },
};

export default businessConfig;
