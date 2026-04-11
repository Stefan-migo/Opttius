"use client";

import { Package, Plus, PackagePlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import ContactLensFamiliesList from "@/components/admin/lenses/ContactLensFamiliesList";
import ContactLensInventoryManager from "@/components/admin/lenses/ContactLensInventoryManager";
import LensFamiliesList from "@/components/admin/lenses/LensFamiliesList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useBranch } from "@/hooks/useBranch";

import QuickActions from "./components/QuickActions";
import { useProductStats } from "./hooks/useProductStats";
import CategoriesManagementSection from "./sections/CategoriesManagementSection";
import ProductListingSection from "./sections/ProductListingSection";

const VALID_TABS = [
  "products",
  "categories",
  "lens-families",
  "contact-lens-families",
] as const;

// Sub-tabs for Contactología
const VALID_CONTACT_LENS_SUBTABS = ["families", "inventory"] as const;

type ContactLensSubTab = (typeof VALID_CONTACT_LENS_SUBTABS)[number];

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const isGlobalView = !currentBranchId && isSuperAdmin;

  // Tabs management state - read ?tab= from URL on mount
  const tabParam = searchParams.get("tab");
  const isValidTab = VALID_TABS.includes(
    tabParam as (typeof VALID_TABS)[number],
  );
  const initialTab = isValidTab
    ? (tabParam as (typeof VALID_TABS)[number])
    : "products";

  const [activeTab, setActiveTab] = useState<
    "products" | "categories" | "lens-families" | "contact-lens-families"
  >(initialTab);

  // Sub-tab for Contactología (families or inventory)
  const contactLensSubTabParam = searchParams.get("contactLensSubTab");
  const isValidSubTab = VALID_CONTACT_LENS_SUBTABS.includes(
    contactLensSubTabParam as ContactLensSubTab,
  );
  const initialContactLensSubTab: ContactLensSubTab = isValidSubTab
    ? (contactLensSubTabParam as ContactLensSubTab)
    : "families";

  const [contactLensSubTab, setContactLensSubTab] = useState<ContactLensSubTab>(
    initialContactLensSubTab,
  );

  // Contact lens families for inventory manager
  const [contactLensFamilies, setContactLensFamilies] = useState<
    { id: string; name: string; brand: string | null }[]
  >([]);

  useEffect(() => {
    if (tabParam && isValidTab) {
      setActiveTab(tabParam as (typeof VALID_TABS)[number]);
    }
  }, [tabParam, isValidTab]);

  // Load contact lens families for inventory
  useEffect(() => {
    if (currentBranchId) {
      fetch("/api/admin/contact-lens-families")
        .then((res) => res.json())
        .then((data) => {
          setContactLensFamilies(data.data || data.families || []);
        })
        .catch((err) => console.error("Error loading families:", err));
    }
  }, [currentBranchId]);

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
              className="h-10 sm:h-11 px-4 sm:px-8 bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-premium-sm flex items-center gap-2 border border-admin-accent-secondary/20"
              onClick={() => router.push("/admin/products/add")}
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              Agregar producto
            </Button>
          )}
          {activeTab === "lens-families" && (
            <Button
              className="h-10 sm:h-11 px-4 sm:px-8 bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-premium-sm flex items-center gap-2 border border-admin-accent-secondary/20"
              onClick={() => router.push("/admin/lens-families/new")}
            >
              <Plus className="h-4 w-4 sm:mr-0" />
              Nueva Familia Óptica
            </Button>
          )}
          {activeTab === "contact-lens-families" && (
            <Button
              className="h-10 sm:h-11 px-4 sm:px-8 bg-admin-accent-primary hover:bg-admin-accent-secondary text-[#1A2B23] font-display font-black text-[9px] sm:text-[10px] tracking-[0.2em] uppercase rounded-xl transition-all shadow-premium-sm flex items-center gap-2 border border-admin-accent-secondary/20"
              onClick={() => router.push("/admin/contact-lens-families/new")}
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
          hasLowStock={stats.lowStockCount > 0}
          lowStockCount={stats.lowStockCount}
          onShowCategories={() =>
            router.replace("/admin/products?tab=categories", {
              scroll: false,
            })
          }
          onShowLowStock={() =>
            router.replace("/admin/products?filter=low_stock", {
              scroll: false,
            })
          }
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
        className="w-full"
        value={activeTab}
        onValueChange={(value) => {
          const tab = value as (typeof VALID_TABS)[number];
          setActiveTab(tab);
          // Reset sub-tab when leaving contactología
          if (tab !== "contact-lens-families") {
            setContactLensSubTab("families");
          }
          const url =
            tab === "products"
              ? "/admin/products"
              : tab === "contact-lens-families"
                ? `/admin/products?tab=${tab}&contactLensSubTab=${contactLensSubTab}`
                : `/admin/products?tab=${tab}`;
          router.replace(url, { scroll: false });
        }}
      >
        <TabsList className="flex items-center bg-transparent border-b border-admin-border-primary/20 w-full justify-start rounded-xl h-auto p-0 gap-2 sm:gap-4 md:gap-8 overflow-x-auto overflow-y-hidden min-w-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
            value="products"
          >
            Productos
          </TabsTrigger>
          <TabsTrigger
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
            value="categories"
          >
            Categorías
          </TabsTrigger>
          <TabsTrigger
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
            value="lens-families"
          >
            Oftálmicos
          </TabsTrigger>
          <TabsTrigger
            className="rounded-xl border-b-2 border-transparent data-[state=active]:border-admin-accent-primary data-[state=active]:bg-transparent bg-transparent text-admin-text-tertiary data-[state=active]:text-admin-text-primary px-2 sm:px-0 pb-3 sm:pb-4 font-display font-bold text-[9px] sm:text-[10px] tracking-[0.15em] sm:tracking-[0.2em] uppercase transition-all shrink-0"
            value="contact-lens-families"
          >
            Contactología
          </TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6 mt-6" value="products">
          <ProductListingSection
            branches={branches}
            currentBranchId={currentBranchId}
            isGlobalView={isGlobalView}
            isSuperAdmin={isSuperAdmin}
          />
        </TabsContent>

        <TabsContent className="space-y-6 mt-6" value="categories">
          <CategoriesManagementSection />
        </TabsContent>

        <TabsContent className="space-y-6 mt-6" value="lens-families">
          <LensFamiliesList />
        </TabsContent>

        <TabsContent className="space-y-6 mt-6" value="contact-lens-families">
          <div className="space-y-4">
            {/* Sub-tabs for Contactología */}
            <div className="flex gap-2 border-b border-admin-border-primary/20 pb-2">
              <Button
                variant={contactLensSubTab === "families" ? "default" : "ghost"}
                size="sm"
                className="rounded-lg text-xs uppercase tracking-wide"
                onClick={() => {
                  setContactLensSubTab("families");
                  router.replace(
                    "/admin/products?tab=contact-lens-families&contactLensSubTab=families",
                    { scroll: false },
                  );
                }}
              >
                Familias
              </Button>
              <Button
                variant={
                  contactLensSubTab === "inventory" ? "default" : "ghost"
                }
                size="sm"
                className="rounded-lg text-xs uppercase tracking-wide"
                onClick={() => {
                  setContactLensSubTab("inventory");
                  router.replace(
                    "/admin/products?tab=contact-lens-families&contactLensSubTab=inventory",
                    { scroll: false },
                  );
                }}
              >
                <PackagePlus className="h-3 w-3 mr-1" />
                Inventario
              </Button>
            </div>

            {/* Show families or inventory based on sub-tab */}
            {contactLensSubTab === "families" ? (
              <ContactLensFamiliesList />
            ) : (
              <ContactLensInventoryManager
                families={contactLensFamilies}
                branchId={currentBranchId}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
