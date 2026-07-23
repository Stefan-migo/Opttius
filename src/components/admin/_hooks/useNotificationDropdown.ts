"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { useRoot } from "@/hooks/useRoot";
import { appLogger } from '@/lib/logger';
import { createClient } from "@/utils/supabase/client";

export interface AdminNotification {
  id: string;
  type: string;
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  message: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  action_label?: string;
  metadata?: unknown;
  is_read: boolean;
  created_at: string;
}

export function useNotificationDropdown() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { currentBranchId, isGlobalView } = useBranch();
  const { isRoot } = useRoot();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = async () => {
    if (!user || authLoading) return;
    try {
      const params = new URLSearchParams({ limit: "10" });
      if (!isRoot && currentBranchId && !isGlobalView) {
        params.set("branch_id", currentBranchId);
      }
      const response = await fetch(`/api/admin/notifications?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        if (response.status === 401) return;
        throw new Error("Failed to fetch notifications");
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      if (error instanceof Error && !error.message.includes("401")) {
        appLogger.error("Error fetching notifications:", error);
      }
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications();
      intervalRef.current = setInterval(fetchNotifications, 60000);
      const supabase = createClient();
      const channel = supabase
        .channel("admin-notifications")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "admin_notifications",
            ...(currentBranchId && !isGlobalView && !isRoot
              ? { filter: `branch_id=eq.${currentBranchId}` }
              : {}),
          },
          () => fetchNotifications(),
        )
        .subscribe();
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        supabase.removeChannel(channel);
      };
    }
  }, [user, authLoading, currentBranchId, isGlobalView, isRoot]);

  const markAsRead = async (notificationId: string, actionUrl?: string) => {
    try {
      const response = await fetch("/api/admin/notifications", {
        credentials: "include",
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) throw new Error("Failed to mark notification as read");
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount(Math.max(0, unreadCount - 1));
      if (actionUrl) {
        setIsOpen(false);
        router.push(actionUrl);
      }
    } catch (error) {
      appLogger.error("Error marking notification as read:", error);
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
      setNotifications(notifications.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      toast.success("Todas las notificaciones marcadas como leídas");
    } catch (error) {
      appLogger.error("Error marking all as read:", error);
      toast.error("Error al marcar todas como leídas");
    } finally {
      setLoading(false);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    isOpen,
    setIsOpen,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
