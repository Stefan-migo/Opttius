"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Contact, Grid3X3, Table } from "lucide-react";
import { useRouter } from "next/navigation";
import LensFamiliesList from "@/components/admin/lenses/LensFamiliesList";
import ContactLensFamiliesList from "@/components/admin/lenses/ContactLensFamiliesList";
import LensMatricesList from "@/components/admin/lenses/LensMatricesList";
import ContactLensMatricesList from "@/components/admin/lenses/ContactLensMatricesList";

export default function LensManagementPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"families" | "matrices">("families");
  const [lensType, setLensType] = useState<"optical" | "contact">("optical");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-azul-profundo">
          Gestión Unificada de Lentes
        </h1>
        <p className="text-tierra-media">
          Administra todas las familias y matrices de lentes en un solo lugar
        </p>
      </div>

      {/* Main Tabs - Families vs Matrices */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "families" | "matrices")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="families">
            <Package className="h-4 w-4 mr-2" />
            Familias de Lentes
          </TabsTrigger>
          <TabsTrigger value="matrices">
            <Grid3X3 className="h-4 w-4 mr-2" />
            Matrices de Precios
          </TabsTrigger>
        </TabsList>

        {/* Lens Type Selector */}
        <div className="flex justify-center my-4">
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <Button
              variant={lensType === "optical" ? "default" : "outline"}
              size="sm"
              className="rounded-r-none border-r-0"
              onClick={() => setLensType("optical")}
            >
              <Package className="h-4 w-4 mr-2" />
              Lentes Ópticos
            </Button>
            <Button
              variant={lensType === "contact" ? "default" : "outline"}
              size="sm"
              className="rounded-l-none"
              onClick={() => setLensType("contact")}
            >
              <Contact className="h-4 w-4 mr-2" />
              Lentes de Contacto
            </Button>
          </div>
        </div>

        {/* Families Tab Content */}
        <TabsContent value="families" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {lensType === "optical" 
                ? "Familias de Lentes Ópticos" 
                : "Familias de Lentes de Contacto"}
            </h2>
            <Button 
              onClick={() => router.push(
                lensType === "optical" 
                  ? "/admin/lens-families/new"
                  : "/admin/contact-lens-families/new"
              )}
            >
              {lensType === "optical" ? (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Nueva Familia Óptica
                </>
              ) : (
                <>
                  <Contact className="h-4 w-4 mr-2" />
                  Nueva Familia de Contacto
                </>
              )}
            </Button>
          </div>
          
          {lensType === "optical" ? (
            <LensFamiliesList />
          ) : (
            <ContactLensFamiliesList />
          )}
        </TabsContent>

        {/* Matrices Tab Content */}
        <TabsContent value="matrices" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">
              {lensType === "optical" 
                ? "Matrices de Precios de Lentes Ópticos" 
                : "Matrices de Precios de Lentes de Contacto"}
            </h2>
            <Button 
              onClick={() => router.push(
                lensType === "optical" 
                  ? "/admin/lens-matrices/new"
                  : "/admin/contact-lens-matrices/new"
              )}
            >
              {lensType === "optical" ? (
                <>
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Nueva Matriz Óptica
                </>
              ) : (
                <>
                  <Table className="h-4 w-4 mr-2" />
                  Nueva Matriz de Contacto
                </>
              )}
            </Button>
          </div>
          
          {lensType === "optical" ? (
            <LensMatricesList />
          ) : (
            <ContactLensMatricesList />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}