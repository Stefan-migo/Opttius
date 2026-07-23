"use client";

import { ChevronRight, Info } from "lucide-react";

import {
  formatTimeSince,
  NOTIFICATION_ICONS,
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

interface NotificationDropdownItemProps {
  notification: AdminNotification;
  onClick: (id: string, actionUrl?: string) => void;
  compact?: boolean;
}

export function NotificationDropdownItem({
  notification,
  onClick,
  compact,
}: NotificationDropdownItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type] || Info;
  const isUnread = !notification.is_read;

  return (
    <div
      className={cn(
        "group p-4 transition-all duration-300 cursor-pointer relative",
        isUnread
          ? "bg-admin-accent-primary/[0.03]"
          : "hover:bg-admin-bg-tertiary/50",
      )}
      key={notification.id}
      onClick={() => onClick(notification.id, notification.action_url)}
    >
      {isUnread && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-admin-accent-primary" />
      )}

      <div className="flex gap-4">
        <div
          className={cn(
            "flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center shadow-sm transition-transform",
            compact
              ? ""
              : "group-hover:scale-105",
            isUnread
              ? "bg-admin-accent-primary/10 border border-admin-accent-primary/30"
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
              {formatTimeSince(notification.created_at)}
            </span>
          </div>

          <p
            className={cn(
              "text-xs text-admin-text-tertiary mt-1.5 font-medium",
              compact ? "" : "line-clamp-2 leading-relaxed",
            )}
          >
            {notification.message}
          </p>

          <div className="flex items-center justify-between mt-3">
            {!compact && (
              <div className="flex gap-1.5">
                <span
                  className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-tight",
                    PRIORITY_COLORS[notification.priority] ||
                      PRIORITY_COLORS.medium,
                  )}
                >
                  {notification.priority}
                </span>
              </div>
            )}
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
}
