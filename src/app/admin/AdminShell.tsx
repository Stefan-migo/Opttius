"use client";

import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  ChevronDown,
  ClipboardList,
  FileText,
  Glasses,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  LogOut,
  LucideIcon,
  MapPin,
  Menu,
  MessageSquare,
  Package,
  Receipt,
  Server,
  Settings,
  ShoppingCart,
  Sparkles,
  Upload,
  User,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import { MobileFAB } from "@/components/admin/MobileFAB";
import AdminNotificationDropdown from "@/components/admin/AdminNotificationDropdown";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { AgentBubbleContainer } from "@/components/ai/AgentBubbleContainer";
import { SubscriptionGuard } from "@/components/admin/SubscriptionGuard";
import { DemoModeBanner } from "@/components/onboarding/DemoModeBanner";
import { TourButton } from "@/components/onboarding/TourButton";
import { TourProvider } from "@/components/onboarding/TourProvider";
import { useTheme } from "@/components/theme-provider";
import { ThemeSelector } from "@/components/theme-selector";
import { Badge } from "@/components/ui/badge";
import { OpttiusLogoCompact } from "@/components/ui/brand/OpttiusLogo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import businessConfig from "@/config/business";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { useRoot } from "@/hooks/useRoot";
import { cn } from "@/lib/utils";
import { getBranchHeader } from "@/lib/utils/branch";

interface AdminLayoutProps {
  children: React.ReactNode;
}

