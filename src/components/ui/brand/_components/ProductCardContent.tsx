"use client";

import { Leaf, Minus, Plus, ShoppingCart, Sparkles, Star } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import RichTextDisplay from "@/components/ui/RichTextDisplay";
import { cn } from "@/lib/utils";

interface ContentProps {
  id: string; name: string; description: string; price: number; originalPrice?: number;
  rating: number; isNatural: boolean; isNew: boolean; isOnSale: boolean; stock: number; size?: string;
  theme: { accent: string; badge: string; button: string; star: string };
  quantity: number; onQuantityChange: (v: number) => void; onAddToCart: () => void;
}

const formatPrice = (amount: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(amount);

export function ProductCardDesktopContent({ id, name, description, price, originalPrice, rating, isNatural, isNew, isOnSale, stock, size, theme, quantity, onQuantityChange, onAddToCart }: ContentProps) {
  return (
    <div className="hidden lg:flex lg:flex-col lg:h-full lg:justify-between">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1">
          {isOnSale && <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md text-sm px-2 py-1" variant="destructive"><span className="font-bold">OFERTA DEL DÍA</span></Badge>}
          {isNew && <Badge className={cn(theme.badge, "font-semibold shadow-md animate-pulse-gentle text-sm px-2 py-1")}><Sparkles className="h-3 w-3 mr-1" />Nuevo</Badge>}
          {isNatural && <Badge className="bg-green-100 text-green-800 border-green-200 shadow-md text-sm px-2 py-1" variant="secondary"><Leaf className="h-3 w-3 mr-1" />Natural</Badge>}
        </div>
        <div className="space-y-3">
          <Link className="block group/link" href={`/productos/${id}`}><h3 className="font-normal text-lg text-text-primary line-clamp-2 group-hover/link:text-brand-primary transition-colors duration-300 leading-tight" style={{ fontFamily: "VELISTA, var(--font-velista), serif", fontWeight: "normal", fontStyle: "normal" }}>{name}</h3></Link>
        </div>
        <div className="flex items-center gap-3"><div className="flex items-center gap-1">{Array.from({ length: 5 }, (_, i) => <Star className={`h-4 w-4 transition-colors ${i < Math.floor(rating) ? theme.star : "text-gray-300"}`} key={i} />)}</div></div>
        <div className="space-y-2">
          <div className="flex items-center gap-3"><span className={cn("text-xl font-bold", theme.accent)}>{formatPrice(price)}</span>{originalPrice && originalPrice > price && <span className="text-sm text-text-secondary line-through">{formatPrice(originalPrice)}</span>}</div>
          {originalPrice && originalPrice > price && <div className="text-sm text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md inline-block">Ahorrás {formatPrice(originalPrice - price)}</div>}
        </div>
        <div className="text-sm text-text-secondary line-clamp-2 leading-relaxed"><RichTextDisplay className="text-sm text-text-secondary line-clamp-2 leading-relaxed" content={description} /></div>
        {size && <div className="flex items-center text-xs text-text-secondary"><Sparkles className="h-3 w-3 mr-1 text-gold-500" /><span className="font-medium">{size}</span></div>}
      </div>
      <div className="mt-auto pt-4">
        <div className="space-y-3 w-full">
          {stock > 0 ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center border border-border rounded-lg bg-white shadow-sm">
                <Button className="h-9 w-9 p-0 hover:bg-gray-50 rounded-l-lg disabled:opacity-50" disabled={quantity <= 1} size="sm" variant="ghost" onClick={() => onQuantityChange(Math.max(1, quantity - 1))}><Minus className="h-4 w-4" /></Button>
                <span className="px-4 py-2 text-sm min-w-[3rem] text-center font-medium">{quantity}</span>
                <Button className="h-9 w-9 p-0 hover:bg-gray-50 rounded-r-lg disabled:opacity-50" disabled={quantity >= stock} size="sm" variant="ghost" onClick={() => onQuantityChange(Math.min(stock, quantity + 1))}><Plus className="h-4 w-4" /></Button>
              </div>
              <Button className={cn("flex-1 font-semibold shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-sm h-9", theme.button)} disabled={stock === 0} size="sm" onClick={onAddToCart}><ShoppingCart className="h-4 w-4 mr-2" />Agregar al carrito</Button>
            </div>
          ) : <Button disabled className="w-full opacity-60 h-9" size="sm" variant="secondary">Sin Stock</Button>}
        </div>
      </div>
    </div>
  );
}

export function ProductCardMobileContent({ id, name, price, originalPrice, rating, isNatural, isNew, isOnSale, stock, theme, onAddToCart }: ContentProps) {
  return (
    <div className="lg:hidden flex flex-col justify-between min-h-[200px]">
      <div className="space-y-1">
        <div className="flex flex-wrap gap-1">
          {isOnSale && <Badge className="bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md text-[10px] px-1 py-0.5" variant="destructive"><span className="font-bold">OFERTA DEL DÍA</span></Badge>}
          {isNew && <Badge className={cn(theme.badge, "font-semibold shadow-md animate-pulse-gentle text-[10px] px-1 py-0.5")}><Sparkles className="h-1.5 w-1.5 mr-0.5" />Nuevo</Badge>}
          {isNatural && <Badge className="bg-green-100 text-green-800 border-green-200 shadow-md text-[10px] px-1 py-0.5" variant="secondary"><Leaf className="h-1.5 w-1.5 mr-0.5" />Natural</Badge>}
        </div>
        <Link className="block group/link" href={`/productos/${id}`}><h3 className="font-normal text-sm text-text-primary line-clamp-2 group-hover/link:text-brand-primary transition-colors duration-300 leading-tight text-left" style={{ fontFamily: "VELISTA, var(--font-velista), serif", fontWeight: "normal", fontStyle: "normal" }}>{name}</h3></Link>
        <div className="flex items-center gap-1 text-left"><div className="flex items-center gap-0.5">{Array.from({ length: 5 }, (_, i) => <Star className={`h-2.5 w-2.5 transition-colors ${i < Math.floor(rating) ? theme.star : "text-gray-300"}`} key={i} />)}</div></div>
        <div className="flex items-center gap-2 text-left"><span className={cn("text-base font-bold", theme.accent)}>{formatPrice(price)}</span>{originalPrice && originalPrice > price && <span className="text-xs text-text-secondary line-through">{formatPrice(originalPrice)}</span>}</div>
        {stock <= 5 && stock > 0 && <div><Badge className="bg-orange-50 text-orange-600 border-orange-300 text-[10px] px-1 py-0.5" variant="outline">¡Solo {stock} disponibles!</Badge></div>}
      </div>
      <div className="mt-auto pt-2">
        {stock > 0 ? (
          <Button className={cn("w-full font-semibold shadow-md transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-xs h-7", theme.button)} size="sm" onClick={onAddToCart}><ShoppingCart className="h-3 w-3 mr-1" />Agregar</Button>
        ) : <Button disabled className="w-full opacity-60 h-7" size="sm" variant="secondary">Sin Stock</Button>}
      </div>
    </div>
  );
}
