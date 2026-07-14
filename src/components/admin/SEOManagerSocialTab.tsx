"use client";

import { Eye, Facebook, ImageIcon, Twitter } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  config: Record<string, unknown>;
  baseUrl: string;
  onUpdate: (key: string, value: unknown) => void;
}

export function SEOManagerSocialTab({ config, baseUrl, onUpdate }: Props) {
  const siteTitle =
    (config.seo_default_title as string) || "OPTTIUS CONSCIENTE";
  const siteDescription =
    (config.seo_default_description as string) ||
    "Descubre productos naturales y conscientes para tu bienestar.";
  const ogImage = (config.seo_og_image_url as string) || "/og-image.jpg";
  const fullOgImage = ogImage.startsWith("http")
    ? ogImage
    : `${baseUrl}${ogImage}`;

  return (
    <>
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
              placeholder={(config.seo_default_title as string) || "Título para compartir en redes sociales"}
              value={(config.seo_og_title as string) || (config.seo_default_title as string) || ""}
              onChange={(e) => onUpdate("seo_og_title", e.target.value)}
            />
            <p className="text-xs text-tierra-media">Si está vacío, se usará el título por defecto</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="og_description">Descripción Open Graph</Label>
            <Textarea
              id="og_description"
              placeholder={(config.seo_default_description as string) || "Descripción para compartir en redes sociales"}
              rows={3}
              value={(config.seo_og_description as string) || (config.seo_default_description as string) || ""}
              onChange={(e) => onUpdate("seo_og_description", e.target.value)}
            />
            <p className="text-xs text-tierra-media">Si está vacío, se usará la descripción por defecto</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="og_image">Imagen Open Graph *</Label>
            <p className="text-xs text-tierra-media mb-2">
              Imagen que se mostrará al compartir en redes sociales (1200x630px recomendado)
            </p>
            <div className="space-y-4">
              <ImageUpload
                folder="seo"
                placeholder="Seleccionar o ingresar URL de imagen Open Graph"
                value={config.seo_og_image_url as string || ""}
                onChange={(url) => onUpdate("seo_og_image_url", url)}
              />
              {!!config.seo_og_image_url && (
                <div className="mt-2 p-3 bg-admin-bg-tertiary rounded-lg border">
                  <p className="text-xs text-tierra-media mb-1">URL actual:</p>
                  <p className="text-xs font-mono text-azul-profundo break-all">
                    {config.seo_og_image_url as string}
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
              value={(config.seo_og_type as string) || "website"}
              onChange={(e) => onUpdate("seo_og_type", e.target.value)}
            />
            <p className="text-xs text-tierra-media">Tipos comunes: website, article, product</p>
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
          <CardDescription>Configuración para compartir en Twitter/X</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="twitter_handle">Twitter Handle</Label>
            <Input
              id="twitter_handle"
              placeholder="@opttius"
              value={(config.seo_twitter_handle as string) || ""}
              onChange={(e) => onUpdate("seo_twitter_handle", e.target.value)}
            />
            <p className="text-xs text-tierra-media">Tu nombre de usuario de Twitter (incluye el @)</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="twitter_card_type">Tipo de Tarjeta</Label>
            <Input
              id="twitter_card_type"
              placeholder="summary_large_image"
              value={(config.seo_twitter_card_type as string) || "summary_large_image"}
              onChange={(e) => onUpdate("seo_twitter_card_type", e.target.value)}
            />
            <p className="text-xs text-tierra-media">Tipos: summary, summary_large_image</p>
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
            Vista Previa - Redes Sociales
          </CardTitle>
          <CardDescription>Así se verá al compartir en Facebook/Twitter</CardDescription>
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
                    (e.target as HTMLImageElement).parentElement!.innerHTML =
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
                {(config.seo_og_title as string) || siteTitle}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {(config.seo_og_description as string) || siteDescription}
              </div>
            </div>
          </div>
          <p className="text-xs text-tierra-media mt-2">
            💡 Esta es una aproximación de cómo se verá al compartir en Facebook, LinkedIn y otras redes sociales
          </p>
        </CardContent>
      </Card>
    </>
  );
}
