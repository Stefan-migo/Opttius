"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  changeIndicator?: React.ReactNode;
  iconBg?: string;
  showRightBorder?: boolean;
}

export function KpiCard({
  icon,
  label,
  value,
  subtitle,
  badge,
  changeIndicator,
  iconBg = "bg-epoch-primary/5 border-epoch-primary/10",
  showRightBorder = true,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "border-none bg-admin-bg-tertiary/50 rounded-none shadow-none hover:shadow-md transition-shadow duration-300 group overflow-hidden",
        showRightBorder && "border-r border-admin-border-primary/10",
      )}
    >
      <CardContent className="p-8 relative">
        <div className="flex items-start justify-between mb-6">
          <div
            className={cn(
              "h-12 w-12 flex items-center justify-center transition-transform group-hover:scale-110 border",
              iconBg,
            )}
          >
            {icon}
          </div>
          {badge ?? changeIndicator}
        </div>

        <div className="space-y-1">
          <p className="text-[10px] font-display font-bold text-admin-text-tertiary uppercase tracking-[0.2em]">
            {label}
          </p>
          <p className="text-3xl font-display font-bold text-admin-text-primary tracking-tight">
            {value}
          </p>
          {subtitle && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-admin-border-primary/5">
              {subtitle}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
