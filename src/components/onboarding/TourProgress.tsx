"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

interface TourProgressProps {
  currentStep: number;
  totalSteps: number;
  onSkip: () => void;
}

export function TourProgress({
  currentStep,
  totalSteps,
  onSkip,
}: TourProgressProps) {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="fixed top-0 left-0 right-0 z-[10000] bg-background/95 backdrop-blur-sm border-b border-border shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span className="font-medium">Guía de Bienvenida</span>
              <span>
                Paso {currentStep + 1} de {totalSteps}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <Button
            className="ml-4 shrink-0"
            size="sm"
            title="Salir del tour"
            variant="ghost"
            onClick={onSkip}
          >
            <X className="h-4 w-4 mr-1" />
            Salir
          </Button>
        </div>
      </div>
    </div>
  );
}
