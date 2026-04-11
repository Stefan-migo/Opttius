"use client";

import {
  ArrowRight,
  Award,
  CheckCircle,
  Heart,
  Leaf,
  Shield,
  Sparkles,
} from "lucide-react";
import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureHighlightProps {
  icon?: ReactNode;
  title: string;
  description: string;
  benefits?: string[];
  isNew?: boolean;
  isPremium?: boolean;
  category?: "natural" | "certified" | "handmade" | "premium";
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: "default" | "card" | "banner";
  size?: "sm" | "md" | "lg";
}

export default function FeatureHighlight({
  icon,
  title,
  description,
  benefits = [],
  isNew = false,
  isPremium = false,
  category,
  actionLabel,
  onAction,
  className = "",
  variant = "default",
  size = "md",
}: FeatureHighlightProps) {
  const getDefaultIcon = () => {
    if (icon) return icon;

    switch (category) {
      case "natural":
        return <Leaf className="h-8 w-8 text-verde-suave" />;
      case "certified":
        return <Shield className="h-8 w-8 text-azul-profundo" />;
      case "handmade":
        return <Heart className="h-8 w-8 text-coral-suave" />;
      case "premium":
        return <Award className="h-8 w-8 text-dorado" />;
      default:
        return <Sparkles className="h-8 w-8 text-dorado" />;
    }
  };

  const getCategoryBadge = () => {
    if (!category) return null;

    switch (category) {
      case "natural":
        return (
          <Badge
            className="bg-verde-suave text-white"
            style={{ color: "var(--admin-accent-secondary)" }}
          >
            <Leaf className="h-3 w-3 mr-1" />
            100% Natural
          </Badge>
        );
      case "certified":
        return (
          <Badge className="bg-azul-profundo text-white">
            <Shield className="h-3 w-3 mr-1" />
            Certificado
          </Badge>
        );
      case "handmade":
        return (
          <Badge className="bg-coral-suave text-white">
            <Heart className="h-3 w-3 mr-1" />
            Artesanal
          </Badge>
        );
      case "premium":
        return (
          <Badge className="bg-dorado text-azul-profundo">
            <Award className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        );
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: "p-4",
          icon: "h-6 w-6",
          title: "text-lg",
          description: "text-sm",
          spacing: "space-y-2",
        };
      case "lg":
        return {
          container: "p-8",
          icon: "h-12 w-12",
          title: "text-2xl",
          description: "text-lg",
          spacing: "space-y-6",
        };
      default: // md
        return {
          container: "p-6",
          icon: "h-8 w-8",
          title: "text-xl",
          description: "text-base",
          spacing: "space-y-4",
        };
    }
  };

  const sizeClasses = getSizeClasses();

  if (variant === "banner") {
    return (
      <div
        className={`relative overflow-hidden rounded-lg bg-gradient-to-r from-verde-suave/20 via-turquesa-claro/20 to-dorado/20 border border-dorado/30 ${className}`}
      >
        <div className={`${sizeClasses.container} ${sizeClasses.spacing}`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/80 rounded-full">
                {getDefaultIcon()}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3
                    className={`font-bold text-azul-profundo ${sizeClasses.title}`}
                  >
                    {title}
                  </h3>
                  {isNew && (
                    <Badge className="bg-dorado text-azul-profundo">
                      Nuevo
                    </Badge>
                  )}
                  {isPremium && (
                    <Badge className="bg-azul-profundo text-white">
                      Premium
                    </Badge>
                  )}
                  {getCategoryBadge()}
                </div>

                <p
                  className={`text-tierra-media ${sizeClasses.description} mb-4`}
                >
                  {description}
                </p>

                {benefits.length > 0 && (
                  <ul className="space-y-2 mb-4">
                    {benefits.map((benefit, index) => (
                      <li
                        className="flex items-center gap-2 text-sm text-tierra-media"
                        key={index}
                      >
                        <CheckCircle className="h-4 w-4 text-verde-suave flex-shrink-0" />
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {actionLabel && onAction && (
              <Button
                className="bg-dorado hover:bg-dorado/90 text-azul-profundo font-semibold"
                onClick={onAction}
              >
                {actionLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card
        className={`group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}
      >
        <CardContent
          className={`${sizeClasses.container} ${sizeClasses.spacing}`}
        >
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-dorado/10 rounded-full group-hover:bg-dorado/20 transition-colors">
                {getDefaultIcon()}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mb-3">
              <h3
                className={`font-bold text-azul-profundo ${sizeClasses.title}`}
              >
                {title}
              </h3>
              {isNew && (
                <Badge className="bg-dorado text-azul-profundo">Nuevo</Badge>
              )}
            </div>

            {getCategoryBadge() && (
              <div className="flex justify-center mb-3">
                {getCategoryBadge()}
              </div>
            )}

            <p className={`text-tierra-media ${sizeClasses.description} mb-4`}>
              {description}
            </p>

            {benefits.length > 0 && (
              <ul className="space-y-2 mb-6 text-left">
                {benefits.map((benefit, index) => (
                  <li
                    className="flex items-center gap-2 text-sm text-tierra-media"
                    key={index}
                  >
                    <CheckCircle className="h-4 w-4 text-verde-suave flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            )}

            {actionLabel && onAction && (
              <Button
                className="w-full bg-dorado hover:bg-dorado/90 text-azul-profundo font-semibold"
                onClick={onAction}
              >
                {actionLabel}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <div className={`${sizeClasses.spacing} ${className}`}>
      <div className="flex items-start gap-4">
        <div className="p-2 bg-dorado/10 rounded-lg">{getDefaultIcon()}</div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3
              className={`font-semibold text-azul-profundo ${sizeClasses.title}`}
            >
              {title}
            </h3>
            {isNew && (
              <Badge className="bg-dorado text-azul-profundo">Nuevo</Badge>
            )}
            {getCategoryBadge()}
          </div>

          <p className={`text-tierra-media ${sizeClasses.description} mb-3`}>
            {description}
          </p>

          {benefits.length > 0 && (
            <ul className="space-y-1 mb-3">
              {benefits.map((benefit, index) => (
                <li
                  className="flex items-center gap-2 text-sm text-tierra-media"
                  key={index}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-dorado" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          )}

          {actionLabel && onAction && (
            <Button
              className="border-azul-profundo text-azul-profundo hover:bg-azul-profundo hover:text-white"
              size="sm"
              variant="outline"
              onClick={onAction}
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
