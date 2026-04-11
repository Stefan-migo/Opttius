"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

const SLIDE_COUNTS: Record<string, number> = {
  POS: 13,
  CRM: 13,
  Inventario: 15,
  WorkOrders: 14,
  Citas: 15,
  AI: 14,
  Analiticas: 14,
  Admin: 14,
  Convenios: 15,
  Operativos: 15,
};

function getSlidePaths(folder: string): string[] {
  const count = SLIDE_COUNTS[folder] ?? 14;
  return Array.from(
    { length: count },
    (_, i) => `/images/landing/documentation/${folder}/Slide${i + 1}.webp`,
  );
}

interface FeatureSlideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  subtitle?: string;
  slidesFolder: string;
}

export function FeatureSlideDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  slidesFolder,
}: FeatureSlideDialogProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = getSlidePaths(slidesFolder);
  const totalSlides = slides.length;

  const goPrev = useCallback(() => {
    setSlideIndex((i) => (i > 0 ? i - 1 : totalSlides - 1));
  }, [totalSlides]);

  const goNext = useCallback(() => {
    setSlideIndex((i) => (i < totalSlides - 1 ? i + 1 : 0));
  }, [totalSlides]);

  const resetOnClose = useCallback(() => {
    setSlideIndex(0);
  }, []);

  useEffect(() => {
    if (!open) resetOnClose();
  }, [open, resetOnClose]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, goPrev, goNext, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex w-[calc(100vw-1rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 flex-col",
            "max-h-[min(95vh,calc(100dvh-2rem))] sm:max-h-[90vh]",
            "rounded-xl sm:rounded-2xl border border-epoch-primary/10 bg-epoch-background shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "duration-200 outline-none",
          )}
        >
          {/* Header - compact on mobile */}
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-epoch-primary/10 px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate font-sans text-base font-bold text-epoch-primary sm:text-lg">
                {title}
              </DialogPrimitive.Title>
              {subtitle && (
                <p className="truncate text-xs text-epoch-primary/70 sm:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
            <DialogPrimitive.Close
              aria-label="Cerrar"
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                "text-epoch-primary/70 hover:bg-epoch-primary/10 hover:text-epoch-primary",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-epoch-accent focus:ring-offset-2",
              )}
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          {/* Carousel area */}
          <div className="relative flex flex-1 flex-col overflow-hidden">
            {/* Slide image - responsive aspect */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center bg-epoch-surface/5 p-2 sm:p-4">
              <div className="relative aspect-[4/3] w-full max-w-3xl overflow-hidden rounded-lg bg-epoch-surface/10">
                <Image
                  fill
                  alt={`${title} - Slide ${slideIndex + 1} de ${totalSlides}`}
                  className="object-contain"
                  priority={slideIndex === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 896px"
                  src={slides[slideIndex]}
                />
              </div>
            </div>

            {/* Navigation - touch-friendly (min 44px) */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-epoch-primary/10 px-2 py-3 sm:px-4 sm:py-4">
              <button
                aria-label="Slide anterior"
                className={cn(
                  "flex h-12 min-h-[44px] w-12 min-w-[44px] items-center justify-center rounded-xl",
                  "bg-epoch-primary/10 text-epoch-primary hover:bg-epoch-primary/20",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-epoch-accent focus:ring-offset-2",
                )}
                type="button"
                onClick={goPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <span
                aria-live="polite"
                className="font-sans text-sm font-medium text-epoch-primary/80"
              >
                {slideIndex + 1} / {totalSlides}
              </span>

              <button
                aria-label="Slide siguiente"
                className={cn(
                  "flex h-12 min-h-[44px] w-12 min-w-[44px] items-center justify-center rounded-xl",
                  "bg-epoch-primary/10 text-epoch-primary hover:bg-epoch-primary/20",
                  "transition-colors focus:outline-none focus:ring-2 focus:ring-epoch-accent focus:ring-offset-2",
                )}
                type="button"
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
