"use client";

import { ArrowRight, Loader2, Menu, Sparkles } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import AdminNotificationDropdown from "@/components/admin/AdminNotificationDropdown";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { MobileBottomNav } from "@/components/admin/MobileBottomNav";
import { MobileFAB } from "@/components/admin/MobileFAB";
import { SubscriptionGuard } from "@/components/admin/SubscriptionGuard";
import { AgentBubbleContainer } from "@/components/ai/AgentBubbleContainer";
import { DemoModeBanner } from "@/components/onboarding/DemoModeBanner";
import { TourProvider } from "@/components/onboarding/TourProvider";
import { useTheme } from "@/components/theme-provider";
import { ThemeSelector } from "@/components/theme-selector";
import { OpttiusLogoCompact } from "@/components/ui/brand/OpttiusLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import businessConfig from "@/config/business";
import { useAuthContext } from "@/contexts/AuthContext";

import { useAdminCheck } from "./_hooks/useAdminCheck";
import { useAdminStats } from "./_hooks/useAdminStats";
import { useOrganizationState } from "./_hooks/useOrganizationState";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminLayoutProps) {
  const { user, loading } = useAuthContext();
  const { theme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatbotOpen, setChatbotOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    () => {
      if (typeof window === "undefined") return { principal: true };
      try {
        const saved = localStorage.getItem("opttius-sidebar-groups");
        if (saved) return { principal: true, ...JSON.parse(saved) };
      } catch {
        /* Ignorar errores de localStorage */
      }
      return { principal: true };
    },
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        "opttius-sidebar-groups",
        JSON.stringify(expandedGroups),
      );
    } catch {
      /* Ignorar errores de localStorage */
    }
  }, [expandedGroups]);

  const {
    adminState,
    adminRole,
    signOutInProgress,
    handleSignOut,
    isStillChecking,
    setAdminRole,
  } = useAdminCheck();
  const { organizationState } = useOrganizationState({
    adminState,
    signOutInProgress,
    setAdminRole,
  });
  const { stats } = useAdminStats({ adminState });

  const hasLoggedRender = useRef(false);
  const lastLoggedUserId = useRef<string | null>(null);

  // ✅ SaaS Management guard - has its own independent layout
  if (pathname.startsWith("/admin/saas-management")) {
    return <>{children}</>;
  }

  if (isStillChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
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

  if (user?.email && user?.id) {
    if (lastLoggedUserId.current !== user.id) {
      hasLoggedRender.current = false;
      lastLoggedUserId.current = user.id;
    }
    if (!hasLoggedRender.current) {
      hasLoggedRender.current = true;
    }
  }

  return (
    <TourProvider>
      <SubscriptionGuard>
        <div className="admin-layout">
          {/* Mobile Header */}
          <div className="lg:hidden admin-header">
            <div className="admin-header-content">
              <div className="flex items-center gap-3 min-w-0 flex-1">
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
            {/* Desktop Sidebar */}
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
                  <div className="flex items-center gap-4">
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

                  <div className="admin-header-actions flex items-center gap-2">
                    <BranchSelector />

                    <div className="h-6 w-px bg-border/50 mx-1" />

                    <ThemeSelector />
                    <AdminNotificationDropdown />

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

              {/* Page Content */}
              <main className="admin-content pb-[calc(4rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
                {organizationState.isDemoMode &&
                  organizationState.showActivateBanner && <DemoModeBanner />}
                <TooltipProvider delayDuration={300}>
                  {children}
                </TooltipProvider>
              </main>
            </div>
          </div>

          <AgentBubbleContainer />
          <MobileBottomNav
            onChatbotClick={() => setChatbotOpen(true)}
            onInsightsClick={() => setInsightsOpen(true)}
          />
          <MobileFAB />
        </div>
      </SubscriptionGuard>
    </TourProvider>
  );
}
