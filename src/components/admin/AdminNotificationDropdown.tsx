"use client";

import { useEffect, useState, useRef } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  X,
  Package,
  ShoppingCart,
  AlertTriangle,
  MessageSquare,
  TrendingUp,
  Shield,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";

interface AdminNotification {
  id: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  action_label?: string;
  metadata?: any;
  is_read: boolean;
  created_at: string;
}

const notificationIcons: Record<string, any> = {
  order_new: ShoppingCart,
  order_status_change: Package,
  low_stock: AlertTriangle,
  out_of_stock: AlertTriangle,
  support_ticket_new: MessageSquare,
  support_ticket_update: MessageSquare,
  payment_received: TrendingUp,
  system_alert: Shield,
  custom: Info,
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500 bg-gray-100",
  medium: "text-blue-600 bg-blue-100",
  high: "text-orange-600 bg-orange-100",
  urgent: "text-red-600 bg-red-100",
};

export default function AdminNotificationDropdown() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async () => {
    // Don't fetch if user is not authenticated
    if (!user || authLoading) {
      return;
    }

    try {
      const response = await fetch("/api/admin/notifications?limit=10", {
        credentials: "include",
      });
      if (!response.ok) {
        // Silently handle 401 (unauthorized) - user might not be logged in yet
        if (response.status === 401) {
          return;
        }
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      // Only log non-401 errors
      if (error instanceof Error && !error.message.includes("401")) {
        console.error("Error fetching notifications:", error);
      }
    }
  };

  useEffect(() => {
    // Only start fetching when user is authenticated
    if (!authLoading && user) {
      fetchNotifications();

      // Poll for new notifications every 30 seconds
      intervalRef.current = setInterval(fetchNotifications, 30000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, authLoading]);

  const markAsRead = async (notificationId: string, actionUrl?: string) => {
    try {
      const response = await fetch("/api/admin/notifications", {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) throw new Error("Failed to mark notification as read");

      // Update local state
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount(Math.max(0, unreadCount - 1));

      // Navigate if action URL provided
      if (actionUrl) {
        setIsOpen(false);
        router.push(actionUrl);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Error al marcar la notificación");
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications", {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (!response.ok) throw new Error("Failed to mark all as read");

      // Update local state
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Error al marcar todas como leídas");
    } finally {
      setLoading(false);
    }
  };

  const getTimeSince = (date: string) => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );

    if (seconds < 60) return "Hace un momento";
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    return `Hace ${Math.floor(seconds / 86400)} días`;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative group h-10 w-10 rounded-xl hover:bg-admin-accent-primary/10 transition-all duration-300 focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        >
          <Bell className="h-5 w-5 text-admin-text-secondary group-hover:text-admin-accent-primary transition-colors duration-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-admin-accent-secondary flex items-center justify-center text-[10px] font-black text-[#1A2B23] shadow-lg shadow-black/20 border border-admin-bg-secondary leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 bg-admin-bg-secondary/95 backdrop-blur-xl border-admin-border-primary/50 shadow-2xl shadow-black/10 rounded-2xl overflow-hidden"
        sideOffset={12}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-admin-bg-tertiary/50 to-transparent border-b border-admin-border-primary/50">
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
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              disabled={loading}
              className="h-8 px-3 text-[11px] font-bold hover:bg-admin-accent-primary/10 text-admin-accent-primary rounded-lg transition-all"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
              Marcar todo
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
              <div className="h-16 w-16 bg-admin-bg-tertiary rounded-full flex items-center justify-center mb-4">
                <Bell className="h-8 w-8 text-admin-text-tertiary/30" />
              </div>
              <p className="text-sm font-bold text-admin-text-primary">
                Bandeja limpia
              </p>
              <p className="text-xs text-admin-text-tertiary mt-2 max-w-[200px] leading-relaxed">
                No tienes notificaciones pendientes en este momento.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-admin-border-primary/30">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] || Info;
                const isUnread = !notification.is_read;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      "group p-4 transition-all duration-300 cursor-pointer relative",
                      isUnread
                        ? "bg-admin-accent-primary/[0.03]"
                        : "hover:bg-admin-bg-tertiary/50",
                    )}
                    onClick={() =>
                      markAsRead(notification.id, notification.action_url)
                    }
                  >
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-accent-primary" />
                    )}

                    <div className="flex gap-4">
                      {/* Icon Container */}
                      <div
                        className={cn(
                          "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform group-hover:scale-105",
                          isUnread
                            ? "bg-admin-bg-secondary border border-admin-border-primary"
                            : "bg-admin-bg-tertiary",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5",
                            isUnread
                              ? "text-admin-accent-primary"
                              : "text-admin-text-tertiary",
                          )}
                        />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p
                            className={cn(
                              "text-sm tracking-tight leading-snug",
                              isUnread
                                ? "font-bold text-admin-text-primary"
                                : "font-medium text-admin-text-secondary",
                            )}
                          >
                            {notification.title}
                          </p>
                          <span className="text-[10px] font-bold text-admin-text-tertiary whitespace-nowrap pt-0.5">
                            {getTimeSince(notification.created_at)}
                          </span>
                        </div>

                        <p className="text-xs text-admin-text-tertiary mt-1.5 line-clamp-2 leading-relaxed font-medium">
                          {notification.message}
                        </p>

                        {/* Interactive Action Label */}
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex gap-1.5">
                            <span
                              className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tight",
                                notification.priority === "urgent"
                                  ? "bg-admin-error/10 text-admin-error"
                                  : notification.priority === "high"
                                    ? "bg-admin-warning/10 text-admin-warning"
                                    : "bg-admin-bg-tertiary text-admin-text-tertiary",
                              )}
                            >
                              {notification.priority}
                            </span>
                          </div>
                          {notification.action_label && (
                            <span className="text-[10px] font-bold text-admin-accent-primary flex items-center group-hover:translate-x-1 transition-transform">
                              {notification.action_label}
                              <ChevronRight className="h-3 w-3 ml-0.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 bg-admin-bg-tertiary/30 border-t border-admin-border-primary/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-[11px] font-bold h-9 bg-admin-bg-secondary hover:bg-admin-accent-primary hover:text-white border-admin-border-secondary/50 transition-all rounded-xl"
              onClick={() => {
                setIsOpen(false);
                router.push("/admin/notifications");
              }}
            >
              Panel de Notificaciones Completo
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
