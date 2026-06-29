"use client";

import { Building2, Loader2, Save } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ImageUpload from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function OrganizationInfoCard() {
  const [organizationData, setOrganizationData] = useState<{
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    slogan: string | null;
  } | null>(null);
  const [localOrgData, setLocalOrgData] = useState<{
    name: string;
    logo_url: string;
    slogan: string;
  } | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(true);
  const [savingOrg, setSavingOrg] = useState(false);

  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        setLoadingOrg(true);
        const response = await fetch("/api/admin/organizations/current");
        if (response.ok) {
          const data = await response.json();
          const organization = data?.data ?? data?.organization;
          if (organization) {
            setOrganizationData(organization);
            setLocalOrgData({
              name: organization.name || "",
              logo_url: organization.logo_url || "",
              slogan: organization.slogan || "",
            });
          }
        }
      } catch {
        toast.error("Error al cargar información de la organización");
      } finally {
        setLoadingOrg(false);
      }
    };
    fetchOrganization();
  }, []);

  const handleSaveOrganization = async () => {
    if (!localOrgData) return;
    try {
      setSavingOrg(true);
      const response = await fetch("/api/admin/organizations/current", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: localOrgData.name,
          logo_url: localOrgData.logo_url || null,
          slogan: localOrgData.slogan || null,
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al actualizar la organización");
      }
      const data = await response.json();
      const organization = data?.data ?? data?.organization;
      if (organization) {
        setOrganizationData(organization);
        toast.success("Información de la óptica actualizada correctamente");
        window.location.reload();
      }
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Error al guardar la información de la óptica",
      );
    } finally {
      setSavingOrg(false);
    }
  };

  return (
    <Card className="rounded-xl border border-border">
      <CardHeader className="p-4 sm:p-6 pb-0">
        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 font-display text-epoch-primary text-base sm:text-lg">
          <div className="flex items-center">
            <Building2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 shrink-0" />
            Información de la Óptica (Header)
          </div>
          <Badge className="text-[10px] sm:text-xs w-fit" variant="default">
            Personalización
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 pt-4">
        {loadingOrg ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-epoch-primary" />
          </div>
        ) : localOrgData ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="clinic_name">Nombre de la Óptica (Clínica) *</Label>
              <p className="text-xs text-epoch-primary/80">Este nombre se mostrará en el header de las secciones</p>
              <Input
                className="w-full"
                id="clinic_name"
                placeholder="Ej: Óptica Visión Premium"
                type="text"
                value={localOrgData.name}
                onChange={(e) => setLocalOrgData({ ...localOrgData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slogan">Slogan (Opcional)</Label>
              <p className="text-xs text-epoch-primary/80">Slogan o tagline que aparecerá debajo del nombre en el header</p>
              <Input
                className="w-full"
                id="slogan"
                placeholder="Ej: Tu visión, nuestra pasión"
                type="text"
                value={localOrgData.slogan}
                onChange={(e) => setLocalOrgData({ ...localOrgData, slogan: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <Label>Logo de la Clínica</Label>
              <p className="text-xs text-epoch-primary/80">Logo de la óptica que se mostrará en el header de todas las sucursales.</p>
              <div className="flex flex-col sm:flex-row gap-6 items-start">
                <div className="flex-1 w-full max-w-sm">
                  <ImageUpload
                    folder="logos"
                    value={localOrgData.logo_url || ""}
                    onChange={(url) => setLocalOrgData({ ...localOrgData, logo_url: url })}
                  />
                </div>
                {localOrgData.logo_url && (
                  <div className="space-y-2">
                    <Label className="text-xs">Vista Previa Actual</Label>
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border-2 border-border bg-white shadow-sm flex items-center justify-center">
                      <Image
                        alt="Logo preview"
                        className="object-contain p-2"
                        height={128}
                        src={localOrgData.logo_url}
                        width={128}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                className="min-w-[120px] rounded-xl min-h-[44px] w-full sm:w-auto"
                disabled={savingOrg}
                onClick={handleSaveOrganization}
              >
                {savingOrg ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Guardando...</>
                ) : (
                  <><Save className="h-4 w-4 mr-2" />Guardar Cambios</>
                )}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
