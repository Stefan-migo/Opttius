import {
  BarChart3,
  Database,
  FileText,
  HardDrive,
  Mail,
  Package,
  Server,
  Settings,
  Users,
} from "lucide-react";

export const CATEGORY_NAMES: Record<string, string> = {
  general: "General",
  contact: "Contacto",
  ecommerce: "E-commerce",
  inventory: "Inventario",
  membership: "Membresías",
  email: "Correo Electrónico",
  system: "Sistema",
  database: "Base de Datos",
  business: "Negocio",
  prescriptions: "Recetas",
};

export const REDUNDANCY_KEYS = [
  "site_name",
  "site_description",
  "clinic_name",
  "clinic_rut",
  "clinic_specialty",
  "from_name",
  "from_email",
  "email_from_name",
  "email_from_address",
  "resend_enabled",
  "resend_from_email",
  "smtp_host",
  "smtp_port",
  "smtp_username",
  "smtp_password",
  "support_email",
  "prescription_expiration_months",
];

export const EXCLUDED_CATEGORIES = ["appointments", "branches", "telemetry"];

export const getCategoryIcon = (category: string) => {
  const icons: Record<string, unknown> = {
    general: Settings,
    contact: Mail,
    ecommerce: Package,
    inventory: HardDrive,
    membership: Users,
    email: Mail,
    system: Server,
    database: Database,
    business: BarChart3,
    prescriptions: FileText,
  };
  return icons[category] || Settings;
};

export const getContactPlaceholder = (key: string): string => {
  const placeholders: Record<string, string> = {
    address: "Dirección",
    phone_number: "Teléfono",
    contact_email: "contacto@ejemplo.com",
    support_email: "soporte@ejemplo.com",
  };
  return placeholders[key] ?? "";
};
