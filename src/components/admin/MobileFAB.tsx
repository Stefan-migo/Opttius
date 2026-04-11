"use client";

import {
  Calendar,
  CalendarPlus,
  LucideIcon,
  Menu,
  Plus,
  Search,
  ShoppingCart,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMobileView } from "@/hooks/useMobileView";
import { cn } from "@/lib/utils";

interface FABAction {
  id: string;
  label: string;
  icon: LucideIcon;
  href: string;
  color?: string;
  bgColor?: string;
}

const FAB_ACTIONS: FABAction[] = [
  {
    id: "new-appointment",
    label: "Nueva Cita",
    icon: CalendarPlus,
    href: "/admin/appointments?action=new",
    color: "text-epoch-primary",
    bgColor: "bg-epoch-primary/10",
  },
  {
    id: "new-customer",
    label: "Nuevo Cliente",
    icon: UserPlus,
    href: "/admin/customers/new",
    color: "text-epoch-accent",
    bgColor: "bg-epoch-accent/10",
  },
  {
    id: "quick-sale",
    label: "Venta Rápida",
    icon: ShoppingCart,
    href: "/admin/pos?action=sale",
    color: "text-admin-text-primary",
    bgColor: "bg-admin-bg-tertiary/50",
  },
  {
    id: "search",
    label: "Buscar",
    icon: Search,
    href: "/admin/search",
    color: "text-admin-text-tertiary",
    bgColor: "bg-admin-bg-tertiary/50",
  },
];

interface MobileFABProps {
  className?: string;
}

export function MobileFAB({ className }: MobileFABProps) {
  const { isMobile } = useMobileView();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Solo mostrar en móvil
  if (!isMobile) {
    return null;
  }

  const handleActionClick = (action: FABAction) => {
    setIsOpen(false);
    // Si es búsqueda, mostrar input
    if (action.id === "search") {
      setShowSearch(true);
    } else {
      router.push(action.href);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/search?q=${encodeURIComponent(searchQuery)}`);
      setShowSearch(false);
      setSearchQuery("");
    }
  };

  return (
    <>
      {/* Diálogo de Búsqueda */}
      <Dialog open={showSearch} onOpenChange={setShowSearch}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="font-display font-bold uppercase tracking-wide">
              Buscar
            </DialogTitle>
            <DialogDescription className="text-xs font-serif italic">
              Busca clientes, productos o citas
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-admin-text-tertiary" />
              <Input
                placeholder="¿Qué buscas?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12 rounded-xl"
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSearch(false)}
                className="flex-1 rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-epoch-primary hover:bg-epoch-surface text-white rounded-xl"
              >
                Buscar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* FAB Container */}
      <div
        className={cn(
          "fixed bottom-24 right-4 z-40",
          "flex flex-col items-end gap-2",
          className,
        )}
      >
        {/* Acciones expandidas */}
        <div
          className={cn(
            "flex flex-col items-end gap-2 mb-2",
            "transition-all duration-300 ease-in-out",
            isOpen
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4 pointer-events-none",
          )}
        >
          {FAB_ACTIONS.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleActionClick(action)}
              className={cn(
                "flex items-center gap-3",
                "bg-admin-bg-secondary/95 backdrop-blur-sm",
                "border border-admin-border-primary/20",
                "rounded-xl px-4 py-3",
                "shadow-lg shadow-black/20",
                "hover:scale-105 hover:border-epoch-accent/30",
                "transition-all duration-200",
                "animate-in slide-in-from-right fade-in",
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span className="text-sm font-display font-bold whitespace-nowrap">
                {action.label}
              </span>
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center",
                  action.bgColor,
                  action.color,
                )}
              >
                <action.icon className="h-4 w-4" />
              </div>
            </button>
          ))}
        </div>

        {/* Botón FAB principal */}
        <Button
          className={cn(
            "h-14 w-14 rounded-full",
            "bg-epoch-accent hover:bg-epoch-accent/90",
            "text-epoch-primary",
            "shadow-xl shadow-epoch-accent/30",
            "border-2 border-epoch-primary/20",
            "transition-all duration-300",
            isOpen && "rotate-90",
          )}
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </Button>
      </div>
    </>
  );
}
