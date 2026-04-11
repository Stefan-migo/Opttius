"use client";

import {
  Heart,
  Leaf,
  Minus,
  Plus,
  ShoppingCart,
  Sparkles,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import RichTextDisplay from "@/components/ui/RichTextDisplay";
import { useLike } from "@/contexts/LikeContext";
import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  imageUrl: string;
  rating: number;
  isNatural?: boolean;
  isNew?: boolean;
  isOnSale?: boolean;
  stock: number;
  size?: string;
  className?: string;
  variant?: "default" | "elegant" | "artisanal" | "glass";
  lineTheme?:
    | "alma-terra"
    | "ecos"
    | "jade-ritual"
    | "umbral"
    | "utopica"
    | "default";
  onAddToCart?: (productId: string, quantity: number) => void;
}

const cardVariants = {
  default: "bg-white border-border",
  elegant:
    "bg-gradient-to-br from-[#f6fbd6] to-[white] border-gold-200 shadow-elegant",
  artisanal: "bg-cream border-earth-200 shadow-artisanal",
  glass: "bg-white/80 backdrop-blur-md border-white/20 shadow-glass",
};

const lineThemeClasses = {
  "alma-terra": {
    accent: "text-alma-primary",
    badge: "bg-alma-primary/10 text-alma-primary border-alma-primary/20",
    button: "bg-alma-primary hover:bg-alma-primary/90 text-white",
    star: "fill-alma-secondary text-alma-secondary",
  },
  ecos: {
    accent: "text-ecos-primary",
    badge: "bg-ecos-primary/10 text-ecos-primary border-ecos-primary/20",
    button: "bg-ecos-primary hover:bg-ecos-primary/90 text-white",
    star: "fill-ecos-secondary text-ecos-secondary",
  },
  "jade-ritual": {
    accent: "text-jade-primary",
    badge: "bg-jade-primary/10 text-jade-primary border-jade-primary/20",
    button: "bg-jade-primary hover:bg-jade-primary/90 text-white",
    star: "fill-jade-secondary text-jade-secondary",
  },
  umbral: {
    accent: "text-umbral-primary",
    badge: "bg-umbral-primary/10 text-umbral-primary border-umbral-primary/20",
    button: "bg-umbral-primary hover:bg-umbral-primary/90 text-white",
    star: "fill-umbral-secondary text-umbral-secondary",
  },
  utopica: {
    accent: "text-utopica-primary",
    badge:
      "bg-utopica-primary/10 text-utopica-primary border-utopica-primary/20",
    button: "bg-utopica-primary hover:bg-utopica-primary/90 text-white",
    star: "fill-utopica-secondary text-utopica-secondary",
  },
  default: {
    accent: "text-brand-primary",
    badge: "bg-brand-primary/10 text-brand-primary border-brand-primary/20",
    button: "bg-brand-primary hover:bg-brand-primary/90 text-white",
    star: "fill-gold-500 text-gold-500",
  },
};

