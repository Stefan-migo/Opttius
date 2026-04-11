import { cva, type VariantProps } from "class-variance-authority";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const contentSectionVariants = cva(
  "relative w-full transition-all duration-300",
  {
    variants: {
      variant: {
        default: "py-16 px-6",
        hero: "py-24 px-6 min-h-[60vh] flex items-center",
        compact: "py-12 px-6",
        full: "py-20 px-8",
        minimal: "py-8 px-4",
      },
      background: {
        transparent: "bg-transparent",
        white: "bg-white",
        cream: "bg-bg-cream",
        light: "bg-bg-light",
        primary: "bg-line-primary text-white",
        gradient:
          "bg-gradient-to-br from-line-primary to-line-secondary text-white",
        overlay: "relative bg-cover bg-center",
      },
      textAlign: {
        left: "text-left",
        center: "text-center",
        right: "text-right",
      },
      spacing: {
        tight: "space-y-4",
        normal: "space-y-6",
        relaxed: "space-y-8",
        loose: "space-y-12",
      },
    },
    defaultVariants: {
      variant: "default",
      background: "transparent",
      textAlign: "left",
      spacing: "normal",
    },
  },
);

const contentContainerVariants = cva("mx-auto max-w-7xl relative z-10", {
  variants: {
    width: {
      narrow: "max-w-3xl",
      normal: "max-w-7xl",
      wide: "max-w-8xl",
      full: "max-w-none",
    },
  },
  defaultVariants: {
    width: "normal",
  },
});

interface ContentSectionProps
  extends VariantProps<typeof contentSectionVariants> {
  children: React.ReactNode;
  className?: string;
  backgroundImage?: string;
  overlayOpacity?: number;
  width?: VariantProps<typeof contentContainerVariants>["width"];
  id?: string;
}

interface ContentHeaderProps {
  badge?: {
    text: string;
    variant?: "default" | "secondary" | "destructive" | "outline";
  };
  title: string;
  subtitle?: string;
  description?: string;
  className?: string;
}

interface ContentBodyProps {
  children: React.ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

interface ContentActionsProps {
  primaryAction?: {
    text: string;
    href?: string;
    onClick?: () => void;
    variant?: "brand" | "line-primary" | "outline";
  };
  secondaryAction?: {
    text: string;
    href?: string;
    onClick?: () => void;
    variant?: "ghost" | "outline" | "line-outline";
  };
  className?: string;
}

export function ContentSection({
  children,
  className,
  backgroundImage,
  overlayOpacity = 0.6,
  width,
  variant,
  background,
  textAlign,
  spacing,
  id,
  ...props
}: ContentSectionProps) {
  const sectionStyle = backgroundImage
    ? {
        backgroundImage: `url(${backgroundImage})`,
      }
    : {};

  return (
    <section
      className={cn(
        contentSectionVariants({ variant, background, textAlign, spacing }),
        className,
      )}
      id={id}
      style={sectionStyle}
      {...props}
    >
      {backgroundImage && background === "overlay" && (
        <div
          className="absolute inset-0 bg-line-primary"
          style={{ opacity: overlayOpacity }}
        />
      )}

      <div className={cn(contentContainerVariants({ width }), spacing)}>
        {children}
      </div>
    </section>
  );
}

export function ContentHeader({
  badge,
  title,
  subtitle,
  description,
  className,
}: ContentHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {badge && (
        <Badge
          className="mb-2 animate-in slide-in-from-top duration-500"
          variant={badge.variant || "outline"}
        >
          {badge.text}
        </Badge>
      )}

      {subtitle && (
        <p className="text-sm font-medium text-line-primary uppercase tracking-wider animate-in slide-in-from-top duration-500 delay-100">
          {subtitle}
        </p>
      )}

      <h2 className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold text-foreground animate-in slide-in-from-top duration-500 delay-200">
        {title}
      </h2>

      {description && (
        <p className="text-lg text-muted-foreground max-w-3xl animate-in slide-in-from-top duration-500 delay-300">
          {description}
        </p>
      )}
    </div>
  );
}

export function ContentBody({
  children,
  className,
  columns = 1,
}: ContentBodyProps) {
  const columnClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  };

  return (
    <div
      className={cn(
        "grid gap-8 animate-in slide-in-from-bottom duration-500 delay-400",
        columnClasses[columns],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function ContentActions({
  primaryAction,
  secondaryAction,
  className,
}: ContentActionsProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom duration-500 delay-500",
        className,
      )}
    >
      {primaryAction && (
        <Button
          asChild={!!primaryAction.href}
          className="group"
          size="lg"
          variant={primaryAction.variant || "brand"}
          onClick={primaryAction.onClick}
        >
          {primaryAction.href ? (
            <a href={primaryAction.href}>
              {primaryAction.text}
              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>
          ) : (
            <>
              {primaryAction.text}
              <span className="ml-2 transition-transform group-hover:translate-x-1">
                →
              </span>
            </>
          )}
        </Button>
      )}

      {secondaryAction && (
        <Button
          asChild={!!secondaryAction.href}
          size="lg"
          variant={secondaryAction.variant || "outline"}
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.href ? (
            <a href={secondaryAction.href}>{secondaryAction.text}</a>
          ) : (
            secondaryAction.text
          )}
        </Button>
      )}
    </div>
  );
}

// Feature highlight component for showcasing benefits
interface FeatureItemProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function FeatureItem({
  icon,
  title,
  description,
  className,
}: FeatureItemProps) {
  return (
    <div
      className={cn(
        "group p-6 rounded-lg border bg-card hover:bg-line-lightest/50 transition-all duration-300 hover:shadow-lg hover:border-line-primary/20",
        className,
      )}
    >
      {icon && (
        <div className="mb-4 text-line-primary group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      )}
      <h3 className="font-heading text-xl font-semibold mb-2 text-foreground">
        {title}
      </h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// Stats/metrics component
interface StatsItemProps {
  value: string;
  label: string;
  description?: string;
  className?: string;
}

export function StatsItem({
  value,
  label,
  description,
  className,
}: StatsItemProps) {
  return (
    <div
      className={cn(
        "text-center p-6 group hover:scale-105 transition-transform duration-300",
        className,
      )}
    >
      <div className="text-4xl md:text-5xl font-bold text-line-primary mb-2 group-hover:text-line-secondary transition-colors duration-300">
        {value}
      </div>
      <div className="font-semibold text-foreground mb-1">{label}</div>
      {description && (
        <div className="text-sm text-muted-foreground">{description}</div>
      )}
    </div>
  );
}
