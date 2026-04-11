"use client";

import {
  Award,
  BookOpen,
  Calendar,
  CheckCircle,
  Circle,
  Lock,
  Star,
  Target,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "locked" | "available";
  week: number;
  completionPercentage?: number;
  dueDate?: string;
  estimatedTime?: string;
}

interface ProgressIndicatorProps {
  title: string;
  description?: string;
  currentWeek: number;
  totalWeeks: number;
  overallProgress: number;
  steps: ProgressStep[];
  className?: string;
  showDetailed?: boolean;
  compact?: boolean;
}

export default function ProgressIndicator({
  title,
  description,
  currentWeek,
  totalWeeks,
  overallProgress,
  steps,
  className = "",
  showDetailed = false,
  compact = false,
}: ProgressIndicatorProps) {
  const getStepIcon = (status: ProgressStep["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-verde-suave" />;
      case "current":
        return <Circle className="h-5 w-5 text-dorado animate-pulse" />;
      case "locked":
        return <Lock className="h-5 w-5 text-gray-400" />;
      case "available":
        return <Circle className="h-5 w-5 text-azul-profundo" />;
      default:
        return <Circle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStepBadge = (status: ProgressStep["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            className="bg-verde-suave text-white"
            style={{ color: "var(--admin-accent-secondary)" }}
          >
            Completado
          </Badge>
        );
      case "current":
        return (
          <Badge className="bg-dorado text-azul-profundo">En Progreso</Badge>
        );
      case "locked":
        return (
          <Badge className="text-gray-500" variant="secondary">
            Bloqueado
          </Badge>
        );
      case "available":
        return (
          <Badge
            className="border-azul-profundo text-azul-profundo"
            variant="outline"
          >
            Disponible
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      month: "short",
      day: "numeric",
    });
  };

  const completedSteps = steps.filter(
    (step) => step.status === "completed",
  ).length;

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-azul-profundo">{title}</h4>
              <Badge
                className="bg-dorado/20 text-azul-profundo"
                variant="secondary"
              >
                Semana {currentWeek}/{totalWeeks}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-tierra-media">Progreso general</span>
                <span className="font-semibold text-azul-profundo">
                  {overallProgress}%
                </span>
              </div>
              <Progress className="h-2" value={overallProgress} />
            </div>

            <div className="flex items-center justify-between text-sm text-tierra-media">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-verde-suave" />
                <span>
                  {completedSteps} de {steps.length} completados
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4 text-dorado" />
                <span>Meta: 100%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-azul-profundo">{title}</CardTitle>
            {description && (
              <p className="text-sm text-tierra-media mt-1">{description}</p>
            )}
          </div>
          <div className="text-right">
            <Badge
              className="bg-dorado/20 text-azul-profundo mb-2"
              variant="secondary"
            >
              Semana {currentWeek}/{totalWeeks}
            </Badge>
            <div className="text-2xl font-bold text-azul-profundo">
              {overallProgress}%
            </div>
          </div>
        </div>

        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-tierra-media">Progreso del programa</span>
            <div className="flex items-center gap-1">
              <Award className="h-4 w-4 text-dorado" />
              <span className="text-azul-profundo font-semibold">
                {completedSteps}/{steps.length} módulos
              </span>
            </div>
          </div>
          <Progress className="h-3" value={overallProgress} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Steps List */}
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div
              className={`flex items-start gap-3 p-4 rounded-lg transition-colors ${
                step.status === "current"
                  ? "bg-dorado/10 border border-dorado/20"
                  : step.status === "completed"
                    ? "bg-verde-suave/10 border border-verde-suave/20"
                    : "bg-gray-50 border border-gray-200"
              }`}
              key={step.id}
            >
              {/* Step Icon */}
              <div className="mt-0.5">{getStepIcon(step.status)}</div>

              {/* Step Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5
                        className={`font-semibold ${
                          step.status === "locked"
                            ? "text-gray-500"
                            : "text-azul-profundo"
                        }`}
                      >
                        {step.title}
                      </h5>
                      <Badge className="text-xs" variant="outline">
                        Semana {step.week}
                      </Badge>
                    </div>
                    <p
                      className={`text-sm ${
                        step.status === "locked"
                          ? "text-gray-400"
                          : "text-tierra-media"
                      }`}
                    >
                      {step.description}
                    </p>

                    {/* Step Details */}
                    <div className="flex items-center gap-4 mt-2 text-xs text-tierra-media">
                      {step.estimatedTime && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span>{step.estimatedTime}</span>
                        </div>
                      )}
                      {step.dueDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>Hasta {formatDate(step.dueDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Individual Progress */}
                    {step.status === "current" &&
                      step.completionPercentage !== undefined && (
                        <div className="mt-3 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-tierra-media">
                              Progreso del módulo
                            </span>
                            <span className="font-semibold text-azul-profundo">
                              {step.completionPercentage}%
                            </span>
                          </div>
                          <Progress
                            className="h-1.5"
                            value={step.completionPercentage}
                          />
                        </div>
                      )}
                  </div>

                  {/* Status Badge */}
                  <div className="ml-2">{getStepBadge(step.status)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Achievement Badge */}
        {overallProgress >= 80 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-dorado/20 to-verde-suave/20 rounded-lg border border-dorado/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-dorado rounded-full">
                <Star className="h-5 w-5 text-azul-profundo" />
              </div>
              <div>
                <h6 className="font-semibold text-azul-profundo">
                  ¡Excelente progreso!
                </h6>
                <p className="text-sm text-tierra-media">
                  Estás muy cerca de completar tu transformación. ¡Sigue así!
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
