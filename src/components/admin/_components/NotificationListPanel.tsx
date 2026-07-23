"use client";

import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { NotificationDropdownItem } from "./NotificationDropdownItem";

interface AdminNotification {
  id: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationListPanelProps {
  notifications: AdminNotification[];
  onMarkAsRead: (id: string, actionUrl?: string) => void;
  onClose?: () => void;
  variant?: "dropdown" | "sheet";
}

export function NotificationListPanel({
  notifications,
  onMarkAsRead,
  onClose,
  variant = "dropdown",
}: NotificationListPanelProps) {
  const router = useRouter();
  const isSheet = variant === "sheet";

  return (
    <>
      <ScrollArea
        className={isSheet ? "flex-1 min-h-0" : "h-[420px]"}
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="h-16 w-16 bg-admin-bg-tertiary rounded-full flex items-center justify-center mb-4">
              <Bell className="h-8 w-8 text-admin-text-tertiary/30" />
            </div>
            <p className="text-sm font-bold text-admin-text-primary">
              {isSheet ? "Bandeja limpia" : "Bandeja limpia"}
            </p>
            <p className="text-xs text-admin-text-tertiary mt-2 max-w-[200px] leading-relaxed">
              {isSheet
                ? "No tienes notificaciones pendientes."
                : "No tienes notificaciones pendientes en este momento."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-admin-border-primary/30">
            {notifications.map((notification) => (
              <NotificationDropdownItem
                compact={isSheet}
                key={notification.id}
                notification={notification}
                onClick={onMarkAsRead}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {notifications.length > 0 && (
        <div
          className={cn(
            "shrink-0",
            isSheet ? "" : "p-3 bg-admin-bg-tertiary/30 border-t border-admin-border-primary/50",
          )}
        >
          <Button
            className={cn(
              "justify-center text-[11px] font-bold transition-all",
              isSheet
                ? "w-full h-9 bg-admin-accent-primary hover:bg-admin-accent-secondary text-white border-admin-accent-primary/50 rounded-xl"
                : "w-full h-9 bg-admin-accent-primary hover:bg-admin-accent-secondary text-white hover:text-epoch-primary border-admin-accent-primary/50 rounded-xl",
            )}
            size="sm"
            variant="outline"
            onClick={() => {
              onClose?.();
              router.push("/admin/notifications");
            }}
          >
            Panel de Notificaciones Completo
          </Button>
        </div>
      )}
    </>
  );
}
