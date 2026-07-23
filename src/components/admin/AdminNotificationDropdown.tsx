"use client";

import { Bell, CheckCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { NotificationListPanel } from "./_components/NotificationListPanel";
import { useNotificationDropdown } from "./_hooks/useNotificationDropdown";

interface AdminNotificationDropdownProps {
  variant?: "dropdown" | "sheet";
}

export default function AdminNotificationDropdown({
  variant = "dropdown",
}: AdminNotificationDropdownProps) {
  const {
    notifications,
    unreadCount,
    loading,
    isOpen,
    setIsOpen,
    markAsRead,
    markAllAsRead,
  } = useNotificationDropdown();

  const triggerButton = (
    <Button
      className="relative group h-10 w-10 rounded-xl hover:bg-admin-accent-primary/10 transition-all duration-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
      size="icon"
      variant="ghost"
    >
      <Bell className="h-5 w-5 text-admin-text-secondary group-hover:text-admin-accent-primary transition-colors duration-300" />
      {unreadCount > 0 && (
        <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-admin-accent-secondary flex items-center justify-center text-[10px] font-black text-[#1A2B23] shadow-lg shadow-black/20 border border-admin-bg-secondary leading-none">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );

  if (variant === "sheet") {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>{triggerButton}</SheetTrigger>
        <SheetContent
          elevateZIndex
          hideDefaultClose
          overlayExcludeBottomNav
          className="!h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] !max-h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] !bottom-[calc(4rem+env(safe-area-inset-bottom))] !top-auto !w-full !max-w-full !rounded-t-2xl flex flex-col p-0 bg-white border border-admin-border-primary/50 shadow-2xl shadow-black/10 overflow-hidden"
          side="bottom"
        >
          <SheetHeader className="flex flex-row items-center justify-between p-4 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/50 shrink-0 space-y-0">
            <div>
              <SheetTitle className="text-base font-bold text-admin-text-primary">
                Notificaciones
              </SheetTitle>
              <p className="text-[11px] font-medium text-admin-text-tertiary uppercase tracking-wider mt-0.5">
                {unreadCount > 0
                  ? `${unreadCount} pendientes`
                  : "Sistema actualizado"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  className="h-8 px-3 text-[11px] font-bold hover:bg-admin-accent-primary/10 text-admin-accent-primary rounded-lg"
                  disabled={loading}
                  size="sm"
                  variant="ghost"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                  Marcar todo
                </Button>
              )}
              <Button
                aria-label="Cerrar"
                className="shrink-0"
                size="icon"
                variant="ghost"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <NotificationListPanel
              notifications={notifications}
              variant="sheet"
              onClose={() => setIsOpen(false)}
              onMarkAsRead={markAsRead}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>{triggerButton}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 bg-white border border-admin-border-primary/50 shadow-2xl shadow-black/10 rounded-2xl overflow-hidden"
        sideOffset={12}
      >
        <div className="flex items-center justify-between p-4 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/50">
          <div>
            <h3 className="font-bold text-sm text-admin-text-primary tracking-tight">
              Notificaciones
            </h3>
            <p className="text-[11px] font-medium text-admin-text-tertiary uppercase tracking-wider mt-0.5">
              {unreadCount > 0
                ? `${unreadCount} pendientes`
                : "Sistema actualizado"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              className="h-8 px-3 text-[11px] font-bold hover:bg-admin-accent-primary/10 text-admin-accent-primary rounded-lg transition-all"
              disabled={loading}
              size="sm"
              variant="ghost"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todo
            </Button>
          )}
        </div>
        <NotificationListPanel
          notifications={notifications}
          variant="dropdown"
          onMarkAsRead={markAsRead}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
