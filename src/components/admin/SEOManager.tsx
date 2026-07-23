"use client";

import { Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { appLogger } from '@/lib/logger';

import { SEOManagerAnalyticsTab } from "./SEOManagerAnalyticsTab";
import { SEOManagerGeneralTab } from "./SEOManagerGeneralTab";
import { SEOManagerSocialTab } from "./SEOManagerSocialTab";
import { SEOManagerToolsTab } from "./SEOManagerToolsTab";

export default function SEOManager() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/system/seo/config");
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config || {});
        setHasChanges(false);
      } else {
        toast.error("Error al cargar configuración SEO");
      }
    } catch (error) {
      appLogger.error("Error fetching SEO config:", error);
      toast.error("Error al cargar configuración SEO");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/system/seo/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success("Configuración SEO guardada exitosamente");
        setHasChanges(false);
        // Refresh to get updated values
        await fetchConfig();
      } else {
        const error = await response.json();
        toast.error(error.error || "Error al guardar configuración");
      }
    } catch (error) {
      appLogger.error("Error saving SEO config:", error);
      toast.error("Error al guardar configuración");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = (key: string, value: unknown) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  if (loading) {
    return (
      <div className="p-8 text-center text-tierra-media">
        Cargando configuración SEO...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-azul-profundo">
            Configuración de SEO
          </h2>
          <p className="text-tierra-media">
            Optimiza tu sitio para motores de búsqueda y redes sociales
          </p>
        </div>
        <Button disabled={saving || !hasChanges} onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>

      <Tabs className="space-y-6" defaultValue="general">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="social">Redes Sociales</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tools">Herramientas</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-6" value="general">
          <SEOManagerGeneralTab baseUrl={baseUrl} config={config} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent className="space-y-6" value="social">
          <SEOManagerSocialTab baseUrl={baseUrl} config={config} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent className="space-y-6" value="analytics">
          <SEOManagerAnalyticsTab config={config} onUpdate={handleUpdate} />
        </TabsContent>

        <TabsContent className="space-y-6" value="tools">
          <SEOManagerToolsTab baseUrl={baseUrl} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
