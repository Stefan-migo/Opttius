"use client";

import { useCallback, useEffect, useState } from "react";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  priority: string;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
  action_url?: string;
  action_label?: string;
}

export function useNotificationsList(fetchParams?: { limit?: number }) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (fetchParams?.limit) params.set("limit", String(fetchParams.limit));
      const response = await fetch(`/api/admin/notifications?${params}`);
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount ?? 0);
        setTotalCount(data.totalCount ?? 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchParams?.limit]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      setMarkingAsRead(notificationId);
      const response = await fetch(
        `/api/admin/notifications/${notificationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_read: true }),
        },
      );
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const wasUnread =
        notifications.find((n) => n.id === notificationId)?.is_read === false;
      const response = await fetch(
        `/api/admin/notifications/${notificationId}`,
        { method: "DELETE" },
      );
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  return {
    notifications,
    unreadCount,
    totalCount,
    loading,
    markingAsRead,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
}
