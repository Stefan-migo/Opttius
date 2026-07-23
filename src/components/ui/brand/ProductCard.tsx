"use client";

import { Heart } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { memo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLike } from "@/contexts/LikeContext";
import { cn } from "@/lib/utils";

import { ProductCardDesktopContent, ProductCardMobileContent } from "./_components/ProductCardContent";
import { cardVariants, lineThemeClasses } from "./_components/ProductCardTheme";

interface ProductCardProps {
  id: string; name: string; description: string; price: number; originalPrice?: number;
  category: string; imageUrl: string; rating: number; isNatural?: boolean; isNew?: boolean;
  isOnSale?: boolean; stock: number; size?: string; className?: string;
  variant?: "default" | "elegant" | "artisanal" | "glass";
  lineTheme?: "alma-terra" | "ecos" | "jade-ritual" | "umbral" | "utopica" | "default";
  onAddToCart?: (productId: string, quantity: number) => void;
}

function ProductCard({ id, name, description, price, originalPrice, category, imageUrl, rating, isNatural = true, isNew = false, isOnSale = false, stock, size, className = "", variant = "default", lineTheme = "default", onAddToCart }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1);
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { toggleLike, isLiked, isLoading: likeLoading } = useLike();
  const theme = lineThemeClasses[lineTheme];

  return (
    <Card className={cn("group relative overflow-hidden transition-all duration-500 h-full flex flex-col hover:shadow-xl", cardVariants[variant], className)} style={{ pointerEvents: "auto" }} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div className="relative flex-1 flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-bg-light to-bg-cream">
          {!imageLoaded && <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />}
          <Image fill alt={name} className={cn("object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-105", imageLoaded ? "opacity-100" : "opacity-0")} src={imageUrl && !imageUrl.startsWith("file://") ? imageUrl : "/images/placeholder-product.jpg"} onError={() => setImageLoaded(true)} onLoad={() => setImageLoaded(true)} />
          <div className="absolute top-2 right-2 z-20"><Heart className={cn("h-4 w-4 lg:h-5 lg:w-5 cursor-pointer transition-all duration-300 hover:scale-110", isLiked(id) ? "fill-red-500 text-red-500" : "text-white/80 hover:text-red-500 hover:fill-red-500", likeLoading && "opacity-50")} onClick={async () => await toggleLike(id)} /></div>
          <div className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 z-10", isHovered ? "opacity-100" : "opacity-0")}>
            <Link className="block" href={`/productos/${id}`}><div className="bg-white/90 text-gray-800 px-3 py-2 lg:px-6 lg:py-3 rounded-lg font-semibold shadow-lg hover:bg-white hover:scale-105 transition-all duration-300 text-xs lg:text-sm">Ver producto</div></Link>
          </div>
          {stock <= 5 && stock > 0 && <div className="hidden lg:block absolute bottom-2 left-2 lg:bottom-3 lg:left-3"><Badge className="bg-white/95 text-orange-600 border-orange-300 shadow-md backdrop-blur-sm animate-pulse-gentle text-xs px-1.5 py-0.5 lg:text-sm lg:px-2 lg:py-1" variant="outline">¡Solo {stock} disponibles!</Badge></div>}
          {stock === 0 && <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm pointer-events-none"><Badge className="bg-white text-gray-800 shadow-xl px-4 py-2 text-base" variant="secondary">Sin Stock</Badge></div>}
        </div>
        <CardContent className="p-2 flex-1 flex flex-col" padding="none">
          <ProductCardDesktopContent description={description} id={id} isNatural={isNatural} isNew={isNew} isOnSale={isOnSale} name={name} originalPrice={originalPrice} price={price} quantity={quantity} rating={rating} size={size} stock={stock} theme={theme} onAddToCart={() => { if (onAddToCart && stock > 0) { onAddToCart(id, quantity); setQuantity(1); }}} onQuantityChange={setQuantity} />
          <ProductCardMobileContent description={description} id={id} isNatural={isNatural} isNew={isNew} isOnSale={isOnSale} name={name} originalPrice={originalPrice} price={price} quantity={quantity} rating={rating} size={size} stock={stock} theme={theme} onAddToCart={() => { if (onAddToCart && stock > 0) { onAddToCart(id, quantity); setQuantity(1); }}} onQuantityChange={setQuantity} />
        </CardContent>
      </div>
    </Card>
  );
}

export default memo(ProductCard, (prevProps, nextProps) =>
  prevProps.id === nextProps.id && prevProps.name === nextProps.name && prevProps.description === nextProps.description &&
  prevProps.price === nextProps.price && prevProps.originalPrice === nextProps.originalPrice && prevProps.category === nextProps.category &&
  prevProps.imageUrl === nextProps.imageUrl && prevProps.rating === nextProps.rating && prevProps.isNatural === nextProps.isNatural &&
  prevProps.isNew === nextProps.isNew && prevProps.isOnSale === nextProps.isOnSale && prevProps.stock === nextProps.stock &&
  prevProps.size === nextProps.size && prevProps.className === nextProps.className && prevProps.variant === nextProps.variant &&
  prevProps.lineTheme === nextProps.lineTheme && prevProps.onAddToCart === nextProps.onAddToCart,
);
