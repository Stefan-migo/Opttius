"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Tag, Eye, Plus } from "lucide-react";
import { useBranch } from "@/hooks/useBranch";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import ProductListingSection from "./sections/ProductListingSection";
import CategoriesManagementSection from "./sections/CategoriesManagementSection";
import QuickActions from "./components/QuickActions";
import { useProductStats } from "./hooks/useProductStats";
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

  const { stats } = useProductStats({
    currentBranchId,
    isGlobalView,
    isSuperAdmin,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header - multi-row layout */}
      <div className="flex flex-col gap-4 sm:gap-6 pb-6 border-b border-admin-border-primary/20">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-4xl font-display font-bold text-admin-text-primary tracking-tight uppercase">
            Control de Inventario
          </h1>
          <p className="text-[9px] sm:text-[10px] font-serif italic text-admin-text-tertiary uppercase tracking-[0.2em] sm:tracking-[0.3em] mt-1">
            Gestión de Catálogo y Registro de Existencias
          </p>
        </div>
        <div className="flex justify-end">
          {activeTab === "products" && (
            <Button
              onClick={() => router.push("/admin/products/add")}
              className="h-10 sm:h-11 px-4 sm:px-8 bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-premium-sm flex items-center gap-2 border border-admin-accent-secondary/20"
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              Agregar producto
            </Button>
          )}
          {activeTab === "lens-families" && (
            <Button
              onClick={() => router.push("/admin/lens-families/new")}
              className="h-10 sm:h-11 px-4 sm:px-8 bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-premium-sm flex items-center gap-2 border border-admin-accent-secondary/20"
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              Nueva Familia Óptica
            </Button>
          )}
          {activeTab === "contact-lens-families" && (
            <Button
              onClick={() => router.push("/admin/contact-lens-families/new")}
              className="h-10 sm:h-11 px-4 sm:px-8 bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-premium-sm flex items-center gap-2 border border-admin-accent-secondary/20"
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              Nueva Familia Contacto
            </Button>
          )}
        </div>
      </div>

      {/* Quick Actions - Comandos de Administración (solo en tab productos) */}
      {activeTab === "products" && (
        <QuickActions
          onShowLowStock={() =>
            router.replace("/admin/products?filter=low_stock", {
              scroll: false,
            })
          }
          onShowCategories={() =>
            router.replace("/admin/products?tab=categories", {
              scroll: false,
            })
          }
          hasLowStock={stats.lowStockCount > 0}
          lowStockCount={stats.lowStockCount}
        />
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
        <TabsList className="flex items-center bg-transparent border-b border-admin-border-primary/20 w-full justify-start rounded-xl h-auto p-0 gap-2 sm:gap-4 md:gap-8 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger
            value="products"
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
          >
            Productos
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
          >
            Categorías
          </TabsTrigger>
          <TabsTrigger
            value="lens-families"
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
          >
            Oftálmicos
          </TabsTrigger>
          <TabsTrigger
            value="contact-lens-families"
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
          >
            Contactología
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
