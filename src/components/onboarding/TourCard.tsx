"use client";

import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TourStep } from "@/lib/onboarding/tour-config";

interface TourCardProps {
  step: TourStep;
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onComplete: () => void;
  position?: "top" | "bottom" | "left" | "right" | "center";
  elementBounds: DOMRect | null;
}

export function TourCard({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrevious,
  onSkip,
  onComplete,
  position = "bottom",
  elementBounds,
}: TourCardProps) {
  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  // Calcular posición de la tarjeta relativa al elemento destacado
  const cardStyle: React.CSSProperties = {
    position: "fixed",
    zIndex: 9999,
    pointerEvents: "auto",
    maxWidth: "400px",
    width: "90%",
  };

  if (elementBounds) {
    const padding = 20;
    const cardHeight = 400; // Estimación aproximada
    const cardWidth = 400;

    switch (position) {
      case "top":
        cardStyle.bottom = `${window.innerHeight - elementBounds.top + padding}px`;
        cardStyle.left = `${Math.max(padding, Math.min(elementBounds.left, window.innerWidth - cardWidth - padding))}px`;
        break;
      case "bottom":
        cardStyle.top = `${elementBounds.bottom + padding}px`;
        cardStyle.left = `${Math.max(padding, Math.min(elementBounds.left, window.innerWidth - cardWidth - padding))}px`;
        break;
      case "left":
        cardStyle.top = `${Math.max(padding, elementBounds.top)}px`;
        cardStyle.right = `${window.innerWidth - elementBounds.left + padding}px`;
        break;
      case "right":
        cardStyle.top = `${Math.max(padding, elementBounds.top)}px`;
        cardStyle.left = `${elementBounds.right + padding}px`;
        break;
      case "center":
        cardStyle.top = "50%";
        cardStyle.left = "50%";
        cardStyle.transform = "translate(-50%, -50%)";
        break;
    }

    // Asegurar que la tarjeta no se salga de la pantalla
    if (cardStyle.top && typeof cardStyle.top === "string") {
      const topValue = parseInt(cardStyle.top);
      if (topValue + cardHeight > window.innerHeight) {
        cardStyle.top = `${window.innerHeight - cardHeight - padding}px`;
      }
    }
    if (cardStyle.bottom && typeof cardStyle.bottom === "string") {
      const bottomValue = parseInt(cardStyle.bottom);
      if (bottomValue + cardHeight > window.innerHeight) {
        cardStyle.bottom = `${padding}px`;
      }
    }
  } else {
    // Fallback si no hay bounds - mostrar en el centro de la pantalla
    cardStyle.top = "50%";
    cardStyle.left = "50%";
    cardStyle.transform = "translate(-50%, -50%)";
    cardStyle.width = "90%";
    cardStyle.maxWidth = "500px";
  }

  return (
    <Card
      className="shadow-2xl border-2 border-primary/20 bg-background animate-in fade-in-0 zoom-in-95 duration-200"
      style={cardStyle}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{step.title}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Paso {currentStep + 1} de {totalSteps}
            </p>
          </div>
          <Button
            className="h-6 w-6"
            size="icon"
            title="Cerrar tour"
            variant="ghost"
            onClick={onSkip}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-foreground">{step.description}</p>

        {step.keyActions.length > 0 && (
          <ul className="space-y-2">
            {step.keyActions.map((action, index) => (
              <li className="flex items-start gap-2 text-sm" key={index}>
                <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{action}</span>
              </li>
            ))}
          </ul>
        )}

        {step.actionUrl && step.actionLabel && (
          <Button
            className="w-full"
            variant="outline"
            onClick={() => {
              window.location.href = step.actionUrl!;
            }}
          >
            {step.actionLabel}
          </Button>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <Button
            disabled={isFirstStep}
            size="sm"
            variant="ghost"
            onClick={onPrevious}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onSkip}>
              Saltar Tour
            </Button>
            {isLastStep ? (
              <Button size="sm" onClick={onComplete}>
                Finalizar
                <Check className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onNext}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
