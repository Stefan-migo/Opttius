"use client";

import { useState } from "react";
import {
  AlertTriangle,
  TrendingUp,
  Info,
  CheckCircle,
  X,
  Star,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DatabaseInsight } from "@/lib/ai/insights/schemas";

interface InsightCardProps {
  insight: DatabaseInsight;
  onDismiss: () => void;
  onFeedback: (score: number, comment?: string) => void;
  compact?: boolean;
  /** When set, card becomes clickable to expand and show full insight */
  onExpand?: () => void;
}

const typeConfig = {
  warning: {
    icon: AlertTriangle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    iconBg: "bg-yellow-100",
    dotColor: "bg-yellow-500",
  },
  opportunity: {
    icon: TrendingUp,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-300",
    iconBg: "bg-green-100",
    dotColor: "bg-green-500",
  },
  info: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    iconBg: "bg-blue-100",
    dotColor: "bg-blue-500",
  },
  neutral: {
    icon: CheckCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    iconBg: "bg-gray-100",
    dotColor: "bg-gray-500",
  },
};

export function InsightCard({
  insight,
  onDismiss,
  onFeedback,
  compact = false,
  onExpand,
}: InsightCardProps) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [feedbackComment, setFeedbackComment] = useState("");
  const config = typeConfig[insight.type];
  const Icon = config.icon;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (insight.action_url) {
      let url = insight.action_url;
      // If metadata exists, append it as query params
      if (insight.metadata && Object.keys(insight.metadata).length > 0) {
        const params = new URLSearchParams();
        Object.entries(insight.metadata).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            params.append(key, String(value));
          }
        });
        url = `${url}${url.includes("?") ? "&" : "?"}${params.toString()}`;
      }
      // Use router for internal links
      if (url.startsWith("/")) {
        window.location.href = url;
      } else {
        window.open(url, "_blank");
      }
    }
  };

  const handleStarClick = (score: number) => {
    onFeedback(score, feedbackComment.trim() || undefined);
    setShowFeedback(false);
    setFeedbackComment("");
  };

  if (compact) {
    const isClickable = !!onExpand;
    const CardWrapper = isClickable ? "button" : "div";
    return (
      <CardWrapper
        type={isClickable ? "button" : undefined}
        onClick={isClickable ? onExpand : undefined}
        className={cn(
          "relative rounded-xl border-l-2 p-2.5 transition-all w-full text-left",
          config.bgColor,
          config.borderColor,
          isClickable &&
            "cursor-pointer hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-epoch-primary/50 active:scale-[0.99]",
        )}
      >
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div
            className={cn("rounded-full p-1.5 flex-shrink-0", config.iconBg)}
          >
            <Icon className={cn("w-3.5 h-3.5", config.color)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h4
                className={cn(
                  "text-sm font-semibold leading-tight",
                  config.color,
                )}
              >
                {insight.title}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-gray-400 hover:text-gray-600 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss();
                }}
                aria-label="Descartar"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <p className="text-xs text-gray-700 leading-relaxed mb-2 line-clamp-2">
              {insight.message}
            </p>
            {isClickable && (
              <span className="inline-flex items-center gap-0.5 text-xs text-epoch-primary/80 font-medium mb-2">
                Ver más
                <ChevronRight className="w-3 h-3" />
              </span>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Priority dots */}
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(insight.priority, 5) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={cn("w-1 h-1 rounded-full", config.dotColor)}
                      />
                    ),
                  )}
                </div>

                {/* Feedback */}
                {!showFeedback && !insight.feedback_score && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-xs text-gray-500 hover:text-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFeedback(true);
                    }}
                  >
                    <Star className="h-3 w-3" />
                  </Button>
                )}

                {showFeedback && (
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button
                          key={score}
                          type="button"
                          className="focus:outline-none"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStarClick(score);
                          }}
                          onMouseEnter={() => setHoveredStar(score)}
                          onMouseLeave={() => setHoveredStar(null)}
                        >
                          <Star
                            className={cn(
                              "h-3 w-3 transition-colors",
                              (hoveredStar !== null && score <= hoveredStar) ||
                                insight.feedback_score === score
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300 hover:text-yellow-400",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <textarea
                      placeholder="Comentario (opcional)"
                      className="w-full text-xs border rounded px-2 py-1 min-h-[2rem] max-h-20 resize-y"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      maxLength={500}
                      rows={2}
                    />
                  </div>
                )}

                {insight.feedback_score && !showFeedback && (
                  <div className="flex items-center gap-0.5 text-xs text-gray-500">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span>{insight.feedback_score}</span>
                  </div>
                )}
              </div>

              {/* Action button */}
              {insight.action_label && insight.action_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-xs font-medium",
                    config.color,
                    config.borderColor,
                    "hover:bg-white",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActionClick(e);
                  }}
                >
                  {insight.action_label}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardWrapper>
    );
  }

  // Full size card (for backwards compatibility)
  return (
    <div
      className={cn(
        "relative rounded-xl border-l-4 p-4 transition-all hover:shadow-md",
        config.bgColor,
        config.borderColor,
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={cn("rounded-full p-2", config.iconBg)}>
            <Icon className={cn("w-5 h-5", config.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn("text-base font-semibold mb-1", config.color)}>
              {insight.title}
            </h3>
            <p className="text-sm text-gray-700">{insight.message}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
          onClick={onDismiss}
          aria-label="Descartar insight"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Prioridad:</span>
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    i < insight.priority ? config.dotColor : "bg-gray-200",
                  )}
                />
              ))}
            </div>
          </div>

          {!showFeedback && !insight.feedback_score && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => setShowFeedback(true)}
            >
              <Star className="h-3 w-3 mr-1" />
              Calificar
            </Button>
          )}

          {showFeedback && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((score) => (
                  <button
                    key={score}
                    type="button"
                    className="focus:outline-none"
                    onClick={() => handleStarClick(score)}
                    onMouseEnter={() => setHoveredStar(score)}
                    onMouseLeave={() => setHoveredStar(null)}
                    aria-label={`${score} estrellas`}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4 transition-colors",
                        (hoveredStar !== null && score <= hoveredStar) ||
                          insight.feedback_score === score
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300 hover:text-yellow-400",
                      )}
                    />
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Comentario (opcional)"
                className="w-full text-sm border rounded px-2 py-1.5 min-h-[2.5rem] max-h-24 resize-y"
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                maxLength={500}
                rows={2}
              />
            </div>
          )}

          {insight.feedback_score && !showFeedback && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span>{insight.feedback_score}/5</span>
            </div>
          )}
        </div>

        {insight.action_label && insight.action_url && (
          <Button
            variant="outline"
            size="sm"
            className={cn("text-xs", config.color, config.borderColor)}
            onClick={handleActionClick}
          >
            {insight.action_label}
          </Button>
        )}
      </div>
    </div>
  );
}
