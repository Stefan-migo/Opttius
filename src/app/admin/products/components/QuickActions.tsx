"use client";

import { AlertTriangle, Package, Plus, Settings } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
      {/* Agregar Nuevo Producto */}
      <Card className="group cursor-pointer transition-shadow duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-lg overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <Link className="block" href="/admin/products/add">
            <div className="flex flex-col items-center justify-center text-center space-y-1.5 sm:space-y-2 min-h-[64px] sm:min-h-[80px]">
              <div className="p-2 sm:p-3 bg-epoch-primary/5 border border-epoch-primary/10 transition-transform group-hover:scale-110">
                <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-epoch-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-display font-bold text-epoch-primary uppercase tracking-wider">
                  Nuevo Producto
                </p>
                <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary mt-0.5 sm:mt-1">
                  Agregar
                </p>
              </div>
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* Ver Stock Bajo */}
      <Card
        className="group cursor-pointer transition-shadow duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-lg overflow-hidden"
        onClick={onShowLowStock}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col items-center justify-center text-center space-y-1.5 sm:space-y-2 min-h-[64px] sm:min-h-[80px]">
            <div className="p-2 sm:p-3 bg-admin-error/5 border border-admin-error/10 transition-transform group-hover:scale-110">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-admin-error" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-display font-bold text-admin-error uppercase tracking-wider">
                Stock Bajo
              </p>
              {hasLowStock && lowStockCount > 0 && (
                <p className="text-[9px] sm:text-[10px] font-bold text-admin-error/80 mt-0.5 sm:mt-1">
                  {lowStockCount} productos
                </p>
              )}
              <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary mt-0.5 sm:mt-1">
                Ver
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gestión de Categorías */}
      <Card
        className="group cursor-pointer transition-shadow duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-lg overflow-hidden"
        onClick={onShowCategories}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col items-center justify-center text-center space-y-1.5 sm:space-y-2 min-h-[64px] sm:min-h-[80px]">
            <div className="p-2 sm:p-3 bg-epoch-primary/5 border border-epoch-primary/10 transition-transform group-hover:scale-110">
              <Package className="h-5 w-5 sm:h-6 sm:w-6 text-epoch-primary" />
            </div>
            <div>
              <p className="text-xs sm:text-sm font-display font-bold text-epoch-primary uppercase tracking-wider">
                Categorías
              </p>
              <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary mt-0.5 sm:mt-1">
                Gestionar
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opciones de Producto */}
      <Card className="group cursor-pointer transition-shadow duration-300 border border-admin-border-primary/20 bg-admin-bg-tertiary/50 rounded-xl shadow-none hover:shadow-lg overflow-hidden">
        <CardContent className="p-3 sm:p-4">
          <Link className="block" href="/admin/products/options">
            <div className="flex flex-col items-center justify-center text-center space-y-1.5 sm:space-y-2 min-h-[64px] sm:min-h-[80px]">
              <div className="p-2 sm:p-3 bg-epoch-primary/5 border border-epoch-primary/10 transition-transform group-hover:scale-110">
                <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-epoch-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-display font-bold text-epoch-primary uppercase tracking-wider">
                  Opciones
                </p>
                <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary mt-0.5 sm:mt-1">
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
