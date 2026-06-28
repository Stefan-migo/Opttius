"use client";

import type { ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface SettingsSectionProps {
  title: ReactNode;
  description?: string;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export default function SettingsSection({
  title,
  description,
  children,
  className = "rounded-xl border border-border overflow-hidden",
  contentClassName = "p-4 sm:p-6 space-y-6",
}: SettingsSectionProps) {
  return (
    <Card className={className}>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
          {title}
        </CardTitle>
        {description && (
          <CardDescription className="text-xs sm:text-sm text-epoch-primary/80 mt-1">
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className={contentClassName}>{children}</CardContent>
    </Card>
  );
}
