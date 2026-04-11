"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface HeroSectionProps {
  title: string;
  subtitle?: string;
  description: string;
  backgroundImage: string;
  overlayOpacity?: number;
  textPosition?: "left" | "center" | "right";
  lineTheme?:
    | "alma-terra"
    | "ecos"
    | "jade-ritual"
    | "umbral"
    | "utopica"
    | "default";
  variant?: "default" | "elegant" | "artisanal" | "minimal";
  primaryAction?: {
    text: string;
    href: string;
  };
  secondaryAction?: {
    text: string;
    href: string;
  };
  badges?: Array<{
    text: string;
    icon?: React.ReactNode;
    variant?: "default" | "natural" | "premium" | "new";
  }>;
  height?: "sm" | "md" | "lg" | "xl" | "screen";
  showScrollIndicator?: boolean;
  className?: string;
}

const heightClasses = {
  sm: "min-h-[400px]",
  md: "min-h-[500px]",
  lg: "min-h-[600px]",
  xl: "min-h-[700px]",
  screen: "min-h-screen",
};

const textPositionClasses = {
  left: "text-left items-start",
  center: "text-center items-center",
  right: "text-right items-end",
};

const lineThemeClasses = {
  "alma-terra": {
    primary: "bg-alma-primary hover:bg-alma-primary/90",
    accent: "text-alma-secondary",
    overlay: "bg-gradient-to-r from-alma-primary/80 to-alma-secondary/60",
  },
  ecos: {
    primary: "bg-ecos-primary hover:bg-ecos-primary/90",
    accent: "text-ecos-secondary",
    overlay: "bg-gradient-to-r from-ecos-primary/80 to-ecos-secondary/60",
  },
  "jade-ritual": {
    primary: "bg-jade-primary hover:bg-jade-primary/90",
    accent: "text-jade-secondary",
    overlay: "bg-gradient-to-r from-jade-primary/80 to-jade-secondary/60",
  },
  umbral: {
    primary: "bg-umbral-primary hover:bg-umbral-primary/90",
    accent: "text-umbral-secondary",
    overlay: "bg-gradient-to-r from-umbral-primary/80 to-umbral-secondary/60",
  },
  utopica: {
    primary: "bg-utopica-primary hover:bg-utopica-primary/90",
    accent: "text-utopica-secondary",
    overlay: "bg-gradient-to-r from-utopica-primary/80 to-utopica-secondary/60",
  },
  default: {
    primary: "bg-brand-primary hover:bg-brand-primary/90",
    accent: "text-gold-500",
    overlay: "bg-gradient-to-r from-brand-primary/80 to-brand-secondary/60",
  },
};

const badgeVariants = {
  default: "bg-white/20 text-white border-white/30 backdrop-blur-sm",
  natural:
    "bg-green-500/20 text-green-100 border-green-300/30 backdrop-blur-sm",
  premium: "bg-gold-500/20 text-gold-100 border-gold-300/30 backdrop-blur-sm",
  new: "bg-purple-500/20 text-purple-100 border-purple-300/30 backdrop-blur-sm animate-pulse-gentle",
};

export default function HeroSection({
  title,
  subtitle,
  description,
  backgroundImage,
  overlayOpacity = 0.6,
  textPosition = "left",
  lineTheme = "default",
  variant = "default",
  primaryAction,
  secondaryAction,
  badges = [],
  height = "lg",
  showScrollIndicator = false,
  className = "",
}: HeroSectionProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const theme = lineThemeClasses[lineTheme];

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      className={cn(
        "relative overflow-hidden",
        heightClasses[height],
        className,
      )}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-400 animate-pulse" />
        )}
        <Image
          fill
          priority
          alt={title}
          className={cn(
            "object-cover transition-all duration-1000",
            imageLoaded ? "opacity-100 scale-100" : "opacity-0 scale-105",
          )}
          src={backgroundImage}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Dynamic Overlay */}
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-1000",
            theme.overlay,
          )}
          style={{ opacity: overlayOpacity }}
        />

        {/* Artistic overlay pattern */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full">
        <div className="container mx-auto px-4 h-full">
          <div
            className={cn(
              "flex flex-col justify-center h-full max-w-4xl",
              textPositionClasses[textPosition],
              textPosition === "center" && "mx-auto",
              textPosition === "right" && "ml-auto",
            )}
          >
            {/* Badges */}
            {badges.length > 0 && (
              <div
                className={cn(
                  "flex flex-wrap gap-2 mb-6 transition-all duration-1000 delay-200",
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4",
                )}
              >
                {badges.map((badge, index) => (
                  <Badge
                    className={badgeVariants[badge.variant || "default"]}
                    key={index}
                  >
                    {badge.icon && <span className="mr-2">{badge.icon}</span>}
                    {badge.text}
                  </Badge>
                ))}
              </div>
            )}

            {/* Subtitle */}
            {subtitle && (
              <p
                className={cn(
                  "text-lg text-white/90 mb-4 font-medium transition-all duration-1000 delay-300",
                  theme.accent,
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4",
                )}
              >
                {subtitle}
              </p>
            )}

            {/* Title */}
            <h1
              className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6",
                "leading-tight tracking-tight transition-all duration-1000 delay-400",
                variant === "elegant" &&
                  "font-serif text-5xl md:text-6xl lg:text-7xl",
                variant === "artisanal" &&
                  "font-bold text-3xl md:text-4xl lg:text-5xl",
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8",
              )}
            >
              {title}
            </h1>

            {/* Description */}
            <p
              className={cn(
                "text-lg md:text-xl text-white/90 mb-8 max-w-2xl leading-relaxed",
                "transition-all duration-1000 delay-500",
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4",
              )}
            >
              {description}
            </p>

            {/* Actions */}
            {(primaryAction || secondaryAction) && (
              <div
                className={cn(
                  "flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-600",
                  textPosition === "center" && "justify-center",
                  textPosition === "right" && "justify-end",
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4",
                )}
              >
                {primaryAction && (
                  <Button
                    asChild
                    className={cn(
                      "text-white font-semibold shadow-2xl",
                      "transition-all duration-300 hover:scale-105 active:scale-95",
                      "hover:shadow-2xl",
                      theme.primary,
                    )}
                    size="lg"
                  >
                    <Link href={primaryAction.href}>
                      {primaryAction.text}
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                )}

                {secondaryAction && (
                  <Button
                    asChild
                    className="text-white border-white/30 bg-white/10 backdrop-blur-sm hover:bg-white/20 font-semibold shadow-xl transition-all duration-300 hover:scale-105"
                    size="lg"
                    variant="outline"
                  >
                    <Link href={secondaryAction.href}>
                      {secondaryAction.text}
                    </Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      {showScrollIndicator && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
          <div className="flex flex-col items-center text-white/70 animate-bounce">
            <span className="text-sm mb-2 font-medium">Descubre más</span>
            <ChevronDown className="h-6 w-6" />
          </div>
        </div>
      )}

      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </section>
  );
}
