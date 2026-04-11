"use client";

import {
  Calculator,
  CreditCard,
  FileText,
  History,
  LucideIcon,
  Percent,
  Plus,
  RefreshCw,
  ShoppingBag,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface SidebarAction {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick?: () => void;
  href?: string;
  variant?: "default" | "outline" | "ghost";
}

export interface POSSidebarProps {
  onNewSale?: () => void;
  onOpenQuotes?: () => void;
  onOpenPrescriptions?: () => void;
  onOpenPendingBalance?: () => void;
  onOpenRefunds?: () => void;
  onOpenCalculator?: () => void;
}

export function POSSidebar({
  onNewSale,
  onOpenQuotes,
  onOpenPrescriptions,
  onOpenPendingBalance,
  onOpenRefunds,
  onOpenCalculator,
}: POSSidebarProps) {
  const quickActions: SidebarAction[] = [
    {
      icon: Plus,
      label: "Nueva Venta",
      shortcut: "Ctrl+N",
      onClick: onNewSale,
      variant: "default",
    },
    {
      icon: FileText,
      label: "Presupuestos",
      onClick: onOpenQuotes,
      variant: "outline",
    },
    {
      icon: Users,
      label: "Recetas",
      onClick: onOpenPrescriptions,
      variant: "outline",
    },
    {
      icon: CreditCard,
      label: "Saldos Pendientes",
      onClick: onOpenPendingBalance,
      variant: "outline",
    },
  ];

  const secondaryActions: SidebarAction[] = [
    {
      icon: RefreshCw,
      label: "Devoluciones",
      onClick: onOpenRefunds,
      variant: "ghost",
    },
    {
      icon: Calculator,
      label: "Calculadora",
      onClick: onOpenCalculator,
      variant: "ghost",
    },
    {
      icon: History,
      label: "Historial",
      href: "/admin/pos/history",
      variant: "ghost",
    },
    {
      icon: Percent,
      label: "Convenios",
      href: "/admin/agreements",
      variant: "ghost",
    },
  ];

  return (
    <aside className="w-full lg:w-64 bg-[var(--admin-bg-secondary)] border-r flex flex-col h-full">
      {/* Quick Actions */}
      <div className="p-4 space-y-2">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Acciones Rápidas
        </h3>
        {quickActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "outline"}
            className="w-full justify-start gap-2 h-10"
            onClick={action.onClick}
          >
            <action.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{action.label}</span>
            {action.shortcut && (
              <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                {action.shortcut}
              </kbd>
            )}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Secondary Actions */}
      <div className="p-4 space-y-1">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Herramientas
        </h3>
        {secondaryActions.map((action, index) => (
          <Button
            key={index}
            variant={action.variant || "ghost"}
            className="w-full justify-start gap-2 h-9"
            onClick={action.onClick}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Quick Stats (optional) */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Hoy
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Ventas</span>
            <span className="font-medium">0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monto</span>
            <span className="font-medium">$0</span>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="p-4 border-t bg-gray-50 dark:bg-gray-900">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Atajos
        </h4>
        <div className="space-y-1 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Efectivo</span>
            <kbd className="font-mono">F1</kbd>
          </div>
          <div className="flex justify-between">
            <span>Débito</span>
            <kbd className="font-mono">F2</kbd>
          </div>
          <div className="flex justify-between">
            <span>Crédito</span>
            <kbd className="font-mono">F3</kbd>
          </div>
          <div className="flex justify-between">
            <span>Transferencia</span>
            <kbd className="font-mono">F4</kbd>
          </div>
        </div>
      </div>
    </aside>
  );
}
