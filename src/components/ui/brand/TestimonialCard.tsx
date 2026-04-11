"use client";

import {
  Award,
  ChevronLeft,
  ChevronRight,
  Heart,
  Quote,
  Star,
} from "lucide-react";
import Image from "next/image";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface TestimonialCardProps {
  id: string;
  name: string;
  location?: string;
  avatar?: string;
  rating: number;
  testimonial: string;
  productOrService?: string;
  category: "producto" | "servicio" | "membresia";
  date: string;
  isVerified?: boolean;
  images?: string[];
  className?: string;
}

export default function TestimonialCard({
  id,
  name,
  location,
  avatar,
  rating,
  testimonial,
  productOrService,
  category,
  date,
  isVerified = false,
  images = [],
  className = "",
}: TestimonialCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, index) => (
      <Star
        className={`h-4 w-4 ${
          index < Math.floor(rating)
            ? "fill-dorado text-dorado"
            : "text-gray-300"
        }`}
        key={index}
      />
    ));
  };

  const getCategoryBadge = () => {
    switch (category) {
      case "producto":
        return (
          <Badge
            className="bg-verde-suave/20 text-verde-suave"
            variant="secondary"
          >
            Producto
          </Badge>
        );
      case "servicio":
        return (
          <Badge
            className="bg-turquesa-claro/20 text-turquesa-claro"
            variant="secondary"
          >
            Servicio
          </Badge>
        );
      case "membresia":
        return (
          <Badge
            className="bg-dorado/20 text-azul-profundo"
            variant="secondary"
          >
            Membresía
          </Badge>
        );
    }
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-lg ${className}`}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative">
              {avatar ? (
                <Image
                  alt={name}
                  className="rounded-full object-cover"
                  height={48}
                  src={avatar}
                  width={48}
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-dorado/20 flex items-center justify-center">
                  <span className="text-azul-profundo font-semibold text-lg">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              {isVerified && (
                <div className="absolute -top-1 -right-1 bg-verde-suave rounded-full p-1">
                  <Award className="h-3 w-3 text-white" />
                </div>
              )}
            </div>

            {/* User Info */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-azul-profundo">{name}</h4>
                {isVerified && (
                  <Badge
                    className="text-xs bg-verde-suave/20 text-verde-suave"
                    variant="secondary"
                  >
                    Verificado
                  </Badge>
                )}
              </div>
              {location && (
                <p className="text-sm text-tierra-media">{location}</p>
              )}
            </div>
          </div>

          {/* Category Badge */}
          {getCategoryBadge()}
        </div>

        {/* Rating */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center">{renderStars(rating)}</div>
          <span className="text-sm font-medium text-azul-profundo">
            {rating}/5
          </span>
        </div>

        {/* Quote Icon */}
        <div className="mb-4">
          <Quote className="h-8 w-8 text-dorado/30" />
        </div>

        {/* Testimonial Text */}
        <blockquote className="text-tierra-media mb-4 leading-relaxed">
          &quot;{testimonial}&quot;
        </blockquote>

        {/* Product/Service Reference */}
        {productOrService && (
          <div className="mb-4 p-3 bg-verde-suave/10 rounded-lg">
            <p className="text-sm text-azul-profundo">
              <strong>Sobre:</strong> {productOrService}
            </p>
          </div>
        )}

        {/* Testimonial Images */}
        {images.length > 0 && (
          <div className="mb-4">
            <div className="relative aspect-video rounded-lg overflow-hidden bg-verde-suave/10">
              <Image
                fill
                alt={`Foto de testimonial ${currentImageIndex + 1}`}
                className="object-cover"
                src={images[currentImageIndex]}
              />

              {images.length > 1 && (
                <>
                  <Button
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    size="sm"
                    variant="secondary"
                    onClick={prevImage}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 bg-white/80 hover:bg-white"
                    size="sm"
                    variant="secondary"
                    onClick={nextImage}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  {/* Image Indicators */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, index) => (
                      <button
                        className={`h-2 w-2 rounded-full transition-colors ${
                          index === currentImageIndex
                            ? "bg-white"
                            : "bg-white/50"
                        }`}
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-tierra-media">
          <span>{formatDate(date)}</span>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-coral-suave" />
            <span>Testimonial verificado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
