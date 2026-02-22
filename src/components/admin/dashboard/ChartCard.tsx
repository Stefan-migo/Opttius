"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export function ChartCard({
  title,
  subtitle,
  icon,
  children,
  headerActions,
}: ChartCardProps) {
  return (
    <Card className="border border-admin-border-primary/20 bg-admin-border-primary/5 rounded-none shadow-none overflow-hidden group">
      <CardHeader className="pb-2 border-b border-admin-border-primary/10">
        <div
          className={
            headerActions
              ? "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              : "flex items-center gap-3"
          }
        >
          {icon && (
            <div className="h-10 w-10 bg-epoch-primary/5 border border-epoch-primary/10 flex items-center justify-center">
              {icon}
            </div>
          )}
          <div className="flex-1">
            <CardTitle className="text-xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
              {title}
            </CardTitle>
          </div>
          {headerActions}
        </div>
        {subtitle && (
          <p className="text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-widest mt-2">
            {subtitle}
          </p>
        )}
      </CardHeader>
      <CardContent className="p-8">{children}</CardContent>
    </Card>
  );
}