function ProductCard({
  id,
  name,
  description,
  price,
  originalPrice,
  category,
  imageUrl,
  rating,
  isNatural = true,
  isNew = false,
  isOnSale = false,
  stock,
  size,
  className = "",
  variant = "default",
  lineTheme = "default",
  onAddToCart,
}: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Use LikeContext for like functionality
  const { toggleLike, isLiked, isLoading: likeLoading } = useLike();
  const isFavorite = isLiked(id);

  const theme = lineThemeClasses[lineTheme];

  const handleAddToCart = () => {
    console.log("Add to cart clicked for product:", id, "quantity:", quantity);
    if (onAddToCart && stock > 0) {
      onAddToCart(id, quantity);
      // Reset quantity to 1 after adding to cart
      setQuantity(1);
    }
  };

  const handleToggleFavorite = async () => {
    console.log("Toggle favorite clicked for product:", id);
    await toggleLike(id);
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
        className={`h-4 w-4 transition-colors ${
          index < Math.floor(rating) ? theme.star : "text-gray-300"
        }`}
        key={index}
      />
    ));
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-500 h-full flex flex-col",
        "hover:shadow-xl",
        cardVariants[variant],
        className,
      )}
      style={{ pointerEvents: "auto" }}
      onClick={() => console.log("Card clicked for product:", id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative flex-1 flex flex-col">
        {/* Product Image */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-bg-light to-bg-cream">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
          )}
          <Image
            fill
            alt={name}
            className={cn(
              "object-cover transition-all duration-700",
              "group-hover:scale-110 group-hover:brightness-105",
              imageLoaded ? "opacity-100" : "opacity-0",
            )}
            src={
              imageUrl && !imageUrl.startsWith("file://")
                ? imageUrl
                : "/images/placeholder-product.jpg"
            }
            onError={() => setImageLoaded(true)}
            onLoad={() => setImageLoaded(true)}
          />

          {/* Like Button - Just heart icon, no button wrapper */}
          <div className="absolute top-2 right-2 z-20">
            <Heart
              className={cn(
                "h-4 w-4 lg:h-5 lg:w-5 cursor-pointer transition-all duration-300 hover:scale-110",
                isFavorite
                  ? "fill-red-500 text-red-500"
                  : "text-white/80 hover:text-red-500 hover:fill-red-500",
                likeLoading && "opacity-50",
              )}
              onClick={handleToggleFavorite}
            />
          </div>

          {/* Hover Overlay - Ver Producto - Responsive size */}
          <div
            className={cn(
              "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 z-10",
              isHovered ? "opacity-100" : "opacity-0",
            )}
          >
            <Link className="block" href={`/productos/${id}`}>
              <div className="bg-white/90 text-gray-800 px-3 py-2 lg:px-6 lg:py-3 rounded-lg font-semibold shadow-lg hover:bg-white hover:scale-105 transition-all duration-300 text-xs lg:text-sm">
                Ver producto
              </div>
            </Link>
          </div>

          {/* Stock Warning - Only show on desktop */}
          {stock <= 5 && stock > 0 && (
            <div className="hidden lg:block absolute bottom-2 left-2 lg:bottom-3 lg:left-3">
              <Badge
                className="bg-white/95 text-orange-600 border-orange-300 shadow-md backdrop-blur-sm animate-pulse-gentle text-xs px-1.5 py-0.5 lg:text-sm lg:px-2 lg:py-1"
                variant="outline"
              >
                ¡Solo {stock} disponibles!
              </Badge>
            </div>
          )}

          {stock === 0 && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm pointer-events-none">
              <Badge
                className="bg-white text-gray-800 shadow-xl px-4 py-2 text-base"
                variant="secondary"
              >
                Sin Stock
              </Badge>
            </div>
          )}
        </div>

        {/* Product Info */}
        <CardContent className="p-2 flex-1 flex flex-col" padding="none">
          {/* Desktop Layout */}
          <div className="hidden lg:flex lg:flex-col lg:h-full lg:justify-between">
            {/* Top Content */}
            <div className="space-y-4">
              {/* Badges - Below image like MercadoLibre */}
              <div className="flex flex-wrap gap-1">
                {isOnSale && (
                  <Badge
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md text-sm px-2 py-1"
                    variant="destructive"
                  >
                    <span className="font-bold">OFERTA DEL DÍA</span>
                  </Badge>
                )}
                {isNew && (
                  <Badge
                    className={cn(
                      theme.badge,
                      "font-semibold shadow-md animate-pulse-gentle text-sm px-2 py-1",
                    )}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Nuevo
                  </Badge>
                )}
                {isNatural && (
                  <Badge
                    className="bg-green-100 text-green-800 border-green-200 shadow-md text-sm px-2 py-1"
                    variant="secondary"
                  >
                    <Leaf className="h-3 w-3 mr-1" />
                    Natural
                  </Badge>
                )}
              </div>

              {/* Name */}
              <div className="space-y-3">
                <Link className="block group/link" href={`/productos/${id}`}>
                  <h3
                    className="font-normal text-lg text-text-primary line-clamp-2 group-hover/link:text-brand-primary transition-colors duration-300 leading-tight"
                    style={{
                      fontFamily: "VELISTA, var(--font-velista), serif",
                      fontWeight: "normal",
                      fontStyle: "normal",
                    }}
                  >
                    {name}
                  </h3>
                </Link>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {renderStars(rating)}
                </div>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className={cn("text-xl font-bold", theme.accent)}>
                    {formatPrice(price)}
                  </span>
                  {originalPrice && originalPrice > price && (
                    <span className="text-sm text-text-secondary line-through">
                      {formatPrice(originalPrice)}
                    </span>
                  )}
                </div>
                {originalPrice && originalPrice > price && (
                  <div className="text-sm text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md inline-block">
                    Ahorrás {formatPrice(originalPrice - price)}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
                <RichTextDisplay
                  className="text-sm text-text-secondary line-clamp-2 leading-relaxed [&_strong]:font-semibold [&_em]:italic [&_u]:underline [&_p]:m-0 [&_p]:p-0"
                  content={description}
                />
              </div>

              {/* Size */}
              {size && (
                <div className="flex items-center text-xs text-text-secondary">
                  <Sparkles className="h-3 w-3 mr-1 text-gold-500" />
                  <span className="font-medium">{size}</span>
                </div>
              )}
            </div>

            {/* Bottom Content - Always at bottom */}
            <div className="mt-auto pt-4">
              {/* Desktop Add to Cart */}
              <div className="space-y-3 w-full">
                {stock > 0 && (
                  <div className="flex items-center gap-2">
                    {/* Desktop: Full quantity selector */}
                    <div className="flex items-center border border-border rounded-lg bg-white shadow-sm">
                      <Button
                        className="h-9 w-9 p-0 hover:bg-gray-50 rounded-l-lg disabled:opacity-50"
                        disabled={quantity <= 1}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          console.log(
                            "Minus clicked, current quantity:",
                            quantity,
                          );
                          setQuantity(Math.max(1, quantity - 1));
                        }}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="px-4 py-2 text-sm min-w-[3rem] text-center font-medium">
                        {quantity}
                      </span>
                      <Button
                        className="h-9 w-9 p-0 hover:bg-gray-50 rounded-r-lg disabled:opacity-50"
                        disabled={quantity >= stock}
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          console.log(
                            "Plus clicked, current quantity:",
                            quantity,
                            "stock:",
                            stock,
                          );
                          setQuantity(Math.min(stock, quantity + 1));
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Desktop: Add button */}
                    <Button
                      className={cn(
                        "flex-1 font-semibold shadow-md transition-all duration-300",
                        "hover:shadow-lg hover:scale-105 active:scale-95",
                        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                        "text-sm h-9",
                        theme.button,
                      )}
                      disabled={stock === 0}
                      size="sm"
                      onClick={handleAddToCart}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {stock > 0 ? "Agregar al carrito" : "Sin Stock"}
                    </Button>
                  </div>
                )}

                {stock === 0 && (
                  <Button
                    disabled
                    className="w-full opacity-60 h-9"
                    size="sm"
                    variant="secondary"
                  >
                    Sin Stock
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout - Flex column with justify-between */}
          <div className="lg:hidden flex flex-col justify-between min-h-[200px]">
            {/* Top Content */}
            <div className="space-y-1">
              {/* Badges - Smaller on mobile */}
              <div className="flex flex-wrap gap-1">
                {isOnSale && (
                  <Badge
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md text-[10px] px-1 py-0.5"
                    variant="destructive"
                  >
                    <span className="font-bold">OFERTA DEL DÍA</span>
                  </Badge>
                )}
                {isNew && (
                  <Badge
                    className={cn(
                      theme.badge,
                      "font-semibold shadow-md animate-pulse-gentle text-[10px] px-1 py-0.5",
                    )}
                  >
                    <Sparkles className="h-1.5 w-1.5 mr-0.5" />
                    Nuevo
                  </Badge>
                )}
                {isNatural && (
                  <Badge
                    className="bg-green-100 text-green-800 border-green-200 shadow-md text-[10px] px-1 py-0.5"
                    variant="secondary"
                  >
                    <Leaf className="h-1.5 w-1.5 mr-0.5" />
                    Natural
                  </Badge>
                )}
              </div>

              {/* Name - Smaller, Left aligned */}
              <Link className="block group/link" href={`/productos/${id}`}>
                <h3
                  className="font-normal text-sm text-text-primary line-clamp-2 group-hover/link:text-brand-primary transition-colors duration-300 leading-tight text-left"
                  style={{
                    fontFamily: "VELISTA, var(--font-velista), serif",
                    fontWeight: "normal",
                    fontStyle: "normal",
                  }}
                >
                  {name}
                </h3>
              </Link>

              {/* Rating - Compact, Left aligned */}
              <div className="flex items-center gap-1 text-left">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, index) => (
                    <Star
                      className={`h-2.5 w-2.5 transition-colors ${
                        index < Math.floor(rating)
                          ? theme.star
                          : "text-gray-300"
                      }`}
                      key={index}
                    />
                  ))}
                </div>
              </div>

              {/* Price - Prominent, Left aligned */}
              <div className="flex items-center gap-2 text-left">
                <span className={cn("text-base font-bold", theme.accent)}>
                  {formatPrice(price)}
                </span>
                {originalPrice && originalPrice > price && (
                  <span className="text-xs text-text-secondary line-through">
                    {formatPrice(originalPrice)}
                  </span>
                )}
              </div>

              {/* Low Stock Alert - Mobile only */}
              {stock <= 5 && stock > 0 && (
                <div>
                  <Badge
                    className="bg-orange-50 text-orange-600 border-orange-300 text-[10px] px-1 py-0.5"
                    variant="outline"
                  >
                    ¡Solo {stock} disponibles!
                  </Badge>
                </div>
              )}
            </div>

            {/* Bottom Content - Always at bottom */}
            <div className="mt-auto pt-2">
              {stock > 0 ? (
                <Button
                  className={cn(
                    "w-full font-semibold shadow-md transition-all duration-300",
                    "hover:shadow-lg hover:scale-105 active:scale-95",
                    "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                    "text-xs h-7",
                    theme.button,
                  )}
                  disabled={stock === 0}
                  size="sm"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Agregar
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full opacity-60 h-7"
                  size="sm"
                  variant="secondary"
                >
                  Sin Stock
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

// Memoize ProductCard to prevent unnecessary re-renders
// Only re-render if props actually change
export default memo(ProductCard, (prevProps, nextProps) => {
  // Compare all props that affect rendering
  return (
    prevProps.id === nextProps.id &&
    prevProps.name === nextProps.name &&
    prevProps.description === nextProps.description &&
    prevProps.price === nextProps.price &&
    prevProps.originalPrice === nextProps.originalPrice &&
    prevProps.category === nextProps.category &&
    prevProps.imageUrl === nextProps.imageUrl &&
    prevProps.rating === nextProps.rating &&
    prevProps.isNatural === nextProps.isNatural &&
    prevProps.isNew === nextProps.isNew &&
    prevProps.isOnSale === nextProps.isOnSale &&
    prevProps.stock === nextProps.stock &&
    prevProps.size === nextProps.size &&
    prevProps.className === nextProps.className &&
    prevProps.variant === nextProps.variant &&
    prevProps.lineTheme === nextProps.lineTheme &&
    prevProps.onAddToCart === nextProps.onAddToCart
  );
});
