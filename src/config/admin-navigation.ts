import {
  BarChart3,
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Glasses,
  LayoutDashboard,
  LucideIcon,
  MapPin,
  MessageSquare,
  Package,
  Receipt,
  Server,
  Settings,
  ShoppingCart,
  Upload,
  Users,
} from "lucide-react";

// Navigation item type
export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  badge?: string;
  requiresFeature?: string;
  superAdminOnly?: boolean;
  rootOnly?: boolean;
  adminOrSuperAdminOnly?: boolean;
  onboardingOnly?: boolean;
}

// Navigation group type
export interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

export function createNavigationGroups(
  newWorkOrdersCount?: number,
  openTicketsCount?: number,
  isRoot?: boolean,
  tierFeatures?: Record<string, boolean>,
): NavGroup[] {
  const hasFeature = (key: string) =>
    isRoot || !tierFeatures || tierFeatures[key] === true;

  const groups: NavGroup[] = [
    {
      id: "principal",
      label: "Principal",
      icon: LayoutDashboard,
      defaultExpanded: true,
      collapsible: false,
      items: [
        {
          href: "/admin",
          label: "Dashboard",
          icon: LayoutDashboard,
          description: "Visión general y KPIs",
        },
        {
          href: "/admin/pos",
          label: "Punto de Venta",
          icon: ShoppingCart,
          description: "Sistema POS",
        },
        {
          href: "/admin/work-orders",
          label: "Trabajos",
          icon: Glasses,
          description: "Gestión de trabajos de laboratorio",
          badge:
            newWorkOrdersCount !== undefined && newWorkOrdersCount > 0
              ? newWorkOrdersCount.toString()
              : undefined,
        },
        {
          href: "/admin/appointments",
          label: "Citas y Agenda",
          icon: Calendar,
          description: "Gestión de citas y agenda",
        },
        {
          href: "/admin/quotes",
          label: "Presupuestos",
          icon: Receipt,
          description: "Crear y gestionar presupuestos",
        },
      ],
    },
    {
      id: "gestion",
      label: "Gestión",
      icon: Users,
      defaultExpanded: false,
      collapsible: true,
      items: [
        {
          href: "/admin/customers",
          label: "Clientes",
          icon: Users,
          description: "Gestión de clientes",
        },
        {
          href: "/admin/products",
          label: "Productos",
          icon: Package,
          description: "Catálogo e inventario",
        },
        {
          href: "/admin/products/import",
          label: "Importar",
          icon: Upload,
          description: "Importar productos desde archivo",
        },
        {
          href: "/admin/prescriptions",
          label: "Libro de Recetas",
          icon: ClipboardList,
          description: "Registro de recetas despachadas (Código Sanitario)",
        },
        ...(hasFeature("agreements")
          ? [
              {
                href: "/admin/agreements" as const,
                label: "Convenios" as const,
                icon: FileText as LucideIcon,
                description:
                  "Gestión de convenios con empresas e instituciones" as const,
              },
            ]
          : []),
        ...(hasFeature("field_operations")
          ? [
              {
                href: "/admin/field-operations" as const,
                label: "Operativos en Terreno" as const,
                icon: MapPin as LucideIcon,
                description: "Operativos móviles y bodega temporal" as const,
              },
            ]
          : []),
      ],
    },
    {
      id: "administracion",
      label: "Administración",
      icon: Settings,
      defaultExpanded: false,
      collapsible: true,
      items: [
        {
          href: "/admin/analytics",
          label: "Analíticas",
          icon: BarChart3,
          description: "Reportes y estadísticas",
        },
        {
          href: "/admin/support",
          label: "Incidentes",
          icon: MessageSquare,
          description: "Registro de incidentes y problemas",
          badge:
            openTicketsCount !== undefined && openTicketsCount > 0
              ? openTicketsCount.toString()
              : undefined,
        },
        {
          href: "/admin/system",
          label: "Sistema",
          icon: Server,
          description: "Administración del sistema",
        },
        ...(isRoot
          ? [
              {
                href: "/admin/saas-management" as const,
                label: "Gestión SaaS" as const,
                icon: Settings as LucideIcon,
                description: "Administración del SaaS" as const,
                rootOnly: true as const,
              },
            ]
          : []),
        ...(isRoot
          ? [
              {
                href: "/admin/branches" as const,
                label: "Sucursales" as const,
                icon: Building2 as LucideIcon,
                description: "Gestión de sucursales" as const,
                superAdminOnly: true as const,
              },
            ]
          : []),
        {
          href: "/admin/admin-users",
          label: "Administradores",
          icon: Users,
          description: "Gestión de usuarios admin",
          adminOrSuperAdminOnly: true,
        },
      ],
    },
  ];
  return groups;
}
