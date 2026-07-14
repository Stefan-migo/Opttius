"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import type { ContactLensFamily } from "@/types/contact-lens";

import { ContactLensFamiliesList } from "./ContactLensFamiliesList";
import { ContactLensFamilyDialog } from "./ContactLensFamilyDialog";

export default function ContactLensFamiliesContent() {
  const [families, setFamilies] = useState<ContactLensFamily[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ContactLensFamily | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);

  const [categories, setCategories] = useState<
    { id: string; name: string; slug: string }[]
  >([]);

  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    category_id: null as string | null,
    use_type: "monthly",
    modality: "spherical",
    material: undefined as string | undefined,
    packaging: "box_6",
    base_curve: "",
    diameter: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    fetchFamilies();
  }, [includeInactive]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((json) => {
        const cats = json.categories || json.data || [];
        setCategories(
          cats.filter((c: { slug?: string }) =>
            ["lentes-contacto", "lectura", "ocupacional", "deportivo"].includes(c.slug ?? ""),
          ),
        );
      })
      .catch(() => setCategories([]));
  }, []);

  const fetchFamilies = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (includeInactive) params.append("include_inactive", "true");
      const response = await fetch(`/api/admin/contact-lens-families?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setFamilies(data.data || data.families || []);
      } else {
        toast.error("Error al cargar familias de lentes de contacto");
      }
    } catch (error) {
      console.error("Error fetching families:", error);
      toast.error("Error al cargar familias de lentes de contacto");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (family?: ContactLensFamily) => {
    if (family) {
      setEditingFamily(family);
      setFormData({
        name: family.name,
        brand: family.brand || "",
        category_id: (family as { category_id?: string }).category_id || null,
        use_type: family.use_type,
        modality: family.modality,
        material: family.material || "",
        packaging: family.packaging,
        base_curve: family.base_curve?.toString() || "",
        diameter: family.diameter?.toString() || "",
        description: family.description || "",
        is_active: family.is_active,
      });
    } else {
      setEditingFamily(null);
      setFormData({
        name: "",
        brand: "",
        category_id: null,
        use_type: "monthly",
        modality: "spherical",
        material: "",
        packaging: "box_6",
        base_curve: "",
        diameter: "",
        description: "",
        is_active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingFamily(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingFamily
        ? `/api/admin/contact-lens-families/${editingFamily.id}`
        : "/api/admin/contact-lens-families";
      const method = editingFamily ? "PUT" : "POST";

      const body: Record<string, unknown> = {
        name: formData.name,
        brand: formData.brand || null,
        category_id: formData.category_id || null,
        use_type: formData.use_type,
        modality: formData.modality,
        packaging: formData.packaging,
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (formData.material) body.material = formData.material;
      if (formData.base_curve) body.base_curve = parseFloat(formData.base_curve);
      if (formData.diameter) body.diameter = parseFloat(formData.diameter);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al guardar familia");
      }

      toast.success(editingFamily ? "Familia actualizada exitosamente" : "Familia creada exitosamente");
      handleCloseDialog();
      fetchFamilies();
    } catch (error: unknown) {
      toast.error((error as Error).message || "Error al guardar familia");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta familia?")) return;
    try {
      const response = await fetch(`/api/admin/contact-lens-families/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Error al eliminar familia");
      toast.success("Familia eliminada exitosamente");
      fetchFamilies();
    } catch (error: unknown) {
      toast.error((error as Error).message || "Error al eliminar familia");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Link
        className="inline-flex items-center gap-2 text-sm text-admin-text-tertiary hover:text-epoch-primary transition-colors"
        href="/admin/products"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Productos
      </Link>

      <ContactLensFamiliesList
        families={families}
        loading={loading}
        onEdit={handleOpenDialog}
        onDelete={handleDelete}
        onCreate={() => handleOpenDialog()}
        onRefresh={fetchFamilies}
      />

      <ContactLensFamilyDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        editingFamily={editingFamily}
        formData={formData}
        categories={categories}
        onFormChange={(field, value) => setFormData((prev) => ({ ...prev, [field]: value }))}
        onSubmit={handleSubmit}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
