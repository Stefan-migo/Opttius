"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Tag } from "lucide-react";
import { useBranch } from "@/hooks/useBranch";
import { BranchSelector } from "@/components/admin/BranchSelector";
import ProductListingSection from "./sections/ProductListingSection";
import CategoriesManagementSection from "./sections/CategoriesManagementSection";
import LensFamiliesList from "@/components/admin/lenses/LensFamiliesList";

export default function ProductsPage() {
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  // Tabs management state
  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "lens-families"
  >("products");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-azul-profundo">
          Gestión de Productos
        </h1>
        <p className="text-tierra-media">
          Administra tu catálogo de productos y categorías
        </p>
      </div>

      {/* Branch Selector */}
      {(isSuperAdmin || (branches && branches.length > 1)) && (
        <Card className="bg-admin-bg-tertiary">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sucursal de Trabajo</p>
                <p className="text-xs text-tierra-media mt-1">
                  {isSuperAdmin
                    ? "Selecciona la sucursal para ver y gestionar productos"
                    : "Selecciona la sucursal para gestionar productos"}
                </p>
              </div>
              <BranchSelector />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Warning if no branch selected */}
      {!currentBranchId && !isSuperAdmin && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-600" />
              <p className="text-sm text-amber-800">
                Debes seleccionar una sucursal para ver y gestionar productos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs for Products, Categories, and Lens Families */}
      <Tabs
        value={activeTab}
        onValueChange={(value) =>
          setActiveTab(
            value as "products" | "categories" | "lens-families"
          )
        }
        className="w-full"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-3">
          <TabsTrigger value="products">
            <Package className="h-4 w-4 mr-2" />
            Productos
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-4 w-4 mr-2" />
            Categorías
          </TabsTrigger>
          <TabsTrigger value="lens-families">
            <Tag className="h-4 w-4 mr-2" />
            Familias de Lentes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="space-y-6 mt-6">
          <ProductListingSection
            currentBranchId={currentBranchId}
            isSuperAdmin={isSuperAdmin}
            isGlobalView={isGlobalView}
            branches={branches}
          />
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-6">
          <CategoriesManagementSection />
        </TabsContent>

        <TabsContent value="lens-families" className="space-y-6 mt-6">
          <LensFamiliesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}