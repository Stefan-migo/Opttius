"use client";

import {
  BarChart3,
  Bell,
  Calendar,
  CalendarPlus,
  LayoutDashboard,
  LucideIcon,
  MessageSquare,
  MoreHorizontal,
  Package,
  Plus,
  Receipt,
  Settings,
  ShoppingCart,
  Sparkles,
  Sun,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useMobileView } from "@/hooks/useMobileView";
import { cn } from "@/lib/utils";

interface NavItem {
  href?: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  action?: () => void;
  variant?: "link" | "button";
}

// Elementos de navegación principal - orden solicitado: Notificaciones, Dashboard, AI Chat (centro), POS, Más
const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: "Notif.",
    icon: Bell,
    variant: "button",
    action: () => {},
  },
  {
    href: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    variant: "link",
  },
  {
    label: "AI Chat",
    icon: MessageSquare,
    variant: "button",
    action: () => {},
  },
  {
    href: "/admin/pos",
    label: "POS",
    icon: ShoppingCart,
    variant: "link",
  },
  {
    label: "Más",
    icon: MoreHorizontal,
    variant: "button",
    action: () => {},
  },
];

// Elementos adicionales del menú "Más"
const MORE_NAV_ITEMS: NavItem[] = [
  {
    href: "/admin/quotes",
    label: "Presupuestos",
    icon: Receipt,
    variant: "link",
  },
  {
    href: "/admin/work-orders",
    label: "Trabajos",
    icon: Package,
    variant: "link",
  },
  {
    href: "/admin/products",
    label: "Productos",
    icon: Package,
    variant: "link",
  },
  {
    href: "/admin/customers",
    label: "Clientes",
    icon: Settings,
    variant: "link",
  },
  {
    href: "/admin/analytics",
    label: "Analíticas",
    icon: BarChart3,
    variant: "link",
  },
  { href: "/admin/system", label: "Sistema", icon: Settings, variant: "link" },
];

// Herramientas para el menú "Más"
const TOOL_ITEMS: NavItem[] = [
  { label: "Sucursal", icon: Settings, variant: "button", action: () => {} },
  { label: "Tema", icon: Sun, variant: "button", action: () => {} },
  { label: "Insights", icon: Sparkles, variant: "button", action: () => {} },
];

interface MobileBottomNavProps {
  className?: string;
  onChatbotClick?: () => void;
  onInsightsClick?: () => void;
}

export function MobileBottomNav({
  className,
  onChatbotClick,
  onInsightsClick,
}: MobileBottomNavProps) {
  const pathname = usePathname();
  const { isMobile } = useMobileView();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  if (!isMobile) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  const handleToolAction = (item: NavItem) => {
    if (item.label === "AI Chat" && onChatbotClick) {
      setMoreMenuOpen(false);
      onChatbotClick();
    } else if (item.label === "Insights" && onInsightsClick) {
      setMoreMenuOpen(false);
      onInsightsClick();
    } else if (item.label === "Más") {
      setMoreMenuOpen(true);
    } else {
      setMoreMenuOpen(false);
    }
  };

  return (
    <>
      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-[#1A2B23] border-t border-white/10",
          "pb-[calc(8px+env(safe-area-inset-bottom,0px))]",
          className,
        )}
      >
        {/* Main Navigation - 5 items */}
        <div className="flex items-center justify-around h-16 px-1">
          {MAIN_NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const active = item.href ? isActive(item.href) : false;
            const isCenter = index === 2; // AI Chat en el centro
            const isMoreOpen = moreMenuOpen && item.label === "Más";

            if (item.variant === "button") {
              return (
                <button
                  key={item.label}
                  onClick={() => handleToolAction(item)}
                  className={cn(
                    "flex flex-col items-center justify-center",
                    "min-w-[64px] min-h-[44px] py-1 px-2",
                    "rounded-xl transition-all duration-200",
                    "group relative",
                    isMoreOpen
                      ? "text-[#C5A059]" // Solo dorado cuando el menú Más está abierto
                      : "text-[#F9F7F2]/70 hover:text-[#F9F7F2] hover:bg-white/10",
                  )}
                >
                  <Icon className="h-5 w-5 mb-0.5" />
                  <span className="text-[8px] font-display uppercase tracking-wider font-medium">
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href || "/admin"}
                className={cn(
                  "flex flex-col items-center justify-center",
                  "min-w-[64px] min-h-[44px] py-1 px-2",
                  "rounded-xl transition-all duration-200",
                  "group relative",
                  active
                    ? "text-[#C5A059]"
                    : "text-[#F9F7F2]/70 hover:text-[#F9F7F2] hover:bg-white/10",
                )}
              >
                {active && (
                  <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#C5A059] rounded-full" />
                )}
                <Icon
                  className={cn(
                    "h-5 w-5 mb-0.5 transition-transform duration-200",
                    active && "scale-110",
                  )}
                />
                <span
                  className={cn(
                    "text-[8px] font-display uppercase tracking-wider",
                    active ? "font-bold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Menú "Más" - Sheet desplegable */}
      <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl max-h-[80vh] overflow-y-auto bg-[#1A2B23] border-t border-white/10"
        >
          <SheetHeader className="px-4 py-3 border-b border-white/10">
            <SheetTitle className="text-lg font-display font-bold uppercase tracking-wide text-[#F9F7F2]">
              Navegación
            </SheetTitle>
            <SheetDescription className="text-xs font-serif italic text-[#F9F7F2]/60">
              Accede a todas las secciones
            </SheetDescription>
          </SheetHeader>

          {/* Secciones */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              {MORE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href || "");

                return (
                  <Link
                    key={item.href}
                    href={item.href || "/admin"}
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl",
                      "border transition-all duration-200",
                      active
                        ? "bg-[#C5A059]/10 border-[#C5A059]/30 text-[#C5A059]"
                        : "bg-[#1A2B23]/50 border-white/10 text-[#F9F7F2] hover:border-[#C5A059]/30 hover:bg-[#1A2B23]/80",
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-sm font-display font-medium">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="px-4 pb-4">
            <p className="text-[10px] font-display font-bold text-[#C5A059] uppercase tracking-wider mb-2">
              Acciones rápidas
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Link
                href="/admin/appointments?action=new"
                onClick={() => setMoreMenuOpen(false)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1A2B23]/50 border border-white/10 hover:border-[#C5A059]/30"
              >
                <CalendarPlus className="h-5 w-5 text-[#C5A059] mb-1" />
                <span className="text-[10px] font-display font-bold uppercase text-[#C5A059]">
                  Nueva Cita
                </span>
              </Link>
              <Link
                href="/admin/customers/new"
                onClick={() => setMoreMenuOpen(false)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/20 hover:border-[#C5A059]/30"
              >
                <Plus className="h-5 w-5 text-[#C5A059] mb-1" />
                <span className="text-[10px] font-display font-bold uppercase text-[#C5A059]">
                  Cliente
                </span>
              </Link>
              <Link
                href="/admin/pos?action=sale"
                onClick={() => setMoreMenuOpen(false)}
                className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#F9F7F2]/10 border border-white/10 hover:border-white/20"
              >
                <ShoppingCart className="h-5 w-5 text-[#F9F7F2] mb-1" />
                <span className="text-[10px] font-display font-bold uppercase">
                  Venta
                </span>
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Spacer */}
      <div className="h-16 lg:hidden" aria-hidden="true" />
    </>
  );
}
