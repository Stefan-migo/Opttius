"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Contact } from "lucide-react";
import { useRouter } from "next/navigation";
import LensFamiliesList from "@/components/admin/lenses/LensFamiliesList";
import ContactLensFamiliesList from "@/components/admin/lenses/ContactLensFamiliesList";

export default function LensFamiliesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"optical" | "contact">("optical");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-azul-profundo">
          Gestión de Familias de Lentes
        </h1>
        <p className="text-tierra-media">
          Administra las familias de lentes ópticos y de contacto
        </p>
      </div>

      {/* Unified Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as "optical" | "contact")}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-2xl grid-cols-2">
          <TabsTrigger value="optical">
            <Package className="h-4 w-4 mr-2" />
            Lentes Ópticos
          </TabsTrigger>
          <TabsTrigger value="contact">
            <Contact className="h-4 w-4 mr-2" />
            Lentes de Contacto
          </TabsTrigger>
        </TabsList>

        <TabsContent value="optical" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Familias de Lentes Ópticos</h2>
            <Button onClick={() => router.push("/admin/lens-families/new")}>
              <Package className="h-4 w-4 mr-2" />
              Nueva Familia Óptica
            </Button>
          </div>
          <LensFamiliesList />
        </TabsContent>

        <TabsContent value="contact" className="space-y-6 mt-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Familias de Lentes de Contacto</h2>
            <Button onClick={() => router.push("/admin/contact-lens-families/new")}>
              <Contact className="h-4 w-4 mr-2" />
              Nueva Familia de Contacto
            </Button>
          </div>
          <ContactLensFamiliesList />
        </TabsContent>
      </Tabs>
    </div>
  );
}