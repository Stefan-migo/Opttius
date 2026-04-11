"use client";

import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { LensFamilyBasicForm, LensFamilyFormData } from "./LensFamilyBasicForm";
import { LensMatrixFormData, LensMatrixManager } from "./LensMatrixManager";

interface LensFamilyEditorProps {
  familyId: string;
}

export function LensFamilyEditor({ familyId }: LensFamilyEditorProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("info");

  const [familyData, setFamilyData] = useState<LensFamilyFormData | null>(null);
  const [matrices, setMatrices] = useState<LensMatrixFormData[]>([]);

  useEffect(() => {
    if (familyId) {
      fetchData();
    }
  }, [familyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Family
      const familyRes = await fetch(`/api/admin/lens-families/${familyId}`);
      if (!familyRes.ok) throw new Error("Error fetching family");
      const familyJson = await familyRes.json();
      const f = familyJson.family;
      setFamilyData({
        name: f.name,
        brand: f.brand || "",
        category_id: f.category_id || null,
        lens_type: f.lens_type,
        lens_material: f.lens_material,
        description: f.description || "",
        is_active: f.is_active,
      });

      // Fetch Matrices
      const matricesRes = await fetch(
        `/api/admin/lens-matrices?family_id=${familyId}&include_inactive=true`,
      );
      if (!matricesRes.ok) throw new Error("Error fetching matrices");
      const matricesJson = await matricesRes.json();
      setMatrices(matricesJson.matrices || []);
    } catch (error) {
      console.error(error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleInfoSave = async () => {
    if (!familyData) return;
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/lens-families/${familyId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(familyData),
      });

      if (!response.ok) throw new Error("Error updating family");

      toast.success("Información actualizada");
    } catch (error) {
      console.error(error);
      toast.error("Error al actualizar familia");
    } finally {
      setSaving(false);
    }
  };

  const handleMatrixCreate = async (matrix: LensMatrixFormData) => {
    try {
      const response = await fetch("/api/admin/lens-matrices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matrix,
          lens_family_id: familyId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al crear matriz");
      }

      toast.success("Matriz creada");
      fetchData(); // Reload to get ID and sort
    } catch (error: unknown) {
      toast.error(error.message);
    }
  };

  const handleMatrixUpdate = async (matrix: LensMatrixFormData) => {
    try {
      // Ensure we don't send temp-ids to the server if it happens somehow, but matrix.id should be real here
      const response = await fetch(`/api/admin/lens-matrices/${matrix.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...matrix,
          lens_family_id: familyId,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Error al actualizar matriz");
      }

      toast.success("Matriz actualizada");
      fetchData();
    } catch (error: unknown) {
      toast.error(error.message);
    }
  };

  const handleMatrixDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/lens-matrices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar matriz");

      toast.success("Matriz eliminada");
      fetchData();
    } catch (error: unknown) {
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!familyData) return <div>No se encontró la familia</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/products?tab=lens-families")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              {familyData.name}
            </h2>
            <p className="text-muted-foreground">
              {familyData.brand} • {familyData.lens_type}
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="matrices">Matrices de Precios</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <Card>
            <CardContent className="pt-6">
              <LensFamilyBasicForm data={familyData} onChange={setFamilyData} />
              <div className="mt-6 flex justify-end">
                <Button disabled={saving} onClick={handleInfoSave}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matrices">
          <Card>
            <CardContent className="pt-6">
              <LensMatrixManager
                matrices={matrices}
                onMatrixCreate={handleMatrixCreate}
                onMatrixDelete={handleMatrixDelete}
                onMatrixUpdate={handleMatrixUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
