"use client";

import { ExternalLink, Globe, LinkIcon, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface Props {
  baseUrl: string;
}

export function SEOManagerToolsTab({ baseUrl }: Props) {
  return (
    <>
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
              <p className="text-sm text-tierra-media font-mono">{baseUrl}/api/sitemap.xml</p>
              <p className="text-xs text-tierra-media mt-1">Mapa del sitio para motores de búsqueda</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href={`${baseUrl}/api/sitemap.xml`} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" /> Ver
              </a>
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg bg-admin-bg-tertiary">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="h-4 w-4 text-azul-profundo" />
                <Label className="font-semibold">Robots.txt</Label>
              </div>
              <p className="text-sm text-tierra-media font-mono">{baseUrl}/api/robots.txt</p>
              <p className="text-xs text-tierra-media mt-1">Instrucciones para crawlers de motores de búsqueda</p>
            </div>
            <Button asChild size="sm" variant="outline">
              <a href={`${baseUrl}/api/robots.txt`} rel="noopener noreferrer" target="_blank">
                <ExternalLink className="h-4 w-4 mr-2" /> Ver
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
          <CardDescription>Enlaces útiles para verificar tu SEO</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Google Search Console", desc: "Verifica y monitorea tu sitio", href: "https://search.google.com/search-console" },
            { label: "Facebook Sharing Debugger", desc: "Prueba cómo se ve tu sitio en Facebook", href: "https://developers.facebook.com/tools/debug/" },
            { label: "Twitter Card Validator", desc: "Prueba tus Twitter Cards", href: "https://cards-dev.twitter.com/validator" },
            { label: "Google Rich Results Test", desc: "Verifica datos estructurados", href: "https://search.google.com/test/rich-results" },
          ].map((item) => (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-admin-bg-tertiary" key={item.href}>
              <div>
                <Label className="font-semibold">{item.label}</Label>
                <p className="text-xs text-tierra-media">{item.desc}</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <a href={item.href} rel="noopener noreferrer" target="_blank">
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir
                </a>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
