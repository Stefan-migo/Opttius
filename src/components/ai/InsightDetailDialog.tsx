"use client";

import {
  AlertTriangle,
  TrendingUp,
  Info,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DatabaseInsight } from "@/lib/ai/insights/schemas";

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600 dark:text-yellow-500",
    bgColor: "bg-yellow-50 dark:bg-yellow-950/30",
    borderColor: "border-yellow-300 dark:border-yellow-700",
    iconBg: "bg-yellow-100 dark:bg-yellow-900/50",
  },
  opportunity: {
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-300 dark:border-green-700",
    iconBg: "bg-green-100 dark:bg-green-900/50",
  },
  info: {
    icon: Info,
    color: "text-blue-600 dark:text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-300 dark:border-blue-700",
    iconBg: "bg-blue-100 dark:bg-blue-900/50",
  },
  neutral: {
    icon: CheckCircle,
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/50",
    borderColor: "border-gray-300 dark:border-gray-700",
    iconBg: "bg-gray-100 dark:bg-gray-800/50",
  },
};

interface InsightDetailDialogProps {
  insight: DatabaseInsight | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InsightDetailDialog({
  insight,
  open,
  onOpenChange,
}: InsightDetailDialogProps) {
  if (!insight) return null;

  const config = typeConfig[insight.type];
  const Icon = config.icon;

  const handleActionClick = () => {
    if (insight.action_url) {
      let url = insight.action_url;
      if (insight.metadata && Object.keys(insight.metadata).length > 0) {
        const params = new URLSearchParams();
        Object.entries(insight.metadata).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });
        url = `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;
      }
      if (url.startsWith("/")) {
        window.location.href = url;
      } else {
        window.open(url, "_blank");
      }
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[90vh] overflow-hidden flex flex-col",
          "w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-md md:max-w-lg lg:max-w-xl",
          "sm:max-h-[85vh] p-0 gap-0",
        )}
      >
        <DialogHeader
          className={cn(
            "p-4 sm:p-5 pb-3 border-b shrink-0",
            config.bgColor,
            config.borderColor,
          )}
        >
          <div className="flex items-start gap-3 pr-8">
            <div
              className={cn("rounded-full p-2 flex-shrink-0", config.iconBg)}
            >
              <Icon className={cn("w-5 h-5 sm:w-6 sm:h-6", config.color)} />
            </div>
            <DialogTitle
              className={cn(
                "text-base sm:text-lg font-semibold leading-tight",
                config.color,
              )}
            >
              {insight.title}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {insight.message}
          </p>
        </div>

        {insight.action_label && insight.action_url && (
          <div className="p-4 sm:p-5 pt-3 border-t shrink-0">
            <Button
              variant="outline"
              className={cn(
                "w-full sm:w-auto",
                config.color,
                config.borderColor,
                "hover:bg-white dark:hover:bg-gray-900",
              )}
              onClick={handleActionClick}
            >
              {insight.action_label}
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
