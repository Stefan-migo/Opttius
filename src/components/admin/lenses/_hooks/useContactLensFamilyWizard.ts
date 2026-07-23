"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { appLogger } from '@/lib/logger';
import type { ContactLensModality, ContactLensPackaging, ContactLensUseType } from "@/types/contact-lens";

import type { ContactLensMatrixFormData } from "./ContactLensMatrixManager";

interface FullFamilyData {
  name: string; brand: string; category_id: string | null;
  use_type: ContactLensUseType; modality: ContactLensModality; material: string | undefined;
  packaging: ContactLensPackaging; base_curve: string; diameter: string;
  description: string; is_active: boolean; matrices: ContactLensMatrixFormData[];
}

export function useContactLensFamilyWizard(familyId?: string) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!familyId);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [data, setData] = useState<FullFamilyData>({
    name: "", brand: "", category_id: null, use_type: "monthly", modality: "spherical",
    material: undefined, packaging: "box_6", base_curve: "", diameter: "",
    description: "", is_active: true, matrices: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((json) => {
      const cats = json.categories || json.data || [];
      setCategories(cats.filter((c: { slug?: string }) => ["lentes-contacto", "lectura", "ocupacional", "deportivo"].includes(c.slug ?? "")));
    }).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (familyId) {
      fetch(`/api/admin/contact-lens-families/${familyId}?include_matrices=true`)
        .then((r) => { if (!r.ok) throw new Error("Error al cargar familia"); return r.json(); })
        .then((json) => {
          const f = json.family;
          setData({
            name: f.name || "", brand: f.brand || "", category_id: f.category_id || null,
            use_type: f.use_type || "monthly", modality: f.modality || "spherical",
            material: f.material || undefined, packaging: f.packaging || "box_6",
            base_curve: f.base_curve != null ? String(f.base_curve) : "",
            diameter: f.diameter != null ? String(f.diameter) : "",
            description: f.description || "", is_active: f.is_active ?? true,
            matrices: (f.contact_lens_price_matrices || []).map((m: Record<string, unknown>) => ({
              id: m.id as string, sphere_min: m.sphere_min as number, sphere_max: m.sphere_max as number,
              cylinder_min: m.cylinder_min as number, cylinder_max: m.cylinder_max as number,
              axis_min: m.axis_min as number, axis_max: m.axis_max as number,
              addition_min: m.addition_min as number, addition_max: m.addition_max as number,
              base_price: m.base_price as number, cost: m.cost as number, is_active: m.is_active as boolean,
            })),
          });
        })
        .catch((err) => { appLogger.error(err); toast.error("Error al cargar familia"); })
        .finally(() => setInitialLoading(false));
    }
  }, [familyId]);

  const validateStep1 = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) newErrors.name = "El nombre es requerido";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data.name]);

  const handleNext = () => { if (step === 1 && validateStep1()) setStep(2); };
  const handleBack = () => { if (step === 2) setStep(1); };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const body = { name: data.name.trim(), brand: data.brand || null, category_id: data.category_id || null, use_type: data.use_type, modality: data.modality, material: data.material || null, packaging: data.packaging, base_curve: data.base_curve ? parseFloat(data.base_curve) : null, diameter: data.diameter ? parseFloat(data.diameter) : null, description: data.description || null, is_active: data.is_active, matrices: data.matrices.map((m) => ({ name: m.name ?? null, sphere_min: m.sphere_min, sphere_max: m.sphere_max, cylinder_min: m.cylinder_min, cylinder_max: m.cylinder_max, axis_min: m.axis_min, axis_max: m.axis_max, addition_min: m.addition_min, addition_max: m.addition_max, base_price: m.base_price, cost: m.cost, is_active: m.is_active })) };
      const url = familyId ? `/api/admin/contact-lens-families/${familyId}` : "/api/admin/contact-lens-families";
      const method = familyId ? "PUT" : "POST";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!response.ok) { const err = await response.json(); throw new Error(err.error || (familyId ? "Error al actualizar familia" : "Error al crear familia")); }
      toast.success(familyId ? "Familia actualizada exitosamente" : "Familia de lentes de contacto creada exitosamente");
      router.push("/admin/products?tab=contact-lens-families");
    } catch (error: unknown) { appLogger.error(error); toast.error(error instanceof Error ? error.message : "Error al guardar"); }
    finally { setLoading(false); }
  };

  return { step, loading, initialLoading, categories, data, setData, errors, handleNext, handleBack, handleSubmit, setStep };
}