// Navigation item type
interface NavItem {
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
interface NavGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

// Admin navigation groups - orden por flujo natural del usuario:
const createNavigationGroups = (
  newWorkOrdersCount?: number,
  openTicketsCount?: number,
  isRoot?: boolean,
  tierFeatures?: Record<string, boolean>,
): NavGroup[] => {
  const hasFeature = (key: string) =>
    isRoot || !tierFeatures || tierFeatures[key] === true;

  const groups: NavGroup[] = [
    // Grupo Principal - Operación diaria (más usados)
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
    // Grupo Gestión - CRM y catálogo
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
        // Módulos especiales (tier-gated)
        ...(hasFeature("agreements")
          ? [
              {
                href: "/admin/agreements",
                label: "Convenios",
                icon: FileText,
                description:
                  "Gestión de convenios con empresas e instituciones",
              },
            ]
          : []),
        ...(hasFeature("field_operations")
          ? [
              {
                href: "/admin/field-operations",
                label: "Operativos en Terreno",
                icon: MapPin,
                description: "Operativos móviles y bodega temporal",
              },
            ]
          : []),
      ],
    },
    // Grupo Administración - Configuración y soporte
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
        // Configuración
        {
          href: "/admin/system",
          label: "Sistema",
          icon: Server,
          description: "Administración del sistema",
        },
        ...(isRoot
          ? [
              {
                href: "/admin/saas-management",
                label: "Gestión SaaS",
                icon: Settings,
                description: "Administración del SaaS",
                rootOnly: true,
              },
            ]
          : []),
        ...(isRoot
          ? [
              {
                href: "/admin/branches",
                label: "Sucursales",
                icon: Building2,
                description: "Gestión de sucursales",
                superAdminOnly: true,
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
};

export function AdminShell({ children }: AdminLayoutProps) {
  const { user, profile, loading, signOut } = useAuthContext();
  const { isSuperAdmin, currentBranchId } = useBranch();
  const { isRoot, isLoading: isRootLoading } = useRoot();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  // ✅ Detectar si es SaaS Management - si lo es, no renderizar el AdminShell
  // El SaaS Management tiene su propio layout independiente
  if (pathname.startsWith("/admin/saas-management")) {
    return <>{children}</>;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  // Cargar estado de grupos expandidos desde localStorage
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") {
        return { principal: true };
      }
      try {
        const saved = localStorage.getItem("opttius-sidebar-groups");
        if (saved) {
          return { principal: true, ...JSON.parse(saved) };
        }
      } catch {
        // Ignorar errores de localStorage
      }
      return { principal: true };
    },
  );

  // Persistir estado de grupos en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(
        "opttius-sidebar-groups",
        JSON.stringify(expandedGroups),
      );
    } catch {
      // Ignorar errores de localStorage
    }
  }, [expandedGroups]);

  // Admin state management - using combined state to prevent race conditions
  const [adminState, setAdminState] = useState<{
    isChecking: boolean;
    isAdmin: boolean;
    hasChecked: boolean;
    checkedUserId: string | null; // Track which user ID was checked
  }>({
    isChecking: true,
    isAdmin: false,
    hasChecked: false,
    checkedUserId: null,
  });

  // Admin role (admin, super_admin, employee, vendedor, root, dev) - para filtrar navegación
  const [adminRole, setAdminRole] = useState<string | null>(null);

  // Organization state
  const [organizationState, setOrganizationState] = useState<{
    hasOrganization: boolean | null;
    organizationName: string | null;
    organizationLogo: string | null;
    organizationSlogan: string | null;
    isDemoMode: boolean;
    showActivateBanner: boolean;
    onboardingRequired: boolean;
    isChecking: boolean;
    tierFeatures?: Record<string, boolean>;
  }>({
    hasOrganization: null,
    organizationName: null,
    organizationLogo: null,
    organizationSlogan: null,
    isDemoMode: false,
    showActivateBanner: false,
    onboardingRequired: false,
    isChecking: true,
  });

  // Dynamic stats state - Updated for Optical Shop
  const [stats, setStats] = useState<{
    todayOrders: number;
    totalOrders: number;
    revenue: number;
    lowStock: number;
    // Optical Shop specific stats
    newWorkOrders: number; // Trabajos nuevos/pendientes
    inProgressWorkOrders: number; // Trabajos en progreso
    pendingQuotes: number; // Presupuestos pendientes
    todayAppointments: number; // Citas de hoy
    openTickets: number; // Tickets de soporte abiertos
  }>({
    todayOrders: 0,
    totalOrders: 0,
    revenue: 0,
    lowStock: 0,
    newWorkOrders: 0,
    inProgressWorkOrders: 0,
    pendingQuotes: 0,
    todayAppointments: 0,
    openTickets: 0,
  });

  // Add state to prevent multiple simultaneous admin checks
  const [isAdminCheckInProgress, setIsAdminCheckInProgress] = useState(false);

  // Add ref to prevent multiple redirects
  const redirectInProgress = useRef(false);

  // Ref para leer user actual en setTimeout (evita closure obsoleta cuando INITIAL_SESSION llega tarde)
  const latestUserRef = useRef(user);
  latestUserRef.current = user;

  // When user is signing out, skip any redirect to onboarding (avoids race with check-status response)
  const signOutInProgress = useRef(false);

  // Add ref to track if we've already logged the render message
  const hasLoggedRender = useRef(false);
  const lastLoggedUserId = useRef<string | null>(null);

  // Debug mode - can be enabled via localStorage
  const debugMode =
    typeof window !== "undefined" &&
    localStorage.getItem("admin-debug") === "true";

  // Check organization status
  useEffect(() => {
    const checkOrganization = async () => {
      // Solo verificar organización si el usuario es admin y está completamente autenticado
      // También esperar a que el check de root esté completo
      if (
        !adminState.isAdmin ||
        !adminState.hasChecked ||
        !user ||
        loading ||
        isRootLoading
      ) {
        if (!adminState.isAdmin && adminState.hasChecked) {
          // Si ya verificamos y no es admin, no necesitamos verificar organización
          setOrganizationState({
            hasOrganization: false,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: false,
            isChecking: false,
          });
        }
        return;
      }

      // Si es root/dev, no necesita verificación de organización
      if (isRoot) {
        console.log("✅ Root/dev user detected - skipping organization check");
        setOrganizationState({
          hasOrganization: true, // Root users no necesitan organización pero marcamos como true para evitar redirección
          organizationName: null,
          organizationLogo: null,
          organizationSlogan: null,
          isDemoMode: false,
          showActivateBanner: false,
          onboardingRequired: false,
          isChecking: false,
        });
        return;
      }

      setOrganizationState((prev) => ({ ...prev, isChecking: true }));

      try {
        const response = await fetch("/api/admin/check-status");

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.organization) {
          const isRootUser = data.organization.isRootUser || false;
          setAdminRole(data.adminCheck?.role ?? null);
          const orgState = {
            hasOrganization: data.organization.hasOrganization || isRootUser, // Root users no necesitan organización
            organizationName: data.organization.organizationName || null,
            organizationLogo: data.organization.organizationLogo || null,
            organizationSlogan: data.organization.organizationSlogan || null,
            isDemoMode: data.organization.isDemoMode || false,
            showActivateBanner:
              data.organization.showActivateBanner ??
              data.organization.isDemoMode ??
              false,
            onboardingRequired:
              data.organization.onboardingRequired && !isRootUser, // Root users nunca necesitan onboarding
            isChecking: false,
            tierFeatures: data.organization.tierFeatures ?? {},
          };

          setOrganizationState(orgState);

          // Solo redirigir a onboarding si realmente es necesario (y no estamos cerrando sesión)
          // No redirigir si tiene organización (incluso si es demo), es super_admin, o es root/dev
          if (
            !signOutInProgress.current &&
            orgState.onboardingRequired &&
            !orgState.hasOrganization &&
            !data.organization.isSuperAdmin &&
            !isRootUser
          ) {
            console.log(
              "🔄 Redirecting to onboarding - no organization assigned",
            );
            router.push("/onboarding/choice");
            return;
          }

          // Si es root/dev, permitir acceso directo sin verificación de organización
          if (isRootUser) {
            console.log(
              "✅ Root/dev user detected - skipping organization check",
            );
          }
        } else {
          // Si no hay datos de organización pero el usuario es admin
          setAdminRole(data.adminCheck?.role ?? null);
          // Verificar si es root/dev usando el hook del componente
          console.warn(
            "⚠️ No organization data in check-status response, but user is admin",
          );

          // Si es root/dev, no necesita onboarding
          if (isRoot) {
            console.log("✅ Root/dev user - skipping onboarding requirement");
            setAdminRole("root");
            setOrganizationState({
              hasOrganization: true, // Root/dev no necesita organización pero marcamos como true
              organizationName: null,
              organizationLogo: null,
              organizationSlogan: null,
              isDemoMode: false,
              showActivateBanner: false,
              onboardingRequired: false,
              isChecking: false,
            });
            return;
          }

          // Si no es root/dev y no hay organización, requerir onboarding (salvo si está cerrando sesión)
          setOrganizationState({
            hasOrganization: false,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: true,
            isChecking: false,
          });

          if (!signOutInProgress.current) {
            console.log("🔄 Redirecting to onboarding - no organization data");
            router.push("/onboarding/choice");
          }
          return;
        }
      } catch (error) {
        console.error("❌ Error checking organization status:", error);
        // En caso de error, verificar si es root/dev para no bloquear acceso
        if (isRoot) {
          console.log(
            "✅ Root/dev user - skipping onboarding requirement despite error",
          );
          setOrganizationState({
            hasOrganization: true, // Root/dev no necesita organización
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: false,
            isChecking: false,
          });
        } else {
          // Si no es root/dev y hay error, requerir onboarding por seguridad (salvo si está cerrando sesión)
          setOrganizationState({
            hasOrganization: false,
            organizationName: null,
            organizationLogo: null,
            organizationSlogan: null,
            isDemoMode: false,
            showActivateBanner: false,
            onboardingRequired: true,
            isChecking: false,
          });
          if (!signOutInProgress.current) {
            console.log(
              "🔄 Redirecting to onboarding - error checking organization",
            );
            router.push("/onboarding/choice");
          }
        }
      }
    };

    checkOrganization();
  }, [
    adminState.isAdmin,
    adminState.hasChecked,
    user,
    loading,
    router,
    isRoot,
    isRootLoading,
  ]);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!adminState.isAdmin || !user || loading) return;

      try {
        const headers: HeadersInit = {
          ...getBranchHeader(currentBranchId),
        };

        const response = await fetch("/api/admin/dashboard", {
          headers,
          credentials: "include",
        });
        if (response.ok) {
          const result = await response.json();
          if (!result.success)
            throw new Error(result.error?.message || "Error fetching stats");

          const data = result.data;
          // Extract optical shop specific data
          const workOrders = data.kpis?.workOrders || {};
          const quotes = data.kpis?.quotes || {};
          const appointments = data.kpis?.appointments || {};

          // Fetch open tickets count for internal support (only for non-root users)
          let openTicketsCount = 0;
          if (!isRoot) {
            try {
              // Fetch internal support tickets to count open ones
              const ticketsResponse = await fetch(
                "/api/admin/optical-support/tickets?limit=100",
              );
              if (ticketsResponse.ok) {
                const ticketsData = await ticketsResponse.json();
                const allTickets = ticketsData.tickets || [];
                // Count tickets that are not resolved or closed
                openTicketsCount = allTickets.filter(
                  (t: { status?: string }) =>
                    t.status !== "resolved" && t.status !== "closed",
                ).length;
              } else if (ticketsResponse.status === 403) {
                // User doesn't have access to tickets, silently ignore
                console.debug("User doesn't have access to tickets");
              }
            } catch (error) {
              // Silently handle errors - tickets count is not critical
              console.debug("Error fetching open tickets count:", error);
            }
          }

          setStats({
            todayOrders: data.kpis?.orders?.pending || 0,
            totalOrders: workOrders.pending || 0, // Trabajos pendientes para el badge
            revenue: data.kpis?.revenue?.current || 0,
            lowStock: data.kpis?.products?.lowStock || 0,
            // Optical Shop specific
            newWorkOrders: workOrders.pending || 0, // Trabajos nuevos/pendientes
            inProgressWorkOrders: workOrders.inProgress || 0, // Trabajos en progreso
            pendingQuotes: quotes.pending || 0, // Presupuestos pendientes
            todayAppointments: appointments.today || 0, // Citas de hoy
            openTickets: openTicketsCount, // Tickets de soporte abiertos
          });
        }
      } catch (error) {
        // Silently handle 401 errors during initial load
        if (error instanceof Error && !error.message.includes("401")) {
          console.error("Error fetching stats:", error);
        }
      }
    };

    fetchStats();
    // Refresh stats every 30 seconds for real-time updates
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [adminState.isAdmin, user, loading, currentBranchId]);

  useEffect(() => {
    const checkAdminStatus = async () => {
      console.log("🔍 Admin layout: Starting admin check", {
        loading,
        hasUser: !!user,
        userEmail: user?.email,
        userId: user?.id,
        alreadyChecked: adminState.hasChecked,
        checkedUserId: adminState.checkedUserId,
        isAdminCheckInProgress,
      });

      // Don't check admin status if auth is still loading
      if (loading) {
        console.log("⏳ Auth still loading, waiting...");
        // Don't set state here to avoid unnecessary re-renders
        return;
      }

      // Wait a bit longer after auth loads to ensure auth state is stable
      if (!user) {
        console.log("❌ No user found");
        setAdminState({
          isChecking: false,
          isAdmin: false,
          hasChecked: true,
          checkedUserId: null,
        });
        return;
      }

      // Additional check: ensure we have a valid user with email
      if (!user.email) {
        console.log("⚠️ User found but no email");
        setAdminState({
          isChecking: false,
          isAdmin: false,
          hasChecked: false, // Don't mark as checked yet
          checkedUserId: null,
        });
        return;
      }

      // 🚀 KEY FIX: Skip admin check if we already checked this exact user ID
      // This prevents re-checking during token refresh events
      if (
        adminState.hasChecked &&
        adminState.checkedUserId === user.id &&
        adminState.isAdmin
      ) {
        console.log("✅ Already checked this user and is admin, skipping");
        return;
      }

      // Prevent multiple simultaneous admin checks
      if (isAdminCheckInProgress) {
        console.log("⏳ Admin check already in progress, skipping");
        return;
      }

      // Start admin check
      console.log("🚀 Starting admin check for user:", user.email);
      setIsAdminCheckInProgress(true);
      setAdminState((prev) => ({
        ...prev,
        isChecking: true,
        hasChecked: false,
      }));

      try {
        if (debugMode) {
          setAdminState({
            isChecking: false,
            isAdmin: true, // Force admin access in debug mode
            hasChecked: true,
            checkedUserId: user.id,
          });
          setIsAdminCheckInProgress(false);
          return;
        }

        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();

        // Add timeout to admin check to prevent infinite loading
        const adminCheckPromise = supabase.rpc("is_admin", {
          user_id: user.id,
        });
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Admin check timeout")), 10000),
        );

        const raceResult = (await Promise.race([
          adminCheckPromise,
          timeoutPromise,
        ])) as { data: unknown; error: { message: string } | null };
        const { data, error } = raceResult;

        let isAdminResult = false;

        if (error) {
          if (
            error.message !== "Admin check timeout" &&
            process.env.NODE_ENV === "development"
          ) {
            console.error("❌ Error checking admin status:", error);
          }
          isAdminResult = false;
        } else {
          isAdminResult = !!data;
        }

        // Atomic state update - set both checking and result together
        setAdminState({
          isChecking: false,
          isAdmin: isAdminResult,
          hasChecked: true,
          checkedUserId: user.id, // 🚀 KEY FIX: Store the user ID we checked
        });
        setIsAdminCheckInProgress(false);

        console.log("🏁 Admin check completed:", {
          isAdmin: isAdminResult,
          userId: user.id,
          userEmail: user.email,
        });

        // Si es admin, iniciar verificación de organización inmediatamente
        if (isAdminResult && user.id) {
          console.log("✅ User is admin, organization check will run next");
        } else {
          console.warn("⚠️ User is NOT admin, will redirect to login");
        }
      } catch (error: unknown) {
        if (error instanceof Error && error.message === "Admin check timeout") {
          console.error("⏱️ Admin check timed out - assuming not admin");
        } else if (error instanceof Error) {
          console.error("❌ Error checking admin status:", error);
        } else {
          console.error("❌ Error checking admin status:", error);
        }

        // Atomic state update for error case
        setAdminState({
          isChecking: false,
          isAdmin: false,
          hasChecked: true,
          checkedUserId: user.id,
        });
        setIsAdminCheckInProgress(false);
      }
    };

    checkAdminStatus();
  }, [user?.id, loading]); // 🚀 KEY FIX: Only depend on user.id instead of entire user object

  useEffect(() => {
    console.log("🔄 Admin redirect check effect triggered:", {
      redirectInProgress: redirectInProgress.current,
      loading,
      adminStateHasChecked: adminState.hasChecked,
      adminStateIsChecking: adminState.isChecking,
      adminStateIsAdmin: adminState.isAdmin,
      hasUser: !!user,
      userEmail: user?.email,
    });

    // Skip if redirect is already in progress
    if (redirectInProgress.current) {
      console.log("⏭️ Redirect already in progress, skipping");
      return;
    }

    // Only redirect after both auth and admin checks are COMPLETELY finished
    if (!loading && adminState.hasChecked && !adminState.isChecking) {
      // If user is admin, just mark as done and return early
      if (user && user.email && adminState.isAdmin) {
        console.log("✅ User is admin, allowing access");
        return;
      }

      // Add a small delay to let auth fully stabilize before redirecting
      const delayRedirect = () => {
        console.log("⏳ Delaying redirect to let auth stabilize...");
        redirectInProgress.current = true;
        setTimeout(() => {
          console.log("🚪 Executing redirect check:", {
            hasUser: !!user,
            userEmail: user?.email,
            isAdmin: adminState.isAdmin,
          });

          // Usar ref para leer user ACTUAL (evita redirect si INITIAL_SESSION llegó durante el delay)
          const currentUser = latestUserRef.current;

          if (!currentUser || !currentUser.email) {
            // Si el usuario acaba de cerrar sesión, ya estamos yendo a "/"; no redirigir a login
            if (signOutInProgress.current) return;
            console.log("❌ No user, redirecting to login");
            router.push("/login");
            return;
          }

          // Usuario logueado pero no admin -> onboarding (elegir demo o crear org)
          if (!adminState.isAdmin) {
            console.log("⚠️ User is not admin, redirecting to onboarding");
            router.push("/onboarding/choice");
            return;
          }

          console.log("✅ User is admin, allowing access");
        }, 800); // 800ms delay to let auth stabilize (INITIAL_SESSION puede llegar tarde en nueva pestaña)
      };

      if (!user || !user.email || !adminState.isAdmin) {
        delayRedirect();
      }
    } else {
      console.log("⏳ Still checking, waiting...", {
        loading,
        adminStateHasChecked: adminState.hasChecked,
        adminStateIsChecking: adminState.isChecking,
      });
    }
  }, [
    user?.id,
    adminState.hasChecked,
    adminState.isChecking,
    adminState.isAdmin,
    loading,
    router,
  ]);

  // Reset redirect/signOut flags when user changes
  useEffect(() => {
    redirectInProgress.current = false;
    // Solo resetear signOutInProgress cuando hay usuario de nuevo (nuevo login).
    // No resetear al cerrar sesión, así el setTimeout de redirección no nos manda a /login.
    if (user?.id) signOutInProgress.current = false;
  }, [user?.id]);

  const handleSignOut = async () => {
    signOutInProgress.current = true;
    await signOut();
    router.push("/");
  };

  // Show loading while auth or admin check is in progress
  // NO bloquear por verificación de organización si el usuario ya es admin
  const isStillChecking =
    loading || adminState.isChecking || !adminState.hasChecked;

  if (isStillChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        {/* Decorative Background Elements - theme-aware */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-foreground/5 rounded-full blur-[120px] animate-pulse delay-700" />
        </div>

        <div className="relative z-10 flex flex-col items-center justify-center space-y-10 animate-in fade-in zoom-in duration-1000">
          <div className="relative group">
            <div className="absolute inset-0 bg-accent/20 rounded-xl blur-3xl animate-pulse scale-125 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            <OpttiusLogoCompact
              className="h-28 w-36 relative z-10 transition-transform duration-700 group-hover:scale-105"
              forceLight={theme === "dark"}
            />
          </div>

          <div className="flex flex-col items-center space-y-6">
            <div className="flex items-center gap-4 px-6 py-2 border border-border bg-card shadow-sm rounded-xl animate-in slide-in-from-bottom-4 duration-1000 delay-300">
              <Loader2 className="h-4 w-4 animate-spin text-accent" />
              <p className="text-[10px] font-display font-bold text-foreground uppercase tracking-[0.4em]">
                {loading
                  ? "Sincronizando Identidad"
                  : adminState.isChecking
                    ? "Consultando Credenciales de Maestro"
                    : "Autenticando Protocolos"}
              </p>
            </div>

            <p className="text-[11px] font-serif italic text-muted-foreground text-center uppercase tracking-[0.2em] animate-in fade-in duration-1000 delay-500">
              {user?.email
                ? `Estableciendo acceso seguro para ${user.email}`
                : "Estructurando entorno de trabajo..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If auth is loaded but user is not found or not admin, let the redirect useEffect handle it
  // Don't render the admin interface until we confirm admin access
  // IMPORTANT: Solo verificar esto después de que la verificación de admin haya terminado
  // NO bloquear por verificación de organización - eso es opcional
  // Mostrar mensajes contextuales de redirección (no "Acceso Denegado" para usuarios en flujo de config)
  if (
    !loading &&
    adminState.hasChecked &&
    !adminState.isChecking &&
    (!user || !adminState.isAdmin)
  ) {
    const isRedirectingToLogin = !user;
    const isRedirectingToOnboarding = user && !adminState.isAdmin;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <div className="relative z-10 flex flex-col items-center justify-center space-y-8 animate-in fade-in duration-700">
          <OpttiusLogoCompact
            className="h-20 w-24"
            forceLight={theme === "dark"}
          />
          <div className="p-6 bg-muted border border-border rounded-xl shadow-sm animate-pulse">
            <Loader2 className="h-10 w-10 text-accent animate-spin" />
          </div>

          <div className="text-center space-y-3">
            <h2 className="text-xl font-display font-bold text-foreground uppercase tracking-tighter">
              {isRedirectingToLogin
                ? "Redirigiendo"
                : isRedirectingToOnboarding
                  ? "Completando configuración"
                  : "Redirigiendo"}
            </h2>
            <p className="text-[11px] font-serif italic text-muted-foreground uppercase tracking-[0.2em]">
              {isRedirectingToLogin
                ? "Redirigiendo al portal de acceso"
                : isRedirectingToOnboarding
                  ? "Redirigiendo a configuración inicial"
                  : "Redirigiendo al portal de acceso"}
            </p>
          </div>

          <div className="w-48 h-[1px] bg-border" />
        </div>
      </div>
    );
  }

  // If we reach here, user is authenticated and is admin
  // Only log once per user session to avoid console spam
  if (user?.email && user?.id) {
    // Reset if user changed
    if (lastLoggedUserId.current !== user.id) {
      hasLoggedRender.current = false;
      lastLoggedUserId.current = user.id;
    }

    // Log only once per user (removed for cleaner console)
    if (!hasLoggedRender.current) {
      hasLoggedRender.current = true;
    }
  }

  return (
    <TourProvider>
      <SubscriptionGuard>
        <div className="admin-layout">
          {/* Mobile Header - app browser style: logo + name left, menu right */}
          <div className="lg:hidden admin-header">
            <div className="admin-header-content">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Mobile Logo - Epoch style */}
                <div className="relative">
                  {organizationState.organizationLogo ? (
                    <div className="rounded-lg border border-epoch-accent/20 overflow-hidden shrink-0">
                      <Image
                        alt="Logo"
                        className="h-7 w-7 object-cover"
                        height={28}
                        src={organizationState.organizationLogo}
                        width={28}
                      />
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-lg bg-epoch-primary/10 border border-epoch-accent/20 flex items-center justify-center shrink-0">
                      <span className="font-display text-epoch-accent font-bold text-sm">
                        {organizationState.organizationName?.[0] ||
                          businessConfig.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                <h1 className="admin-header-title font-display uppercase tracking-widest text-[11px] sm:text-xs truncate font-medium">
                  {organizationState.organizationName || businessConfig.name}
                </h1>
              </div>

              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button
                    className="shrink-0 hover:bg-epoch-accent/10"
                    size="icon"
                    variant="ghost"
                  >
                    <Menu className="h-5 w-5 text-[#F9F7F2]" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  elevateZIndex
                  hideDefaultClose
                  className="!w-[75vw] max-w-[75vw] !p-0 !h-[100dvh] bg-admin-bg-secondary overflow-hidden flex flex-col"
                  side="left"
                >
                  <AdminSidebar
                    adminRole={adminRole}
                    expandedGroups={expandedGroups}
                    organizationState={organizationState}
                    pathname={pathname}
                    setExpandedGroups={setExpandedGroups}
                    stats={stats}
                    onNavigate={() => setSidebarOpen(false)}
                  />
                </SheetContent>
              </Sheet>
            </div>
          </div>

          <div className="lg:flex lg:min-h-0 lg:flex-1">
            {/* Desktop Sidebar - fixed left, 320px width */}
            <aside className="hidden lg:flex lg:w-80 lg:flex-shrink-0 lg:flex-col lg:fixed lg:left-0 lg:top-0 lg:bottom-0 lg:h-screen lg:overflow-hidden lg:z-40">
              <AdminSidebar
                adminRole={adminRole}
                expandedGroups={expandedGroups}
                organizationState={organizationState}
                pathname={pathname}
                setExpandedGroups={setExpandedGroups}
                stats={stats}
                onChatbotClick={() => setChatbotOpen(true)}
              />
            </aside>

            {/* Main Content */}
            <div className="lg:pl-80 flex-1 min-w-0 w-full">
              {/* Desktop Header */}
              <div className="hidden lg:block admin-header">
                <div className="admin-header-content">
                  {/* Logo + Org Info */}
                  <div className="flex items-center gap-4">
                    {/* Logo Container - Epoch style */}
                    <div className="relative group">
                      {organizationState.organizationLogo ? (
                        <div className="relative overflow-hidden rounded-xl border border-epoch-accent/20 shadow-sm transition-all duration-300 group-hover:border-epoch-accent/40 group-hover:shadow-md">
                          <Image
                            alt="Logo"
                            className="h-10 w-10 object-cover"
                            height={40}
                            src={organizationState.organizationLogo}
                            width={40}
                          />
                        </div>
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-epoch-primary/10 border border-epoch-accent/20 flex items-center justify-center transition-all duration-300 group-hover:border-epoch-accent/40 group-hover:bg-epoch-primary/20">
                          <span className="font-display text-epoch-accent font-bold text-lg">
                            {organizationState.organizationName?.[0] ||
                              businessConfig.name[0]}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Org Name + Slogan */}
                    <div className="flex flex-col">
                      <h1 className="font-display text-foreground uppercase tracking-widest text-sm lg:text-base font-semibold">
                        {organizationState.organizationName ||
                          businessConfig.displayName ||
                          businessConfig.name}
                      </h1>
                      <p className="font-serif italic text-muted-foreground text-xs">
                        {organizationState.organizationSlogan ||
                          (organizationState.organizationName
                            ? "Excelencia en Gestión Óptica"
                            : businessConfig.admin.subtitle)}
                      </p>
                    </div>
                  </div>

                  {/* Actions - Unified style */}
                  <div className="admin-header-actions flex items-center gap-2">
                    <BranchSelector />

                    <div className="h-6 w-px bg-border/50 mx-1" />

                    <ThemeSelector />
                    <AdminNotificationDropdown />

                    {/* Botón "Activar tu óptica" - Integrado visualmente */}
                    {organizationState.isDemoMode &&
                      organizationState.showActivateBanner && (
                        <Button
                          className="bg-epoch-accent hover:bg-epoch-accent/90 text-epoch-primary flex items-center gap-2 font-display font-bold uppercase tracking-widest text-[9px] rounded-xl shadow-md shadow-epoch-accent/10 transition-all duration-200 hover:shadow-lg hover:shadow-epoch-accent/20"
                          size="sm"
                          onClick={() => router.push("/onboarding/create")}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          Activar
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                  </div>
                </div>
              </div>

              {/* Page Content - pb for mobile bottom nav */}
              <main className="admin-content pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
                {/* Demo Mode Banner - solo cuando showActivateBanner (oculto para demos orgánicas) */}
                {organizationState.isDemoMode &&
                  organizationState.showActivateBanner && <DemoModeBanner />}
                <TooltipProvider delayDuration={300}>
                  {children}
                </TooltipProvider>
              </main>
            </div>
          </div>

          {/* Agent Bubble — visible across all admin routes */}
          <AgentBubbleContainer />

          {/* Mobile Bottom Nav - Navegación principal con herramientas */}
          <MobileBottomNav
            onChatbotClick={() => setChatbotOpen(true)}
            onInsightsClick={() => setInsightsOpen(true)}
          />

          {/* FAB para acciones rápidas en móvil */}
          <MobileFAB />
        </div>
      </SubscriptionGuard>
    </TourProvider>
  );
}

// Sidebar Component
function AdminSidebar({
  pathname,
  onNavigate,
  stats,
  onChatbotClick,
  organizationState,
  adminRole,
  expandedGroups,
  setExpandedGroups,
}: {
  pathname: string;
  onNavigate?: () => void;
  stats: {
    todayOrders: number;
    totalOrders: number;
    revenue: number;
    lowStock: number;
    newWorkOrders: number;
    inProgressWorkOrders: number;
    pendingQuotes: number;
    todayAppointments: number;
    openTickets: number;
  };
  onChatbotClick?: () => void;
  organizationState?: {
    hasOrganization: boolean | null;
    organizationName: string | null;
    organizationLogo: string | null;
    organizationSlogan: string | null;
    isDemoMode: boolean;
    onboardingRequired: boolean;
    isChecking: boolean;
    tierFeatures?: Record<string, boolean>;
  };
  adminRole?: string | null;
  expandedGroups: Record<string, boolean>;
  setExpandedGroups: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
}) {
  const { isSuperAdmin } = useBranch();
  const { isRoot } = useRoot();
  const { user, profile, signOut } = useAuthContext();
  const { theme } = useTheme(); // Hook para detectar el tema
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="admin-sidebar flex flex-col h-full w-full overflow-y-auto overflow-x-hidden relative min-h-0">
      {/* Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" />

      {/* Logo Section - with close button when in Sheet (mobile) */}
      <div className="admin-sidebar-header relative z-10 border-b border-admin-border-primary/10 flex-shrink-0">
        <div className="flex items-center justify-between py-4 px-4">
          <Link
            className="admin-sidebar-logo group flex items-center justify-center gap-3"
            href="/"
            onClick={onNavigate}
          >
            <Image
              alt="Opttius"
              className="h-10 w-10 flex-shrink-0 object-contain"
              height={44}
              src="/logo-opttius.svg"
              width={44}
            />
            <Image
              alt="Opttius"
              className="h-9 w-36 object-contain object-left"
              height={40}
              src="/logo-text-default.svg"
              width={176}
            />
          </Link>
          {onNavigate && (
            <SheetClose asChild>
              <Button
                className="rounded-xl text-[#F9F7F2] hover:bg-white/10 hover:text-white shrink-0"
                size="icon"
                variant="ghost"
              >
                <X className="h-5 w-5" />
              </Button>
            </SheetClose>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="admin-sidebar-nav flex-1 min-h-0 overflow-y-auto">
        <ul className="space-y-2 px-2" role="list">
          {createNavigationGroups(
            stats.newWorkOrders,
            stats.openTickets,
            isRoot,
            organizationState?.tierFeatures,
          ).map((group) => {
            // Filtrar items del grupo según permisos
            const filteredItems = group.items.filter((item) => {
              if (item.superAdminOnly && !isSuperAdmin) return false;
              if (item.rootOnly && !isRoot) return false;
              if (
                item.adminOrSuperAdminOnly &&
                adminRole != null &&
                !["admin", "super_admin", "root", "dev"].includes(adminRole)
              )
                return false;
              if (item.onboardingOnly) {
                if (
                  organizationState?.hasOrganization &&
                  !organizationState?.onboardingRequired
                )
                  return false;
              }
              return true;
            });

            // No renderizar grupos vacíos
            if (filteredItems.length === 0) return null;

            const isExpanded =
              expandedGroups[group.id] ?? group.defaultExpanded ?? false;
            const hasItems = filteredItems.length > 0;
            const hasBadge = filteredItems.some((item) => item.badge);

            // Determinar si algún item del grupo está activo
            const isGroupActive = filteredItems.some(
              (item) =>
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href)),
            );

            return (
              <li key={group.id}>
                {/* Grupo Header - clickeable si es collapsible */}
                {group.collapsible && hasItems ? (
                  <button
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 rounded-xl",
                      "text-[#F9F7F2]/70 hover:text-[#F9F7F2] hover:bg-white/5",
                      "transition-all duration-200 text-left",
                      isGroupActive && "text-[#F9F7F2] bg-white/5",
                    )}
                    onClick={() =>
                      setExpandedGroups((prev) => ({
                        ...prev,
                        [group.id]: !prev[group.id],
                      }))
                    }
                  >
                    <group.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-[10px] font-display uppercase tracking-widest font-medium">
                      {group.label}
                    </span>
                    {hasBadge && (
                      <Badge
                        className="bg-admin-accent-secondary/20 text-admin-accent-secondary rounded-lg px-1.5 py-0.5 text-[9px] font-display font-bold"
                        variant="secondary"
                      >
                        {filteredItems
                          .filter((i) => i.badge)
                          .map((i) => i.badge)
                          .reduce(
                            (a, b) =>
                              (
                                parseInt(a || "0") + parseInt(b || "0")
                              ).toString(),
                            "0",
                          )}
                      </Badge>
                    )}
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
                        !isExpanded && "-rotate-90",
                      )}
                    />
                  </button>
                ) : (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-xl",
                      "text-[#F9F7F2]/50 pointer-events-none",
                    )}
                  >
                    <group.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-[10px] font-display uppercase tracking-widest font-medium">
                      {group.label}
                    </span>
                  </div>
                )}

                {/* Items del grupo */}
                <ul
                  className={cn(
                    "mt-1 space-y-0.5 overflow-hidden transition-all duration-300",
                    isExpanded
                      ? "max-h-[500px] opacity-100"
                      : "max-h-0 opacity-0",
                  )}
                  role="list"
                >
                  {filteredItems.map((item) => {
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/admin" &&
                        pathname.startsWith(item.href));
                    return (
                      <li key={item.href}>
                        <Link
                          className={cn(
                            "admin-nav-item rounded-xl relative group overflow-hidden transition-all duration-300 ml-2",
                            isActive
                              ? "active"
                              : "text-[#F9F7F2]/70 hover:text-[#F9F7F2]",
                          )}
                          href={item.href}
                          onClick={onNavigate}
                        >
                          <div
                            className={cn(
                              "absolute inset-y-0 left-0 w-[2px] bg-admin-accent-secondary transition-transform duration-300",
                              isActive
                                ? "scale-y-100"
                                : "scale-y-0 group-hover:scale-y-50",
                            )}
                          />

                          <item.icon
                            className={cn(
                              "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                              isActive
                                ? "text-inherit"
                                : "text-inherit opacity-70",
                            )}
                          />

                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span
                                className={cn(
                                  "truncate font-display uppercase tracking-widest text-[9px]",
                                  isActive ? "font-bold" : "font-medium",
                                )}
                              >
                                {item.label}
                              </span>
                              {item.badge && (
                                <Badge
                                  className="admin-sidebar-badge bg-admin-accent-secondary text-[#1A2B23] rounded-lg px-1.5 py-0.5 text-[9px] font-display font-black leading-none shadow-[0_2px_4px_rgba(0,0,0,0.2)]"
                                  variant="secondary"
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User & Footer Section */}
      <div className="flex-shrink-0 mt-auto p-3 space-y-3 border-t border-white/10 bg-black/5">
        {/* User Profile Hookup */}
        <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-admin-accent-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          <div className="h-9 w-9 rounded-lg bg-admin-accent-primary/10 border border-admin-accent-secondary/20 flex items-center justify-center text-admin-accent-secondary font-display font-bold text-sm relative z-10 overflow-hidden shrink-0">
            {profile?.avatar_url ? (
              <img
                alt=""
                className="w-full h-full object-cover"
                src={profile.avatar_url}
              />
            ) : (
              profile?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || "U"
            )}
          </div>
          <div className="flex-1 min-w-0 relative z-10">
            <p className="text-[10px] font-display font-bold uppercase tracking-wider truncate text-[#F9F7F2]">
              {profile?.first_name
                ? `${profile.first_name} ${profile.last_name || ""}`.trim()
                : user?.email?.split("@")[0]}
            </p>
            <p className="text-[7px] font-serif italic text-[#F9F7F2]/60 tracking-widest uppercase">
              {isRoot
                ? "Archivista Root"
                : isSuperAdmin
                  ? "Guardián de Orden"
                  : "Administrador"}
            </p>
          </div>
          <Link className="relative z-10" href="/admin/profile">
            <Button
              className="rounded-lg hover:bg-white/10 text-[#F9F7F2] h-8 w-8"
              size="icon-sm"
              variant="ghost"
            >
              <User className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <Link className="w-full" href="/admin/help">
            <Button
              className="w-full text-[8px] font-display uppercase tracking-widest gap-1 h-8 bg-transparent border-white/20 text-[#F9F7F2] rounded-lg"
              size="sm"
              variant="outline"
            >
              <HelpCircle className="h-3 w-3 text-admin-accent-secondary transition-colors" />
              Auxilio
            </Button>
          </Link>
          <Button
            className="admin-logout-button w-full text-[8px] font-display uppercase tracking-widest gap-1 h-8 bg-transparent border-red-300/30 text-red-200 rounded-lg"
            size="sm"
            variant="outline"
            onClick={handleSignOut}
          >
            <LogOut className="h-3 w-3 transition-colors" />
            Retiro
          </Button>
        </div>

        {/* Opttius Branding */}
        <p className="text-center text-[8px] text-[#F9F7F2]/75 pt-1">
          &copy; {new Date().getFullYear()} Opttius
        </p>
      </div>
    </div>
  );
}
