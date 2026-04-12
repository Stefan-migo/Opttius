"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Building2,
  CreditCard,
  Database,
  DollarSign,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Mail,
  Menu,
  MessageSquare,
  MoreVertical,
  Settings,
  Star,
  Ticket,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthContext } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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

// Navigation groups para SaaS Management Engine
const createSaaSNavigationGroups = (stats?: {
  totalOrganizations: number;
  activeOrganizations: number;
  openTickets: number;
  pendingDemos: number;
}): NavGroup[] => {
  return [
    // Grupo Principal - Dashboard y visión general
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
    // Grupo Gestión de Clientes
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
          badge: stats?.totalOrganizations
            ? stats.totalOrganizations.toString()
            : undefined,
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
    // Grupo Suscripciones y Billing
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
    // Grupo Soporte
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
          badge: stats?.openTickets ? stats.openTickets.toString() : undefined,
        },
        {
          href: "/admin/saas-management/new-users-flow",
          label: "Demos",
          icon: Users,
          description: "Solicitudes de demo",
          badge: stats?.pendingDemos
            ? stats.pendingDemos.toString()
            : undefined,
        },
      ],
    },
    // Grupo Configuración
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
};

// MapPin icon que faltaba
function MapPin({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

interface SaasManagementSidebarProps {
  onNavigate?: () => void;
}

export function SaasManagementSidebar({
  onNavigate,
}: SaasManagementSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthContext();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalOrganizations: number;
    activeOrganizations: number;
    openTickets: number;
    pendingDemos: number;
  }>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    openTickets: 0,
    pendingDemos: 0,
  });
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      principal: true,
    },
  );

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saas-sidebar-groups");
      if (saved) {
        setExpandedGroups({ principal: true, ...JSON.parse(saved) });
      }
    } catch {
      // Ignorar
    }
  }, []);

  // Persistir estado de grupos
  useEffect(() => {
    try {
      localStorage.setItem(
        "saas-sidebar-groups",
        JSON.stringify(expandedGroups),
      );
    } catch {
      // Ignorar
    }
  }, [expandedGroups]);

  // Cargar stats iniciales
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/saas-management/analytics");
        if (response.ok) {
          const data = await response.json();
          setStats({
            totalOrganizations: data.totalOrganizations || 0,
            activeOrganizations: data.activeOrganizations || 0,
            openTickets: data.openTickets || 0,
            pendingDemos: data.pendingDemos || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const groups = createSaaSNavigationGroups(stats);

  return (
    <div className="saas-sidebar flex flex-col h-full w-full overflow-y-auto overflow-x-hidden relative min-h-0 bg-[#0D1117]">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" />

      {/* Logo Section */}
      <div className="saas-sidebar-header relative z-10 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center justify-between py-4 px-4">
          <Link
            className="saas-sidebar-logo group flex items-center gap-3"
            href="/admin/saas-management/dashboard"
            onClick={onNavigate}
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center shadow-lg">
              <Zap className="h-6 w-6 text-[#0D1117]" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-white tracking-tight font-display">
                SaaS Engine
              </span>
              <span className="text-[10px] text-white/50 font-medium">
                OPTTIUS
              </span>
            </div>
          </Link>
          {onNavigate && (
            <SheetClose asChild>
              <Button
                className="rounded-xl text-white/70 hover:bg-white/10 hover:text-white shrink-0"
                size="icon"
                variant="ghost"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </SheetClose>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-3 py-3 border-b border-white/5">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white/5 rounded-lg p-2.5">
            <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5">
              Organizaciones
            </div>
            <div className="text-lg font-bold text-white font-display">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                stats.totalOrganizations
              )}
            </div>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5">
            <div className="text-[10px] text-white/50 uppercase tracking-wider font-semibold mb-0.5">
              Activas
            </div>
            <div className="text-lg font-bold text-emerald-400 font-display">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                stats.activeOrganizations
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="saas-sidebar-nav flex-1 min-h-0 overflow-y-auto py-2">
        <ul className="space-y-1 px-2" role="list">
          {groups.map((group) => {
            const isExpanded =
              expandedGroups[group.id] ?? group.defaultExpanded ?? false;
            const hasItems = group.items.length > 0;

            // Determinar si algún item del grupo está activo
            const isGroupActive = group.items.some(
              (item) =>
                pathname === item.href ||
                (item.href !== "/admin/saas-management" &&
                  pathname.startsWith(item.href)),
            );

            return (
              <li key={group.id}>
                {/* Grupo Header */}
                <div
                  className={cn(
                    "group flex items-center gap-2 px-3 py-2 rounded-xl mb-1 transition-all duration-200",
                    isGroupActive
                      ? "bg-[#C5A059]/20 text-[#C5A059]"
                      : "text-white/70 hover:bg-white/5 hover:text-white",
                  )}
                >
                  <group.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm font-semibold flex-1 font-display">
                    {group.label}
                  </span>
                  {group.collapsible && (
                    <button
                      className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setExpandedGroups((prev) => ({
                          ...prev,
                          [group.id]: !prev[group.id],
                        }));
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </button>
                  )}
                </div>

                {/* Items del grupo */}
                {(isExpanded || !group.collapsible) && hasItems && (
                  <ul className="ml-4 space-y-0.5 mt-0.5">
                    {group.items.map((item) => {
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/admin/saas-management" &&
                          pathname.startsWith(item.href));

                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 group/item",
                              isActive
                                ? "bg-[#C5A059]/15 text-[#C5A059] border-l-2 border-[#C5A059]"
                                : "text-white/50 hover:bg-white/5 hover:text-white",
                            )}
                          >
                            <item.icon className="h-4 w-4 flex-shrink-0" />
                            <span className="text-sm font-medium flex-1">
                              {item.label}
                            </span>
                            {item.badge && (
                              <span className="bg-[#C5A059]/20 text-[#C5A059] text-xs font-bold px-1.5 py-0.5 rounded-md">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="saas-sidebar-footer border-t border-white/10 p-3 flex-shrink-0">
        <div className="flex flex-col gap-2">
          {/* Volver a Admin */}
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Volver a Óptica</span>
          </Link>

          {/* Cerrar sesión */}
          <Button
            variant="ghost"
            className="justify-start px-3 py-2 text-white/50 hover:bg-red-500/10 hover:text-red-400 transition-colors"
            onClick={handleSignOut}
          >
            <span className="text-sm font-medium flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" x2="9" y1="12" y2="12" />
              </svg>
              Cerrar sesión
            </span>
          </Button>
        </div>

        {/* Version info */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="text-center text-[10px] text-white/30">
            Opttius SaaS Engine v2.0
          </div>
        </div>
      </div>
    </div>
  );
}

// Componente para usar en Sheet (móvil)
export function SaasManagementSidebarSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-[300px] bg-[#0D1117] border-r border-white/10"
      >
        <SaasManagementSidebar />
      </SheetContent>
    </Sheet>
  );
}
