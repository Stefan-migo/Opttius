"use client";

import {
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Filter,
  Info,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BranchSelector } from "@/components/admin/BranchSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthContext } from "@/contexts/AuthContext";
import { useBranch } from "@/hooks/useBranch";
import { useRoot } from "@/hooks/useRoot";
import {
  formatTimeSince,
  NOTIFICATION_ICONS,
  NOTIFICATION_TYPE_LABELS,
  PRIORITY_COLORS,
} from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

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
  metadata?: unknown;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
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
  const [filters, setFilters] = useState({
    unreadOnly: false,
    type: "",
    priority: "",
  });
  const pageSize = 20;

  const fetchNotifications = async () => {
    if (!user || authLoading) {
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString(),
      });
      if (!isRoot && currentBranchId && !isGlobalView) {
        params.set("branch_id", currentBranchId);
      }
      if (filters.unreadOnly) {
        params.append("unread_only", "true");
      }
      if (filters.type) {
        params.append("type", filters.type);
      }

      const response = await fetch(`/api/admin/notifications?${params}`);
      if (!response.ok) {
        if (response.status === 401) {
          return;
        }
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

      // Supabase Realtime for instant updates
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

      // Update local state
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, is_read: true } : n,
        ),
      );
      setUnreadCount(Math.max(0, unreadCount - 1));

      // Navigate if action URL provided
      if (actionUrl) {
        router.push(actionUrl);
      }
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

  const filteredNotifications = notifications.filter((n) => {
    if (filters.priority && n.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-admin-text-primary font-cormorant">
            Notificaciones
          </h1>
          <p className="text-sm font-medium text-admin-text-tertiary uppercase tracking-widest">
            Centro de Control de Alertas y Mensajes
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {isSuperAdmin && !isRoot && <BranchSelector />}
          {unreadCount > 0 && (
            <Button
              className="h-10 px-4 text-xs font-bold border-admin-accent-primary/20 hover:bg-admin-accent-primary hover:text-white transition-all rounded-xl"
              disabled={loading}
              variant="outline"
              onClick={markAllAsRead}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Marcar todo como leído
            </Button>
          )}
          <Button
            className="h-10 px-4 text-xs font-bold bg-admin-bg-tertiary hover:bg-admin-border-primary transition-all rounded-xl"
            disabled={loading}
            variant="secondary"
            onClick={fetchNotifications}
          >
            <RefreshCw
              className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
            />
            Sincronizar
          </Button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          {
            label: "Bandeja Total",
            value: totalCount,
            icon: Bell,
            color: "text-admin-accent-primary",
            bg: "bg-admin-accent-primary/5",
          },
          {
            label: "Pendientes",
            value: unreadCount,
            icon: AlertTriangle,
            color: "text-admin-error",
            bg: "bg-admin-error/5",
          },
          {
            label: "Completadas",
            value: totalCount - unreadCount,
            icon: Check,
            color: "text-admin-success",
            bg: "bg-admin-success/5",
          },
        ].map((stat, idx) => (
          <Card
            className="border border-admin-border-primary/30 shadow-soft overflow-hidden group bg-white"
            key={idx}
          >
            <CardContent className="p-0">
              <div className="flex items-center p-6 bg-white relative">
                <div
                  className={cn(
                    "h-12 w-12 rounded-2xl flex items-center justify-center mr-4 transition-transform group-hover:scale-110",
                    stat.bg,
                  )}
                >
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-admin-text-tertiary uppercase tracking-wider">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-admin-text-primary tracking-tight mt-0.5">
                    {stat.value}
                  </p>
                </div>
                <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                  <stat.icon size={64} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="sticky top-24 space-y-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-admin-text-tertiary uppercase tracking-widest flex items-center gap-2">
                <Filter className="h-3.5 w-3.5" />
                Filtros de búsqueda
              </h3>

              <div className="space-y-5 bg-white p-6 rounded-2xl border border-admin-border-primary/50 shadow-soft">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-admin-text-secondary uppercase">
                    Estado
                  </label>
                  <Select
                    value={filters.unreadOnly ? "unread" : "all"}
                    onValueChange={(value) =>
                      setFilters({ ...filters, unreadOnly: value === "unread" })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-admin-border-primary focus:ring-admin-accent-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-admin-border-primary">
                      <SelectItem value="all">Todas las alertas</SelectItem>
                      <SelectItem value="unread">Solo sin leer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-admin-text-secondary uppercase">
                    Tipo de Evento
                  </label>
                  <Select
                    value={filters.type || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        type: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-admin-border-primary focus:ring-admin-accent-primary/20">
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-admin-border-primary">
                      <SelectItem value="all">Ver todas</SelectItem>
                      {Object.entries(NOTIFICATION_TYPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem
                            className="text-xs"
                            key={value}
                            value={value}
                          >
                            {label}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-admin-text-secondary uppercase">
                    Prioridad
                  </label>
                  <Select
                    value={filters.priority || "all"}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        priority: value === "all" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="h-10 text-xs font-semibold rounded-xl border-admin-border-primary focus:ring-admin-accent-primary/20">
                      <SelectValue placeholder="Relevancia" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-admin-border-primary">
                      <SelectItem value="all">Cualquier prioridad</SelectItem>
                      <SelectItem className="text-xs" value="low">
                        Baja (Info)
                      </SelectItem>
                      <SelectItem className="text-xs" value="medium">
                        Media (Aviso)
                      </SelectItem>
                      <SelectItem className="text-xs" value="high">
                        Alta (Importante)
                      </SelectItem>
                      <SelectItem
                        className="text-xs text-admin-error font-bold"
                        value="urgent"
                      >
                        Urgente (Crítico)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full text-[10px] font-bold text-admin-text-tertiary hover:text-admin-text-primary uppercase tracking-tighter"
                  variant="ghost"
                  onClick={() =>
                    setFilters({ unreadOnly: false, type: "", priority: "" })
                  }
                >
                  Restablecer filtros
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications Main Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-2xl border border-admin-border-primary/50 shadow-soft overflow-hidden">
            <div className="p-4 bg-admin-bg-tertiary/50 border-b border-admin-border-primary/50 flex justify-between items-center px-6">
              <h3 className="text-sm font-bold text-admin-text-primary">
                Resultados ({filteredNotifications.length})
              </h3>
              {loading && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-admin-accent-primary" />
              )}
            </div>

            <div className="divide-y divide-admin-border-primary/30">
              {loading && notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-8 text-center animate-pulse">
                  <RefreshCw className="h-10 w-10 text-admin-accent-primary/30 mb-4 animate-spin" />
                  <p className="text-sm font-medium text-admin-text-tertiary">
                    Sincronizando notificaciones...
                  </p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
                  <div className="h-20 w-20 bg-admin-bg-tertiary rounded-full flex items-center justify-center mb-6">
                    <Bell className="h-10 w-10 text-admin-text-tertiary/30" />
                  </div>
                  <h4 className="text-lg font-bold text-admin-text-primary">
                    Sin coincidencias
                  </h4>
                  <p className="text-sm text-admin-text-tertiary mt-2 max-w-[280px]">
                    No encontramos notificaciones que coincidan con tus
                    criterios de búsqueda actuales.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[750px]">
                  <div className="divide-y divide-admin-border-primary/30">
                    {filteredNotifications.map((notification) => {
                      const Icon =
                        NOTIFICATION_ICONS[notification.type] || Info;
                      const isUnread = !notification.is_read;

                      return (
                        <div
                          className={cn(
                            "group p-6 transition-all duration-300 relative hover:bg-admin-bg-tertiary/20",
                            isUnread ? "bg-admin-accent-primary/[0.02]" : "",
                          )}
                          key={notification.id}
                          onClick={() =>
                            markAsRead(notification.id, notification.action_url)
                          }
                        >
                          {isUnread && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-accent-primary" />
                          )}

                          <div className="flex gap-6">
                            {/* Visual Indicator & Icon */}
                            <div className="flex flex-col items-center gap-3">
                              <div
                                className={cn(
                                  "h-14 w-14 rounded-2xl flex items-center justify-center shadow-sm border border-admin-border-primary/50 transition-all group-hover:scale-105",
                                  isUnread
                                    ? "bg-admin-bg-secondary"
                                    : "bg-admin-bg-tertiary/50",
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "h-6 w-6",
                                    isUnread
                                      ? "text-admin-accent-primary"
                                      : "text-admin-text-tertiary",
                                  )}
                                />
                              </div>
                            </div>

                            {/* Main Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                                <div className="flex items-center gap-3 flex-wrap">
                                  <h4
                                    className={cn(
                                      "text-base tracking-tight",
                                      isUnread
                                        ? "font-bold text-admin-text-primary"
                                        : "font-semibold text-admin-text-secondary",
                                    )}
                                  >
                                    {notification.title}
                                  </h4>
                                  {isUnread && (
                                    <span className="flex h-2 w-2 rounded-full bg-admin-accent-primary animate-pulse" />
                                  )}
                                  <span
                                    className={cn(
                                      "text-[9px] font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider",
                                      PRIORITY_COLORS[notification.priority] ||
                                        PRIORITY_COLORS.medium,
                                    )}
                                  >
                                    {notification.priority}
                                  </span>
                                </div>
                                <time className="text-[11px] font-bold text-admin-text-tertiary tracking-tighter bg-admin-bg-tertiary/50 px-2 py-1 rounded-md">
                                  {formatTimeSince(notification.created_at)}
                                </time>
                              </div>

                              <p className="text-[13px] text-admin-text-secondary font-medium leading-relaxed max-w-2xl mb-4">
                                {notification.message}
                              </p>

                              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-admin-border-primary/20">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    className="text-[10px] font-bold bg-admin-bg-tertiary/30 border-none text-admin-text-tertiary px-2 py-1 rounded-lg"
                                    variant="outline"
                                  >
                                    {NOTIFICATION_TYPE_LABELS[
                                      notification.type
                                    ] || notification.type}
                                  </Badge>
                                </div>
                                {notification.action_label && (
                                  <Button
                                    className="h-auto p-0 text-xs font-bold text-admin-accent-primary hover:no-underline group-hover:translate-x-1 transition-transform"
                                    size="sm"
                                    variant="link"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      markAsRead(
                                        notification.id,
                                        notification.action_url,
                                      );
                                    }}
                                  >
                                    {notification.action_label}
                                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Pagination Component */}
            {totalPages > 1 && (
              <div className="p-6 bg-admin-bg-tertiary/30 border-t border-admin-border-primary/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-[11px] font-bold text-admin-text-tertiary uppercase tracking-widest">
                  Página{" "}
                  <span className="text-admin-text-primary">
                    {currentPage + 1}
                  </span>{" "}
                  de {totalPages}
                </span>
                <div className="flex gap-3">
                  <Button
                    className="h-9 px-4 text-xs font-bold rounded-xl bg-admin-bg-secondary border-admin-border-primary/50 hover:bg-admin-accent-primary hover:text-white transition-all"
                    disabled={currentPage === 0 || loading}
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  >
                    Anterior
                  </Button>
                  <Button
                    className="h-9 px-4 text-xs font-bold rounded-xl bg-admin-bg-secondary border-admin-border-primary/50 hover:bg-admin-accent-primary hover:text-white transition-all"
                    disabled={currentPage >= totalPages - 1 || loading}
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                    }
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
