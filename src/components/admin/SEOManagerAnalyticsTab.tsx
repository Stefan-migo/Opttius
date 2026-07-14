"use client";

import { BarChart3 } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  config: Record<string, unknown>;
  onUpdate: (key: string, value: unknown) => void;
}

export function SEOManagerAnalyticsTab({ config, onUpdate }: Props) {
  return (
    <Card
      className="bg-admin-bg-secondary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
      style={{ backgroundColor: "var(--admin-border-primary)" }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Analytics y Tracking
        </CardTitle>
        <CardDescription>Configura códigos de seguimiento y analytics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ga_id">Google Analytics ID</Label>
          <Input
            id="ga_id"
            placeholder="G-XXXXXXXXXX"
            value={(config.seo_google_analytics_id as string) || ""}
            onChange={(e) => onUpdate("seo_google_analytics_id", e.target.value)}
          />
          <p className="text-xs text-tierra-media">ID de Google Analytics 4 (formato: G-XXXXXXXXXX)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gtm_id">Google Tag Manager ID</Label>
          <Input
            id="gtm_id"
            placeholder="GTM-XXXXXXX"
            value={(config.seo_google_tag_manager_id as string) || ""}
            onChange={(e) => onUpdate("seo_google_tag_manager_id", e.target.value)}
          />
          <p className="text-xs text-tierra-media">ID de Google Tag Manager (formato: GTM-XXXXXXX)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="fb_pixel">Facebook Pixel ID</Label>
          <Input
            id="fb_pixel"
            placeholder="123456789012345"
            value={(config.seo_facebook_pixel_id as string) || ""}
            onChange={(e) => onUpdate("seo_facebook_pixel_id", e.target.value)}
          />
          <p className="text-xs text-tierra-media">ID de Facebook Pixel (números solamente)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bing_webmaster">Bing Webmaster Tools</Label>
          <Input
            id="bing_webmaster"
            placeholder="Meta tag verification code"
            value={(config.seo_bing_webmaster_id as string) || ""}
            onChange={(e) => onUpdate("seo_bing_webmaster_id", e.target.value)}
          />
          <p className="text-xs text-tierra-media">Código de verificación de Bing Webmaster Tools</p>
        </div>
      </CardContent>
    </Card>
  );
}
