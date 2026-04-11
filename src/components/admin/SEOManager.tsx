"use client";

import {
  AlertCircle,
  BarChart3,
  CheckCircle,
  ExternalLink,
  Eye,
  Facebook,
  Globe,
  Image as ImageIcon,
  Link as LinkIcon,
  Save,
  Search,
  Twitter,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ImageUpload from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

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
      console.error("Error fetching SEO config:", error);
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
      console.error("Error saving SEO config:", error);
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
  const ogImage = config.seo_og_image_url || "/og-image.jpg";
  const fullOgImage = ogImage.startsWith("http")
    ? ogImage
    : `${baseUrl}${ogImage}`;
  const siteTitle = config.seo_default_title || "OPTTIUS CONSCIENTE";
  const siteDescription =
    config.seo_default_description ||
    "Descubre productos naturales y conscientes para tu bienestar.";
  const descriptionLength = siteDescription.length;
  const titleLength = siteTitle.length;

  // Validation helpers
  const getTitleStatus = () => {
    if (titleLength === 0)
      return { status: "error", message: "El título es requerido" };
    if (titleLength > 60)
      return {
        status: "warning",
        message: "Recomendado: máximo 60 caracteres",
      };
    return { status: "success", message: "Longitud óptima" };
  };

  const getDescriptionStatus = () => {
    if (descriptionLength === 0)
      return { status: "error", message: "La descripción es requerida" };
    if (descriptionLength > 160)
      return {
        status: "warning",
        message: "Recomendado: máximo 160 caracteres",
      };
    if (descriptionLength < 120)
      return {
        status: "warning",
        message: "Recomendado: entre 120-160 caracteres",
      };
    return { status: "success", message: "Longitud óptima" };
  };

  const titleStatus = getTitleStatus();
  const descriptionStatus = getDescriptionStatus();

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

        {/* General SEO Settings */}
        <TabsContent className="space-y-6" value="general">
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Configuración Global SEO
              </CardTitle>
              <CardDescription>
                Configuración básica para motores de búsqueda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="default_title">Título por Defecto *</Label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${titleLength > 60 ? "text-red-500" : titleLength > 50 ? "text-yellow-500" : "text-green-500"}`}
                    >
                      {titleLength} / 60
                    </span>
                    {titleStatus.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {titleStatus.status === "warning" && (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    {titleStatus.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <Input
                  className={
                    titleStatus.status === "error"
                      ? "border-red-500"
                      : titleStatus.status === "warning"
                        ? "border-yellow-500"
                        : ""
                  }
                  id="default_title"
                  placeholder="OPTTIUS CONSCIENTE - Productos Naturales"
                  value={config.seo_default_title || ""}
                  onChange={(e) =>
                    handleUpdate("seo_default_title", e.target.value)
                  }
                />
                <p
                  className={`text-xs ${titleStatus.status === "error" ? "text-red-500" : titleStatus.status === "warning" ? "text-yellow-500" : "text-tierra-media"}`}
                >
                  {titleStatus.message}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="default_description">
                    Descripción por Defecto *
                  </Label>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs ${descriptionLength > 160 ? "text-red-500" : descriptionLength < 120 ? "text-yellow-500" : "text-green-500"}`}
                    >
                      {descriptionLength} / 160
                    </span>
                    {descriptionStatus.status === "success" && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {descriptionStatus.status === "warning" && (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    {descriptionStatus.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>
                <Textarea
                  className={
                    descriptionStatus.status === "error"
                      ? "border-red-500"
                      : descriptionStatus.status === "warning"
                        ? "border-yellow-500"
                        : ""
                  }
                  id="default_description"
                  placeholder="Descripción de tu sitio web que aparecerá en los resultados de búsqueda..."
                  rows={4}
                  value={config.seo_default_description || ""}
                  onChange={(e) =>
                    handleUpdate("seo_default_description", e.target.value)
                  }
                />
                <p
                  className={`text-xs ${descriptionStatus.status === "error" ? "text-red-500" : descriptionStatus.status === "warning" ? "text-yellow-500" : "text-tierra-media"}`}
                >
                  {descriptionStatus.message}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_keywords">Palabras Clave</Label>
                <Input
                  id="default_keywords"
                  placeholder="productos naturales, bienestar, salud, consciente"
                  value={
                    Array.isArray(config.seo_default_keywords)
                      ? config.seo_default_keywords.join(", ")
                      : config.seo_default_keywords || ""
                  }
                  onChange={(e) => {
                    const keywords = e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter((k) => k);
                    handleUpdate("seo_default_keywords", keywords);
                  }}
                />
                <p className="text-xs text-tierra-media">
                  Separa las palabras clave con comas. Ejemplo: productos
                  naturales, bienestar, salud
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="canonical_url">URL Canónica</Label>
                <Input
                  id="canonical_url"
                  placeholder={baseUrl}
                  value={config.seo_canonical_url || baseUrl}
                  onChange={(e) =>
                    handleUpdate("seo_canonical_url", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  URL base del sitio (usada para URLs canónicas)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa - Resultado de Búsqueda
              </CardTitle>
              <CardDescription>Así se verá tu sitio en Google</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-white dark:bg-gray-800 space-y-2">
                <div className="text-blue-600 dark:text-blue-400 text-sm">
                  {baseUrl.replace(/^https?:\/\//, "")}
                </div>
                <div className="text-xl text-blue-700 dark:text-blue-300 font-medium line-clamp-1">
                  {siteTitle || "Título de tu sitio"}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {siteDescription || "Descripción de tu sitio web..."}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Social Media Settings */}
        <TabsContent className="space-y-6" value="social">
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Facebook className="h-5 w-5" />
                Open Graph (Facebook, LinkedIn)
              </CardTitle>
              <CardDescription>
                Configuración para compartir en redes sociales
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="og_title">Título Open Graph</Label>
                <Input
                  id="og_title"
                  placeholder={
                    config.seo_default_title ||
                    "Título para compartir en redes sociales"
                  }
                  value={config.seo_og_title || config.seo_default_title || ""}
                  onChange={(e) => handleUpdate("seo_og_title", e.target.value)}
                />
                <p className="text-xs text-tierra-media">
                  Si está vacío, se usará el título por defecto
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_description">Descripción Open Graph</Label>
                <Textarea
                  id="og_description"
                  placeholder={
                    config.seo_default_description ||
                    "Descripción para compartir en redes sociales"
                  }
                  rows={3}
                  value={
                    config.seo_og_description ||
                    config.seo_default_description ||
                    ""
                  }
                  onChange={(e) =>
                    handleUpdate("seo_og_description", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  Si está vacío, se usará la descripción por defecto
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_image">Imagen Open Graph *</Label>
                <p className="text-xs text-tierra-media mb-2">
                  Imagen que se mostrará al compartir en redes sociales
                  (1200x630px recomendado)
                </p>
                <div className="space-y-4">
                  <ImageUpload
                    folder="seo"
                    placeholder="Seleccionar o ingresar URL de imagen Open Graph"
                    value={config.seo_og_image_url || ""}
                    onChange={(url) => handleUpdate("seo_og_image_url", url)}
                  />
                  {config.seo_og_image_url && (
                    <div className="mt-2 p-3 bg-admin-bg-tertiary rounded-lg border">
                      <p className="text-xs text-tierra-media mb-1">
                        URL actual:
                      </p>
                      <p className="text-xs font-mono text-azul-profundo break-all">
                        {config.seo_og_image_url}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="og_type">Tipo Open Graph</Label>
                <Input
                  id="og_type"
                  placeholder="website"
                  value={config.seo_og_type || "website"}
                  onChange={(e) => handleUpdate("seo_og_type", e.target.value)}
                />
                <p className="text-xs text-tierra-media">
                  Tipos comunes: website, article, product
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Twitter className="h-5 w-5" />
                Twitter Cards
              </CardTitle>
              <CardDescription>
                Configuración para compartir en Twitter/X
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="twitter_handle">Twitter Handle</Label>
                <Input
                  id="twitter_handle"
                  placeholder="@opttius"
                  value={config.seo_twitter_handle || ""}
                  onChange={(e) =>
                    handleUpdate("seo_twitter_handle", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  Tu nombre de usuario de Twitter (incluye el @)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="twitter_card_type">Tipo de Tarjeta</Label>
                <Input
                  id="twitter_card_type"
                  placeholder="summary_large_image"
                  value={config.seo_twitter_card_type || "summary_large_image"}
                  onChange={(e) =>
                    handleUpdate("seo_twitter_card_type", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  Tipos: summary, summary_large_image
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Social Preview */}
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Vista Previa - Redes Sociales
              </CardTitle>
              <CardDescription>
                Así se verá al compartir en Facebook/Twitter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                {config.seo_og_image_url ? (
                  <div className="w-full aspect-[1.91/1] bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <img
                      alt="OG Preview"
                      className="w-full h-full object-cover"
                      src={fullOgImage}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                        (
                          e.target as HTMLImageElement
                        ).parentElement!.innerHTML =
                          '<div class="w-full h-full flex items-center justify-center text-gray-400">Imagen no disponible</div>';
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[1.91/1] bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No hay imagen configurada</p>
                    </div>
                  </div>
                )}
                <div className="p-4 space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                    {baseUrl.replace(/^https?:\/\//, "")}
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                    {config.seo_og_title || siteTitle}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {config.seo_og_description || siteDescription}
                  </div>
                </div>
              </div>
              <p className="text-xs text-tierra-media mt-2">
                💡 Esta es una aproximación de cómo se verá al compartir en
                Facebook, LinkedIn y otras redes sociales
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Settings */}
        <TabsContent className="space-y-6" value="analytics">
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analytics y Tracking
              </CardTitle>
              <CardDescription>
                Configura códigos de seguimiento y analytics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ga_id">Google Analytics ID</Label>
                <Input
                  id="ga_id"
                  placeholder="G-XXXXXXXXXX"
                  value={config.seo_google_analytics_id || ""}
                  onChange={(e) =>
                    handleUpdate("seo_google_analytics_id", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  ID de Google Analytics 4 (formato: G-XXXXXXXXXX)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gtm_id">Google Tag Manager ID</Label>
                <Input
                  id="gtm_id"
                  placeholder="GTM-XXXXXXX"
                  value={config.seo_google_tag_manager_id || ""}
                  onChange={(e) =>
                    handleUpdate("seo_google_tag_manager_id", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  ID de Google Tag Manager (formato: GTM-XXXXXXX)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fb_pixel">Facebook Pixel ID</Label>
                <Input
                  id="fb_pixel"
                  placeholder="123456789012345"
                  value={config.seo_facebook_pixel_id || ""}
                  onChange={(e) =>
                    handleUpdate("seo_facebook_pixel_id", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  ID de Facebook Pixel (números solamente)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bing_webmaster">Bing Webmaster Tools</Label>
                <Input
                  id="bing_webmaster"
                  placeholder="Meta tag verification code"
                  value={config.seo_bing_webmaster_id || ""}
                  onChange={(e) =>
                    handleUpdate("seo_bing_webmaster_id", e.target.value)
                  }
                />
                <p className="text-xs text-tierra-media">
                  Código de verificación de Bing Webmaster Tools
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tools & Utilities */}
        <TabsContent className="space-y-6" value="tools">
          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sitemap y Robots.txt
              </CardTitle>
              <CardDescription>URLs para motores de búsqueda</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-tertiary">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <LinkIcon className="h-4 w-4 text-azul-profundo" />
                    <Label className="font-semibold">Sitemap XML</Label>
                  </div>
                  <p className="text-sm text-tierra-media font-mono">
                    {baseUrl}/api/sitemap.xml
                  </p>
                  <p className="text-xs text-tierra-media mt-1">
                    Mapa del sitio para motores de búsqueda
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`${baseUrl}/api/sitemap.xml`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-tertiary">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <LinkIcon className="h-4 w-4 text-azul-profundo" />
                    <Label className="font-semibold">Robots.txt</Label>
                  </div>
                  <p className="text-sm text-tierra-media font-mono">
                    {baseUrl}/api/robots.txt
                  </p>
                  <p className="text-xs text-tierra-media mt-1">
                    Instrucciones para crawlers de motores de búsqueda
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href={`${baseUrl}/api/robots.txt`}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Ver
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card
            className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
            style={{ backgroundColor: "var(--admin-border-primary)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Herramientas de Verificación
              </CardTitle>
              <CardDescription>
                Enlaces útiles para verificar tu SEO
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-admin-bg-tertiary">
                <div>
                  <Label className="font-semibold">Google Search Console</Label>
                  <p className="text-xs text-tierra-media">
                    Verifica y monitorea tu sitio
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href="https://search.google.com/search-console"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-admin-bg-tertiary">
                <div>
                  <Label className="font-semibold">
                    Facebook Sharing Debugger
                  </Label>
                  <p className="text-xs text-tierra-media">
                    Prueba cómo se ve tu sitio en Facebook
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href="https://developers.facebook.com/tools/debug/"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-admin-bg-tertiary">
                <div>
                  <Label className="font-semibold">
                    Twitter Card Validator
                  </Label>
                  <p className="text-xs text-tierra-media">
                    Prueba tus Twitter Cards
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href="https://cards-dev.twitter.com/validator"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-admin-bg-tertiary">
                <div>
                  <Label className="font-semibold">
                    Google Rich Results Test
                  </Label>
                  <p className="text-xs text-tierra-media">
                    Verifica datos estructurados
                  </p>
                </div>
                <Button asChild size="sm" variant="outline">
                  <a
                    href="https://search.google.com/test/rich-results"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Abrir
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
