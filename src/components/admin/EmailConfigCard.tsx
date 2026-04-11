"use client";

import { Info, Loader2, Mail, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SystemConfigItem {
  config_key: string;
  config_value: unknown;
}

interface EmailConfigCardProps {
  /** System configs to get contact_email (from Contact card) */
  configs?: SystemConfigItem[];
}

export default function EmailConfigCard({
  configs = [],
}: EmailConfigCardProps) {
  const [organizationName, setOrganizationName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const contactEmailConfig = configs.find(
    (c) => c.config_key === "contact_email",
  );
  const suggestedContactEmail =
    typeof contactEmailConfig?.config_value === "string"
      ? contactEmailConfig.config_value
      : "";

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/organizations/current");
        if (!res.ok) return;
        const data = await res.json();
        const org = data?.data ?? data?.organization;
        const contactEmailVal =
          typeof contactEmailConfig?.config_value === "string"
            ? contactEmailConfig.config_value
            : "";
        if (org) {
          setOrganizationName(org.name || "");
          const meta = (org.metadata as Record<string, unknown>) || {};
          const metaDisplayName = meta.email_display_name as string | undefined;
          const metaSupportEmail = meta.support_email as string | undefined;
          setDisplayName(metaDisplayName?.trim() || org.name || "");
          setReplyTo(metaSupportEmail?.trim() || contactEmailVal || "");
        }
      } catch (error) {
        console.error("Error fetching organization:", error);
        toast.error("Error al cargar configuración");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [contactEmailConfig?.config_value]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch("/api/admin/organizations/current");
      if (!res.ok) throw new Error("No se pudo cargar la organización");
      const data = await res.json();
      const org = data?.data ?? data?.organization;
      const currentMeta = (org?.metadata as Record<string, unknown>) || {};

      const response = await fetch("/api/admin/organizations/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...currentMeta,
            email_display_name: displayName.trim() || null,
            support_email: replyTo.trim() || null,
          },
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al guardar");
      }
      toast.success("Configuración de correo guardada correctamente");
    } catch (error) {
      console.error("Error saving email config:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al guardar configuración",
      );
    } finally {
      setSaving(false);
    }
  };

  const suggestedDisplayName = organizationName || "Nombre de la óptica";
  const suggestedReplyTo = suggestedContactEmail || "contacto@tuoptica.cl";

  return (
    <Card className="rounded-xl border border-border overflow-hidden">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 font-display text-epoch-primary text-base sm:text-lg">
          <Mail className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
          Correo Electrónico
        </CardTitle>
        <p className="text-xs sm:text-sm text-epoch-primary/80 mt-1">
          Los emails se envían desde <strong>noreply@opttius.cl</strong>. Por
          defecto se usa el nombre de la óptica y el email de contacto. Puedes
          personalizarlos aquí.
        </p>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-0">
        {loading ? (
          <div className="flex justify-center py-6 sm:py-8">
            <Loader2 className="h-6 w-6 animate-spin text-epoch-primary" />
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-xl border border-border bg-epoch-background/30 p-3 text-[10px] sm:text-xs text-epoch-primary/80">
              <Info className="inline h-4 w-4 mr-2 align-middle" />
              Valores sugeridos desde <strong>Configuración</strong>: Nombre de
              la Óptica y Email de Contacto.
            </div>

            <div className="space-y-2">
              <Label htmlFor="email_display_name">
                Nombre de visualización (Display Name)
              </Label>
              <p className="text-[10px] sm:text-xs text-epoch-primary/80">
                Sugerido:{" "}
                <span className="font-medium text-admin-text-secondary">
                  {suggestedDisplayName}
                </span>
              </p>
              <Input
                className="w-full"
                id="email_display_name"
                placeholder={suggestedDisplayName}
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="support_email">
                Reply-To (Correo de respuestas)
              </Label>
              <p className="text-[10px] sm:text-xs text-epoch-primary/80">
                Sugerido:{" "}
                <span className="font-medium text-admin-text-secondary">
                  {suggestedReplyTo}
                </span>
              </p>
              <Input
                className="w-full"
                id="support_email"
                placeholder={suggestedReplyTo}
                type="email"
                value={replyTo}
                onChange={(e) => setReplyTo(e.target.value)}
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                className="min-w-[120px] rounded-xl min-h-[44px] w-full sm:w-auto"
                disabled={saving}
                onClick={handleSave}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
