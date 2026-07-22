"use client";

import { Menu } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuthContext } from "@/contexts/AuthContext";

import { SidebarFooter } from "./SidebarFooter";
import { SidebarHeader } from "./SidebarHeader";
import { SidebarNav } from "./SidebarNav";
import { createSaaSNavigationGroups } from "./SidebarNavConfig";

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

      <SidebarHeader
        loading={loading}
        stats={{
          totalOrganizations: stats.totalOrganizations,
          activeOrganizations: stats.activeOrganizations,
        }}
        onNavigate={onNavigate}
      />

      <SidebarNav
        expandedGroups={expandedGroups}
        groups={groups}
        pathname={pathname}
        onNavigate={onNavigate}
        onToggleGroup={(id) =>
          setExpandedGroups((prev) => ({ ...prev, [id]: !prev[id] }))
        }
      />

      <SidebarFooter onNavigate={onNavigate} onSignOut={handleSignOut} />
    </div>
  );
}

// Componente para usar en Sheet (móvil)
export function SaasManagementSidebarSheet() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="lg:hidden" size="icon" variant="ghost">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="p-0 w-[300px] bg-[#0D1117] border-r border-white/10"
        side="left"
      >
        <SaasManagementSidebar />
      </SheetContent>
    </Sheet>
  );
}
