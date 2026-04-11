"use client";

import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  Heart,
  Share2,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface BlogCardProps {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  publishedAt: string;
  mainImage?: {
    asset: {
      url: string;
    };
    alt?: string;
  };
  author: {
    name: string;
    image?: {
      asset: {
        url: string;
      };
    };
  };
  categories?: Array<{
    title: string;
    color?: string;
  }>;
  estimatedReadingTime?: number;
  featured?: boolean;
  className?: string;
  onToggleFavorite?: (postId: string) => void;
  onShare?: (postId: string) => void;
  isFavorite?: boolean;
}

export default function BlogCard({
  id,
  title,
  excerpt,
  slug,
  publishedAt,
  mainImage,
  author,
  categories = [],
  estimatedReadingTime = 5,
  featured = false,
  className = "",
  onToggleFavorite,
  onShare,
  isFavorite = false,
}: BlogCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(id);
  };

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onShare?.(id);
  };

  const getImageUrl = () => {
    if (mainImage?.asset?.url) {
      return mainImage.asset.url;
    }
    // Using a placeholder from a reliable service
    return "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&crop=center";
  };

  const hasValidImage = () => {
    return mainImage?.asset?.url && mainImage.asset.url.trim() !== "";
  };

  const getAuthorImageUrl = () => {
    if (author?.image?.asset?.url) {
      return author.image.asset.url;
    }
    // Using a placeholder for author
    return "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face";
  };

  const hasValidAuthorImage = () => {
    return author?.image?.asset?.url && author.image.asset.url.trim() !== "";
  };

  return (
    <Card
      className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/blog/${slug}`}>
        <div className="relative">
          {/* Blog Image */}
          <div className="relative aspect-[16/10] overflow-hidden bg-verde-suave/10">
            {hasValidImage() ? (
              <Image
                fill
                alt={mainImage?.alt || title}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                src={getImageUrl()}
                onError={(e) => {
                  console.error(
                    "Error loading blog image:",
                    mainImage?.asset?.url,
                  );
                }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-verde-suave/20 to-turquesa-claro/20 flex items-center justify-center">
                <div className="text-center text-tierra-media/60">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <span className="text-sm font-medium">Sin imagen</span>
                </div>
              </div>
            )}

            {/* Featured Badge */}
            {featured && (
              <div className="absolute top-4 left-4">
                <Badge className="bg-dorado text-azul-profundo font-semibold">
                  <BookOpen className="h-3 w-3 mr-1" />
                  Destacado
                </Badge>
              </div>
            )}

            {/* Categories */}
            {categories && categories.length > 0 && (
              <div className="absolute top-4 right-4 flex flex-wrap gap-1">
                {categories.slice(0, 2).map((category, index) => (
                  <Badge
                    className="bg-white/90 text-azul-profundo text-xs"
                    key={index}
                    style={{
                      backgroundColor: category.color
                        ? `${category.color}20`
                        : undefined,
                      color: category.color || undefined,
                    }}
                    variant="secondary"
                  >
                    {category.title}
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick Actions */}
            <div
              className={`absolute bottom-4 right-4 flex gap-2 transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            >
              {onToggleFavorite && (
                <Button
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  size="sm"
                  variant="secondary"
                  onClick={handleToggleFavorite}
                >
                  <Heart
                    className={`h-4 w-4 ${
                      isFavorite
                        ? "fill-coral-suave text-coral-suave"
                        : "text-tierra-media"
                    }`}
                  />
                </Button>
              )}
              {onShare && (
                <Button
                  className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
                  size="sm"
                  variant="secondary"
                  onClick={handleShare}
                >
                  <Share2 className="h-4 w-4 text-tierra-media" />
                </Button>
              )}
            </div>

            {/* Reading Time */}
            <div className="absolute bottom-4 left-4">
              <div className="bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-tierra-media" />
                <span className="text-xs text-tierra-media font-medium">
                  {estimatedReadingTime || 5} min
                </span>
              </div>
            </div>
          </div>

          {/* Blog Content */}
          <CardContent className="p-6">
            {/* Publication Date */}
            <div className="flex items-center gap-2 text-sm text-tierra-media mb-3">
              <Calendar className="h-4 w-4" />
              <span>{formatDate(publishedAt)}</span>
            </div>

            {/* Title */}
            <h3 className="text-xl font-semibold text-azul-profundo line-clamp-2 mb-3 hover:text-azul-profundo/80 transition-colors">
              {title}
            </h3>

            {/* Excerpt */}
            <p className="text-tierra-media line-clamp-3 mb-4 leading-relaxed">
              {excerpt}
            </p>

            {/* Author */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-8 w-8 rounded-full overflow-hidden bg-verde-suave/20">
                  {hasValidAuthorImage() ? (
                    <Image
                      fill
                      alt={author?.name || "Author"}
                      className="object-cover"
                      src={getAuthorImageUrl()}
                      onError={(e) => {
                        console.error(
                          "Error loading author image:",
                          author?.image?.asset?.url,
                        );
                      }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-azul-profundo/20 to-verde-suave/20 flex items-center justify-center">
                      <User className="w-4 h-4 text-tierra-media/60" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-azul-profundo">
                    {author?.name || "Autor desconocido"}
                  </div>
                </div>
              </div>

              {/* Read More */}
              <div className="flex items-center gap-1 text-sm text-azul-profundo group-hover:text-dorado transition-colors">
                <span className="font-medium">Leer más</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </CardContent>
        </div>
      </Link>
    </Card>
  );
}
