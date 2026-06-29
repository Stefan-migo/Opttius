"use client";

import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AnalyticsHeaderProps {
  title: string;
  description: string;
  period: string;
  refreshing: boolean;
  onPeriodChange: (value: string) => void;
  onRefresh: () => void;
}

export function AnalyticsHeader({
  title,
  description,
  period,
  refreshing,
  onPeriodChange,
  onRefresh,
}: AnalyticsHeaderProps) {
  return (
    <div className="space-y-4">
      <h1
        className="text-2xl sm:text-3xl font-bold text-epoch-primary"
        data-tour="analytics-header"
      >
        {title}
      </h1>
      <p className="text-sm text-admin-text-tertiary">{description}</p>
      <div className="flex flex-wrap items-center gap-2">
        <Select value={period} onValueChange={onPeriodChange}>
          <SelectTrigger className="w-full sm:w-[150px] min-h-[44px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
            <SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
        <Button
          className="min-h-[44px] flex-1 sm:flex-initial"
          disabled={refreshing}
          variant="outline"
          onClick={onRefresh}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          Actualizar
        </Button>
      </div>
    </div>
  );
}
