"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { useRoot } from "@/hooks/useRoot";
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

interface Filters {
  unreadOnly: boolean;
  type: string;
  priority: string;
}

export function useNotifications() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuthContext();
  const { currentBranchId, isGlobalView, isSuperAdmin } = useBranch();
  const { isRoot } = useRoot();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [filters, setFilters] = useState<Filters>({
    unreadOnly: false,
    type: "",
    priority: "",
  });
  const pageSize = 20;

  const fetchNotifications = async () => {
    if (!user || authLoading) return;
    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString(),
      });
      if (!isRoot && currentBranchId && !isGlobalView) {
        params.set("branch_id", currentBranchId);
      }
      if (filters.unreadOnly) params.append("unread_only", "true");
      if (filters.type) params.append("type", filters.type);

      const response = await fetch(`/api/admin/notifications?${params}`);
      if (!response.ok) {
        if (response.status === 401) return;
        throw new Error("Failed to fetch notifications");
      }
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setTotalCount(data.count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Error al cargar las notificaciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchNotifications();
      const supabase = createClient();
      const channel = supabase
        .channel("admin-notifications-page")
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
        supabase.removeChannel(channel);
      };
    }
  }, [
    user,
    authLoading,
    currentPage,
    filters,
    currentBranchId,
    isGlobalView,
    isRoot,
  ]);

  const markAsRead = async (notificationId: string, actionUrl?: string) => {
    try {
      setMarkingAsRead(notificationId);
      const response = await fetch("/api/admin/notifications", {
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
      if (actionUrl) router.push(actionUrl);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Error al marcar la notificación");
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
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

  const filteredNotifications = notifications.filter((n) => {
    if (filters.priority && n.priority !== filters.priority) return false;
    return true;
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    notifications,
    unreadCount,
    loading,
    markingAsRead,
    totalCount,
    currentPage,
    setCurrentPage,
    filters,
    setFilters,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    filteredNotifications,
    totalPages,
    isSuperAdmin,
    isRoot,
    currentBranchId,
    isGlobalView,
  };
}
