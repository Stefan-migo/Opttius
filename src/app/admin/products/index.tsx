"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Tag, Eye, Plus } from "lucide-react";
import { useBranch } from "@/hooks/useBranch";
import { BranchSelector } from "@/components/admin/BranchSelector";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ProductListingSection from "./sections/ProductListingSection";
import CategoriesManagementSection from "./sections/CategoriesManagementSection";
import LensFamiliesList from "@/components/admin/lenses/LensFamiliesList";
import ContactLensFamiliesList from "@/components/admin/lenses/ContactLensFamiliesList";

const VALID_TABS = [
  "products",
  "categories",
  "lens-families",
  "contact-lens-families",
] as const;

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  // Tabs management state - read ?tab= from URL on mount
  const tabParam = searchParams.get("tab");
  const initialTab = VALID_TABS.includes(tabParam as any)
    ? (tabParam as (typeof VALID_TABS)[number])
    : "products";

  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "lens-families" | "contact-lens-families"
  >(initialTab);

  useEffect(() => {
    if (tabParam && VALID_TABS.includes(tabParam as any)) {
      setActiveTab(tabParam as (typeof VALID_TABS)[number]);
    }
  }, [tabParam]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Gestión de Productos
          </h1>
          <p className="text-tierra-media">
            Administra tu catálogo de productos y categorías
          </p>
        </div>
        {activeTab === "products" && (
          <Button onClick={() => router.push("/admin/products/add")}>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Producto
          </Button>
        )}
        {activeTab === "lens-families" && (
          <Button onClick={() => router.push("/admin/lens-families/new")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Familia Óptica
          </Button>
        )}
        {activeTab === "contact-lens-families" && (
          <Button onClick={() => router.push("/admin/contact-lens-families")}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Familia de Contacto
          </Button>
        )}
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

      {/* Tabs for Products, Categories, Lens Families, and Contact Lens Families */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          const tab = value as (typeof VALID_TABS)[number];
          setActiveTab(tab);
          const url =
            tab === "products"
              ? "/admin/products"
              : `/admin/products?tab=${tab}`;
          router.replace(url, { scroll: false });
        }}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-3xl grid-cols-4">
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
            Fam. Lentes Ópticos
          </TabsTrigger>
          <TabsTrigger value="contact-lens-families">
            <Eye className="h-4 w-4 mr-2" />
            Fam. Lentes Contacto
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

        <TabsContent value="contact-lens-families" className="space-y-6 mt-6">
          <ContactLensFamiliesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
