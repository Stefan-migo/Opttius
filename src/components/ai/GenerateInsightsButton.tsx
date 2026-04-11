"use client";

import { Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { InsightSection } from "@/lib/ai/insights/schemas";

interface GenerateInsightsButtonProps {
  section: InsightSection;
  className?: string;
}

export function GenerateInsightsButton({
  section,
  className,
}: GenerateInsightsButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Paso 1: Obtener datos reales
      const prepareResponse = await fetch(
        `/api/ai/insights/prepare-data?section=${section}`,
      );
      if (!prepareResponse.ok) {
        throw new Error("Error obteniendo datos del sistema");
      }
      const prepareData = await prepareResponse.json();

      // Paso 2: Generar insights
      const generateResponse = await fetch("/api/ai/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section,
          data: prepareData.data[section] || prepareData.data,
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse
          .json()
          .catch(() => ({ error: generateResponse.statusText }));
        throw new Error(errorData.error || "Error generando insights");
      }

      const result = await generateResponse.json();

      toast.success(
        `✅ ${result.count} insight${result.count !== 1 ? "s" : ""} generado${result.count !== 1 ? "s" : ""}`,
        {
          description: "Los insights aparecerán en el widget flotante",
        },
      );

      // Recargar la página para mostrar los nuevos insights
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: unknown) {
      toast.error("Error generando insights", {
        description: error.message || "Intenta nuevamente",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      className={className}
      disabled={isGenerating}
      size="sm"
      variant="outline"
      onClick={handleGenerate}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generando...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Generar Insights
        </>
      )}
    </Button>
  );
}
