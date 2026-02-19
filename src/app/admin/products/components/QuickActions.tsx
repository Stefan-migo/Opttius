"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, AlertTriangle, Package, Settings } from "lucide-react";

interface QuickActionsProps {
  onShowLowStock: () => void;
  onShowCategories?: () => void;
  hasLowStock: boolean;
  lowStockCount?: number;
}

export default function QuickActions({
  onShowLowStock,
  onShowCategories,
  hasLowStock,
  lowStockCount = 0,
}: QuickActionsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Agregar Nuevo Producto */}
      <Card className="group cursor-pointer transition-all duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary hover:border-admin-accent-primary/30 overflow-hidden">
        <CardContent className="p-4">
          <Link href="/admin/products/add" className="block">
            <div className="flex flex-col items-center justify-center text-center space-y-2 min-h-[80px]">
              <div className="p-3 bg-epoch-primary/5 border border-epoch-primary/10 transition-transform group-hover:scale-110">
                <Plus className="h-6 w-6 text-epoch-primary" />
              </div>
              <div>
                <p className="text-sm font-display font-bold text-epoch-primary uppercase tracking-wider">
                  Nuevo Producto
                </p>
                <p className="text-[10px] font-serif italic text-admin-text-tertiary mt-1">
                  Agregar producto
                </p>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Ver Stock Bajo */}
      <Card
        className="group cursor-pointer transition-all duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary hover:border-admin-error/30 overflow-hidden"
        onClick={onShowLowStock}
      >
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center text-center space-y-2 min-h-[80px]">
            <div className="p-3 bg-admin-error/5 border border-admin-error/10 transition-transform group-hover:scale-110">
              <AlertTriangle className="h-6 w-6 text-admin-error" />
            </div>
            <div>
              <p className="text-sm font-display font-bold text-admin-error uppercase tracking-wider">
                Stock Bajo
              </p>
              {hasLowStock && lowStockCount > 0 && (
                <p className="text-[10px] font-bold text-admin-error/80 mt-1">
                  {lowStockCount} productos
                </p>
              )}
              <p className="text-[10px] font-serif italic text-admin-text-tertiary mt-1">
                Ver productos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Categorías */}
      <Card
        className="group cursor-pointer transition-all duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary hover:border-admin-accent-primary/30 overflow-hidden"
        onClick={onShowCategories}
      >
        <CardContent className="p-4">
          <div className="flex flex-col items-center justify-center text-center space-y-2 min-h-[80px]">
            <div className="p-3 bg-epoch-primary/5 border border-epoch-primary/10 transition-transform group-hover:scale-110">
              <Package className="h-6 w-6 text-epoch-primary" />
            </div>
            <div>
              <p className="text-sm font-display font-bold text-epoch-primary uppercase tracking-wider">
                Categorías
              </p>
              <p className="text-[10px] font-serif italic text-admin-text-tertiary mt-1">
                Gestionar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opciones de Producto */}
      <Card className="group cursor-pointer transition-all duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-none shadow-none hover:bg-admin-bg-secondary hover:border-admin-accent-primary/30 overflow-hidden">
        <CardContent className="p-4">
          <Link href="/admin/products/options" className="block">
            <div className="flex flex-col items-center justify-center text-center space-y-2 min-h-[80px]">
              <div className="p-3 bg-epoch-primary/5 border border-epoch-primary/10 transition-transform group-hover:scale-110">
                <Settings className="h-6 w-6 text-epoch-primary" />
              </div>
              <div>
                <p className="text-sm font-display font-bold text-epoch-primary uppercase tracking-wider">
                  Opciones
                </p>
                <p className="text-[10px] font-serif italic text-admin-text-tertiary mt-1">
                  Configurar
                </p>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
