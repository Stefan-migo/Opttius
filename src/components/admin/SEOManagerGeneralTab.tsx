"use client";

import { AlertCircle, CheckCircle, Eye, Search } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  config: Record<string, unknown>;
  baseUrl: string;
  onUpdate: (key: string, value: unknown) => void;
}

export function SEOManagerGeneralTab({ config, baseUrl, onUpdate }: Props) {
  const siteTitle = (config.seo_default_title as string) || "OPTTIUS CONSCIENTE";
  const siteDescription =
    (config.seo_default_description as string) ||
    "Descubre productos naturales y conscientes para tu bienestar.";
  const titleLength = siteTitle.length;
  const descriptionLength = siteDescription.length;

  const getTitleStatus = () => {
    if (titleLength === 0) return { status: "error" as const, message: "El título es requerido" };
    if (titleLength > 60)
      return { status: "warning" as const, message: "Recomendado: máximo 60 caracteres" };
    return { status: "success" as const, message: "Longitud óptima" };
  };

  const getDescriptionStatus = () => {
    if (descriptionLength === 0)
      return { status: "error" as const, message: "La descripción es requerida" };
    if (descriptionLength > 160)
      return { status: "warning" as const, message: "Recomendado: máximo 160 caracteres" };
    if (descriptionLength < 120)
      return { status: "warning" as const, message: "Recomendado: entre 120-160 caracteres" };
    return { status: "success" as const, message: "Longitud óptima" };
  };

  const titleStatus = getTitleStatus();
  const descriptionStatus = getDescriptionStatus();

  return (
    <>
      <Card
        className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        style={{ backgroundColor: "var(--admin-border-primary)" }}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Configuración Global SEO
          </CardTitle>
          <CardDescription>Configuración básica para motores de búsqueda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="default_title">Título por Defecto *</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${titleLength > 60 ? "text-red-500" : titleLength > 50 ? "text-yellow-500" : "text-green-500"}`}>
                  {titleLength} / 60
                </span>
                {titleStatus.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                {titleStatus.status === "warning" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                {titleStatus.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            <Input
              className={titleStatus.status === "error" ? "border-red-500" : titleStatus.status === "warning" ? "border-yellow-500" : ""}
              id="default_title"
              placeholder="OPTTIUS CONSCIENTE - Productos Naturales"
              value={config.seo_default_title as string || ""}
              onChange={(e) => onUpdate("seo_default_title", e.target.value)}
            />
            <p className={`text-xs ${titleStatus.status === "error" ? "text-red-500" : titleStatus.status === "warning" ? "text-yellow-500" : "text-tierra-media"}`}>
              {titleStatus.message}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="default_description">Descripción por Defecto *</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${descriptionLength > 160 ? "text-red-500" : descriptionLength < 120 ? "text-yellow-500" : "text-green-500"}`}>
                  {descriptionLength} / 160
                </span>
                {descriptionStatus.status === "success" && <CheckCircle className="h-4 w-4 text-green-500" />}
                {descriptionStatus.status === "warning" && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                {descriptionStatus.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
              </div>
            </div>
            <Textarea
              className={descriptionStatus.status === "error" ? "border-red-500" : descriptionStatus.status === "warning" ? "border-yellow-500" : ""}
              id="default_description"
              placeholder="Descripción de tu sitio web que aparecerá en los resultados de búsqueda..."
              rows={4}
              value={config.seo_default_description as string || ""}
              onChange={(e) => onUpdate("seo_default_description", e.target.value)}
            />
            <p className={`text-xs ${descriptionStatus.status === "error" ? "text-red-500" : descriptionStatus.status === "warning" ? "text-yellow-500" : "text-tierra-media"}`}>
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
                  : (config.seo_default_keywords as string) || ""
              }
              onChange={(e) => {
                const keywords = e.target.value
                  .split(",")
                  .map((k) => k.trim())
                  .filter((k) => k);
                onUpdate("seo_default_keywords", keywords);
              }}
            />
            <p className="text-xs text-tierra-media">
              Separa las palabras clave con comas. Ejemplo: productos naturales, bienestar, salud
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="canonical_url">URL Canónica</Label>
            <Input
              id="canonical_url"
              placeholder={baseUrl}
              value={(config.seo_canonical_url as string) || baseUrl}
              onChange={(e) => onUpdate("seo_canonical_url", e.target.value)}
            />
            <p className="text-xs text-tierra-media">
              URL base del sitio (usada para URLs canónicas)
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
    </>
  );
}
