"use client";

import { AlertTriangle, Bell, Check } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NotificationStatsCardsProps {
  totalCount: number;
  unreadCount: number;
}

export function NotificationStatsCards({
  totalCount,
  unreadCount,
}: NotificationStatsCardsProps) {
  const stats = [
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
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
      {stats.map((stat, idx) => (
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
  );
}
