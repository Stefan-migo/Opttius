"use client";

import {
  ArrowRight,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Star,
  Users,
  Video,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ServiceCardProps {
  id: string;
  title: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  imageUrl: string;
  rating: number;
  location: "online" | "presencial" | "ambos";
  groupSize: "individual" | "grupal" | "ambos";
  features: string[];
  isPopular?: boolean;
  nextAvailableDate?: string;
  therapistName?: string;
  className?: string;
  onBookSession?: (serviceId: string) => void;
}

export default function ServiceCard({
  id,
  title,
  description,
  price,
  duration,
  category,
  imageUrl,
  rating,
  location,
  groupSize,
  features,
  isPopular = false,
  nextAvailableDate,
  therapistName,
  className = "",
  onBookSession,
}: ServiceCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleBookSession = () => {
    if (onBookSession) {
      onBookSession(id);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount);
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

  const getLocationIcon = () => {
    switch (location) {
      case "online":
        return <Video className="h-4 w-4 text-turquesa-claro" />;
      case "presencial":
        return <MapPin className="h-4 w-4 text-verde-suave" />;
      case "ambos":
        return <Users className="h-4 w-4 text-azul-profundo" />;
      default:
        return <MapPin className="h-4 w-4 text-verde-suave" />;
    }
  };

  const getLocationText = () => {
    switch (location) {
      case "online":
        return "Online";
      case "presencial":
        return "Presencial";
      case "ambos":
        return "Online & Presencial";
      default:
        return "Presencial";
    }
  };

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        {/* Service Image */}
        <div className="relative h-48 overflow-hidden bg-verde-suave/10">
          <Image
            fill
            alt={title}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            src={imageUrl}
          />

          {/* Popular Badge */}
          {isPopular && (
            <div className="absolute top-4 left-4">
              <Badge className="bg-dorado text-azul-profundo font-semibold">
                <Heart className="h-3 w-3 mr-1" />
                Más Popular
              </Badge>
            </div>
          )}

          {/* Service Details Overlay */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1 text-tierra-media">
                    <Clock className="h-4 w-4" />
                    <span>{duration}</span>
                  </div>
                  <div className="flex items-center gap-1 text-tierra-media">
                    {getLocationIcon()}
                    <span>{getLocationText()}</span>
                  </div>
                </div>
                <div className="text-lg font-bold text-azul-profundo">
                  {formatPrice(price)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Service Content */}
        <CardContent className="p-6 space-y-4">
          {/* Category and Rating */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-tierra-media uppercase tracking-wide">
              {category}
            </div>
            <div className="flex items-center gap-1">
              <div className="flex items-center">{renderStars(rating)}</div>
            </div>
          </div>

          {/* Title */}
          <Link href={`/servicios/${id}` as unknown}>
            <h3 className="text-xl font-semibold text-azul-profundo line-clamp-2 hover:text-azul-profundo/80 transition-colors">
              {title}
            </h3>
          </Link>

          {/* Description */}
          <p className="text-tierra-media line-clamp-3">{description}</p>

          {/* Features */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-azul-profundo">
              ¿Qué incluye?
            </h4>
            <ul className="space-y-1">
              {features.slice(0, 3).map((feature, index) => (
                <li
                  className="text-sm text-tierra-media flex items-center gap-2"
                  key={index}
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-dorado" />
                  {feature}
                </li>
              ))}
              {features.length > 3 && (
                <li className="text-sm text-azul-profundo font-medium">
                  + {features.length - 3} beneficios más
                </li>
              )}
            </ul>
          </div>

          {/* Therapist */}
          {therapistName && (
            <div className="flex items-center gap-2 text-sm text-tierra-media">
              <div className="h-8 w-8 rounded-full bg-dorado/20 flex items-center justify-center">
                <Heart className="h-4 w-4 text-azul-profundo" />
              </div>
              <span>Con {therapistName}</span>
            </div>
          )}

          {/* Group Size */}
          <div className="flex items-center gap-2 text-sm text-tierra-media">
            <Users className="h-4 w-4" />
            <span>
              {groupSize === "individual" && "Sesión Individual"}
              {groupSize === "grupal" && "Sesión Grupal"}
              {groupSize === "ambos" && "Individual o Grupal"}
            </span>
          </div>

          {/* Next Available Date */}
          {nextAvailableDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-verde-suave" />
              <span className="text-tierra-media">
                Próxima fecha:{" "}
                <span className="font-semibold text-azul-profundo">
                  {nextAvailableDate}
                </span>
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              asChild
              className="flex-1 border-azul-profundo text-azul-profundo hover:bg-azul-profundo hover:text-white"
              variant="outline"
            >
              <Link href={`/servicios/${id}` as unknown}>Más Info</Link>
            </Button>
            <Button
              className="flex-1 bg-dorado hover:bg-dorado/90 text-azul-profundo font-semibold"
              onClick={handleBookSession}
            >
              Reservar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}
