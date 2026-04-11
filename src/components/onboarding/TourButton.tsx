"use client";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useTour } from "@/hooks/useTour";
import { TOUR_CONFIG } from "@/lib/onboarding/tour-config";

export function TourButton() {
  const { restartTour, isCompleted, isNotStarted, isLoading } = useTour();

  if (!TOUR_CONFIG.enabled || isLoading) return null;

  return (
    <Button
      className="fixed bottom-6 right-6 rounded-full w-14 h-14 shadow-lg z-50"
      size="icon"
      title={
        isCompleted || isNotStarted
          ? "Iniciar tour guiado"
          : "Ver tour nuevamente"
      }
      onClick={() => restartTour()}
    >
      <HelpCircle className="h-6 w-6" />
    </Button>
  );
}
