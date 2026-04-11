"use client";

import { HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ANALYTICS_HELP } from "@/lib/analytics-help";

export type AnalyticsHelpKey = keyof typeof ANALYTICS_HELP;

interface MetricTooltipProps {
  metricKey: AnalyticsHelpKey;
  children?: React.ReactNode;
  className?: string;
}

export function MetricTooltip({
  metricKey,
  children,
  className,
}: MetricTooltipProps) {
  const help = ANALYTICS_HELP[metricKey];
  if (!help) return children ?? null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children ?? (
          <button
            aria-label={`Ayuda: ${help.title}`}
            className={`inline-flex items-center justify-center rounded-full p-0.5 text-admin-text-tertiary hover:text-admin-accent-primary focus:outline-none focus:ring-2 focus:ring-admin-accent-primary/50 ${className ?? ""}`}
            type="button"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] p-3 text-left" side="top">
        <div className="space-y-2">
          <p className="font-semibold text-sm">{help.title}</p>
          <p className="text-xs text-muted-foreground">{help.description}</p>
          {help.details && help.details.length > 0 && (
            <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
              {help.details.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          )}
          {"formula" in help && help.formula && (
            <p className="text-[10px] font-mono text-muted-foreground/90 pt-1 border-t border-border">
              {help.formula}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
