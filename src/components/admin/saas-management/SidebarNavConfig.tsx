import {
  BarChart3,
  Building2,
  CreditCard,
  Database,
  DollarSign,
  HelpCircle,
  LayoutDashboard,
  Mail,
  MessageSquare,
  Settings,
  Star,
  Ticket,
  Users,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  description?: string;
  badge?: string;
}

interface NavGroup {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

// MapPin inline SVG icon
export function MapPin({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

export function createSaaSNavigationGroups(stats?: {
  totalOrganizations: number;
  activeOrganizations: number;
  openTickets: number;
  pendingDemos: number;
}): NavGroup[] {
  return [
    {
      id: "principal",
      label: "Principal",
      icon: LayoutDashboard,
      defaultExpanded: true,
      collapsible: false,
      items: [
        {
          href: "/admin/saas-management/dashboard",
          label: "Dashboard",
          icon: LayoutDashboard,
          description: "Métricas y KPIs globales",
        },
        {
          href: "/admin/saas-management/analytics",
          label: "Analíticas",
          icon: BarChart3,
          description: "Estadísticas detalladas",
        },
      ],
    },
    {
      id: "clients",
      label: "Gestión de Clientes",
      icon: Building2,
      defaultExpanded: false,
      collapsible: true,
      items: [
        {
          href: "/admin/saas-management/organizations",
          label: "Organizaciones",
          icon: Building2,
          description: "Ópticas y tenants",
          badge: stats?.totalOrganizations?.toString(),
        },
        {
          href: "/admin/saas-management/users",
          label: "Usuarios Globales",
          icon: Users,
          description: "Administradores del sistema",
        },
        {
          href: "/admin/saas-management/branches",
          label: "Sucursales",
          icon: MapPin,
          description: "Todas las sucursales",
        },
      ],
    },
    {
      id: "billing",
      label: "Suscripciones",
      icon: CreditCard,
      defaultExpanded: false,
      collapsible: true,
      items: [
        {
          href: "/admin/saas-management/subscriptions",
          label: "Suscripciones",
          icon: CreditCard,
          description: "Gestión de suscripciones",
        },
        {
          href: "/admin/saas-management/tiers",
          label: "Planes",
          icon: Star,
          description: "Basic, Pro, Premium",
        },
        {
          href: "/admin/saas-management/payments",
          label: "Pagos",
          icon: DollarSign,
          description: "Pasarelas y transacciones",
        },
      ],
    },
    {
      id: "support",
      label: "Soporte",
      icon: HelpCircle,
      defaultExpanded: false,
      collapsible: true,
      items: [
        {
          href: "/admin/saas-management/support",
          label: "Tickets",
          icon: Ticket,
          description: "Tickets B2B",
          badge: stats?.openTickets?.toString(),
        },
        {
          href: "/admin/saas-management/new-users-flow",
          label: "Demos",
          icon: Users,
          description: "Solicitudes de demo",
          badge: stats?.pendingDemos?.toString(),
        },
      ],
    },
    {
      id: "config",
      label: "Configuración",
      icon: Settings,
      defaultExpanded: false,
      collapsible: true,
      items: [
        {
          href: "/admin/saas-management/config",
          label: "Sistema",
          icon: Settings,
          description: "Configuración global",
        },
        {
          href: "/admin/saas-management/emails",
          label: "Emails",
          icon: Mail,
          description: "Plantillas de email",
        },
        {
          href: "/admin/saas-management/backups",
          label: "Backups",
          icon: Database,
          description: "Disaster recovery",
        },
        {
          href: "/admin/saas-management/whatsapp",
          label: "WhatsApp",
          icon: MessageSquare,
          description: "WhatsApp Business",
        },
      ],
    },
  ];
}
