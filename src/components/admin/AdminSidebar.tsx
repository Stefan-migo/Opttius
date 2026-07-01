"use client";

import { ChevronDown, HelpCircle, LogOut, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SheetClose } from "@/components/ui/sheet";
import { createNavigationGroups } from "@/config/admin-navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { useRoot } from "@/hooks/useRoot";
import { cn } from "@/lib/utils";

interface AdminSidebarProps {
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
}

export default function AdminSidebar({
  pathname,
  onNavigate,
  stats,
  onChatbotClick,
  organizationState,
  adminRole,
  expandedGroups,
  setExpandedGroups,
}: AdminSidebarProps) {
  const { isSuperAdmin } = useBranch();
  const { isRoot } = useRoot();
  const { user, profile, signOut } = useAuthContext();
  const { theme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  return (
    <div className="admin-sidebar flex flex-col h-full w-full overflow-y-auto overflow-x-hidden relative min-h-0">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" />
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
      <nav className="admin-sidebar-nav flex-1 min-h-0 overflow-y-auto">
        <ul className="space-y-2 px-2" role="list">
          {createNavigationGroups(
            stats.newWorkOrders,
            stats.openTickets,
            isRoot,
            organizationState?.tierFeatures,
          ).map((group) => {
            const filteredItems = group.items.filter((item) => {
              if (item.superAdminOnly && !isSuperAdmin) return false;
              if (item.rootOnly && !isRoot) return false;
              if (
                item.adminOrSuperAdminOnly &&
                adminRole != null &&
                !["admin", "super_admin", "root", "dev"].includes(adminRole)
              )
                return false;
              if (
                item.onboardingOnly &&
                organizationState?.hasOrganization &&
                !organizationState?.onboardingRequired
              )
                return false;
              return true;
            });
            if (filteredItems.length === 0) return null;
            const isExpanded =
              expandedGroups[group.id] ?? group.defaultExpanded ?? false;
            const hasBadge = filteredItems.some((item) => item.badge);
            const isGroupActive = filteredItems.some(
              (item) =>
                pathname === item.href ||
                (item.href !== "/admin" && pathname.startsWith(item.href)),
            );
            return (
              <li key={group.id}>
                {group.collapsible ? (
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
      <div className="flex-shrink-0 mt-auto p-3 space-y-3 border-t border-white/10 bg-black/5">
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
        <div className="grid grid-cols-2 gap-2 relative z-10">
          <Link className="w-full" href="/admin/help">
            <Button
              className="w-full text-[8px] font-display uppercase tracking-widest gap-1 h-8 bg-transparent border-white/20 text-[#F9F7F2] rounded-lg"
              size="sm"
              variant="outline"
            >
              <HelpCircle className="h-3 w-3 text-admin-accent-secondary transition-colors" />{" "}
              Auxilio
            </Button>
          </Link>
          <Button
            className="admin-logout-button w-full text-[8px] font-display uppercase tracking-widest gap-1 h-8 bg-transparent border-red-300/30 text-red-200 rounded-lg"
            size="sm"
            variant="outline"
            onClick={handleSignOut}
          >
            <LogOut className="h-3 w-3 transition-colors" /> Retiro
          </Button>
        </div>
        <p className="text-center text-[8px] text-[#F9F7F2]/75 pt-1">
          &copy; {new Date().getFullYear()} Opttius
        </p>
      </div>
    </div>
  );
}
