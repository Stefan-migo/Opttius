"use client";

import { Bell, ChevronRight, Info, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  formatTimeSince,
  NOTIFICATION_ICONS,
  NOTIFICATION_TYPE_LABELS,
  PRIORITY_COLORS,
} from "@/lib/notifications/constants";
import { cn } from "@/lib/utils";

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

interface NotificationListSectionProps {
  notifications: AdminNotification[];
  filteredNotifications: AdminNotification[];
  loading: boolean;
  currentPage: number;
  totalPages: number;
  onMarkAsRead: (id: string, actionUrl?: string) => void;
  onPageChange: (page: number) => void;
}

export function NotificationListSection({
  notifications,
  filteredNotifications,
  loading,
  currentPage,
  totalPages,
  onMarkAsRead,
  onPageChange,
}: NotificationListSectionProps) {
  return (
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
              No encontramos notificaciones que coincidan con tus criterios de
              búsqueda actuales.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[750px]">
            <div className="divide-y divide-admin-border-primary/30">
              {filteredNotifications.map((notification) => {
                const Icon = NOTIFICATION_ICONS[notification.type] || Info;
                const isUnread = !notification.is_read;

                return (
                  <div
                    className={cn(
                      "group p-6 transition-all duration-300 relative hover:bg-admin-bg-tertiary/20",
                      isUnread ? "bg-admin-accent-primary/[0.02]" : "",
                    )}
                    key={notification.id}
                    onClick={() =>
                      onMarkAsRead(notification.id, notification.action_url)
                    }
                  >
                    {isUnread && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-accent-primary" />
                    )}

                    <div className="flex gap-6">
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
                              {NOTIFICATION_TYPE_LABELS[notification.type] ||
                                notification.type}
                            </Badge>
                          </div>
                          {notification.action_label && (
                            <Button
                              className="h-auto p-0 text-xs font-bold text-admin-accent-primary hover:no-underline group-hover:translate-x-1 transition-transform"
                              size="sm"
                              variant="link"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAsRead(
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

      {totalPages > 1 && (
        <div className="p-6 bg-admin-bg-tertiary/30 border-t border-admin-border-primary/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-[11px] font-bold text-admin-text-tertiary uppercase tracking-widest">
            Página{" "}
            <span className="text-admin-text-primary">{currentPage + 1}</span>{" "}
            de {totalPages}
          </span>
          <div className="flex gap-3">
            <Button
              className="h-9 px-4 text-xs font-bold rounded-xl bg-admin-bg-secondary border-admin-border-primary/50 hover:bg-admin-accent-primary hover:text-white transition-all"
              disabled={currentPage === 0 || loading}
              size="sm"
              variant="outline"
              onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            >
              Anterior
            </Button>
            <Button
              className="h-9 px-4 text-xs font-bold rounded-xl bg-admin-bg-secondary border-admin-border-primary/50 hover:bg-admin-accent-primary hover:text-white transition-all"
              disabled={currentPage >= totalPages - 1 || loading}
              size="sm"
              variant="outline"
              onClick={() =>
                onPageChange(Math.min(totalPages - 1, currentPage + 1))
              }
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
