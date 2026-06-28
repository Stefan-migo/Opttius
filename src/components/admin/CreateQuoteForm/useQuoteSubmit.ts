"use client";

import { useState } from "react";
import type React from "react";

import { quoteService } from "@/lib/api/services";
import { getBranchAndOperativoHeaders } from "@/lib/utils/branch";
import { toast } from "sonner";

import type { QuoteFormData } from "./CreateQuoteForm.types";

export function useQuoteSubmit(
  selectedCustomer: unknown,
  selectedPrescription: unknown,
  formData: QuoteFormData,
  selectedFrame: unknown,
  selectedNearFrame: unknown,
  lensType: "optical" | "contact",
  presbyopiaSolution: string,
  customerOwnFrame: boolean,
  customerOwnNearFrame: boolean,
  farLensFamilyId: string,
  nearLensFamilyId: string,
  farLensCost: number,
  nearLensCost: number,
  effectiveBranchId: string | undefined,
  initialFieldOperationId: string | undefined,
  onSuccess: () => void,
) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCustomer) {
      toast.error("Selecciona un cliente");
      return;
    }
    if (!selectedPrescription) {
      toast.error("Selecciona una receta");
      return;
    }

    if (lensType === "contact") {
      if (
        !formData.contact_lens_family_id &&
        formData.contact_lens_cost === 0
      ) {
        toast.error(
          "Selecciona una familia de lentes de contacto o ingresa el precio manualmente",
        );
        return;
      }
    } else {
      if (presbyopiaSolution === "two_separate") {
        if (!farLensFamilyId && !nearLensFamilyId && formData.lens_cost === 0) {
          toast.error(
            "Selecciona familias de lentes o ingresa el precio manualmente",
          );
          return;
        }
      } else if (!formData.lens_family_id && formData.lens_cost === 0) {
        toast.error(
          "Selecciona una familia de lentes o ingresa el precio manualmente",
        );
        return;
      }
    }

    setSaving(true);
    try {
      const expirationDate = new Date();
      expirationDate.setDate(
        expirationDate.getDate() + formData.expiration_days,
      );

      const headers: HeadersInit = {
        "Content-Type": "application/json",
        ...getBranchAndOperativoHeaders(
          effectiveBranchId ?? null,
          initialFieldOperationId,
        ),
      };

      const nearFrameDataPayload =
        presbyopiaSolution === "two_separate"
          ? {
              near_frame_product_id:
                (selectedNearFrame as unknown)?.id || null,
              near_frame_name:
                formData.near_frame_name ||
                (selectedNearFrame as unknown)?.name ||
                null,
              near_frame_brand:
                formData.near_frame_brand ||
                (selectedNearFrame as unknown)?.frame_brand ||
                null,
              near_frame_model:
                formData.near_frame_model ||
                (selectedNearFrame as unknown)?.frame_model ||
                null,
              near_frame_color:
                formData.near_frame_color ||
                (selectedNearFrame as unknown)?.frame_color ||
                null,
              near_frame_size:
                formData.near_frame_size ||
                (selectedNearFrame as unknown)?.frame_size ||
                null,
              near_frame_sku:
                formData.near_frame_sku ||
                (selectedNearFrame as unknown)?.sku ||
                null,
              near_frame_price:
                formData.near_frame_price ||
                (selectedNearFrame as unknown)?.price ||
                0,
              near_frame_price_includes_tax:
                formData.near_frame_price_includes_tax ??
                (selectedNearFrame as unknown)?.price_includes_tax ??
                false,
              near_frame_cost:
                formData.near_frame_cost ||
                (selectedNearFrame as unknown)?.price ||
                0,
              customer_own_near_frame: customerOwnNearFrame || false,
            }
          : {
              near_frame_product_id: null,
              near_frame_name: null,
              near_frame_brand: null,
              near_frame_model: null,
              near_frame_color: null,
              near_frame_size: null,
              near_frame_sku: null,
              near_frame_price: 0,
              near_frame_price_includes_tax: false,
              near_frame_cost: 0,
              customer_own_near_frame: false,
            };

      await quoteService.createQuote({
        customer_id: (selectedCustomer as unknown).id,
        status: "draft",
        subtotal: formData.subtotal,
        tax_amount: formData.tax_amount,
        discount_amount: formData.discount_amount,
        total_amount: formData.total_amount,
        valid_until: expirationDate.toISOString().split("T")[0],
        notes: formData.notes,
        branch_id: effectiveBranchId || undefined,
        field_operation_id: initialFieldOperationId || undefined,
        prescription_id: (selectedPrescription as unknown).id,
        frame_product_id: (selectedFrame as unknown)?.id,
        customer_own_frame: customerOwnFrame,
        frame_name: formData.frame_name,
        frame_brand: formData.frame_brand,
        frame_model: formData.frame_model,
        frame_color: formData.frame_color,
        frame_size: formData.frame_size,
        frame_sku: formData.frame_sku,
        frame_price: formData.frame_price,
        ...nearFrameDataPayload,
        lens_family_id:
          presbyopiaSolution === "two_separate"
            ? null
            : formData.lens_family_id || null,
        lens_type:
          lensType === "contact"
            ? "Lentes de contacto"
            : formData.lens_type || null,
        lens_material: formData.lens_material || null,
        lens_index:
          formData.lens_index !== null && formData.lens_index !== undefined
            ? formData.lens_index
            : null,
        lens_treatments: lensType === "contact" ? [] : formData.lens_treatments,
        lens_tint_color: formData.lens_tint_color || null,
        lens_tint_percentage: formData.lens_tint_percentage || null,
        lens_sourcing_type: formData.lens_sourcing_type || "surfaced",
        presbyopia_solution: formData.presbyopia_solution || "none",
        far_lens_family_id:
          presbyopiaSolution === "two_separate"
            ? farLensFamilyId || null
            : null,
        near_lens_family_id:
          presbyopiaSolution === "two_separate"
            ? nearLensFamilyId || null
            : null,
        far_lens_cost:
          presbyopiaSolution === "two_separate" ? farLensCost || 0 : undefined,
        near_lens_cost:
          presbyopiaSolution === "two_separate"
            ? nearLensCost || 0
            : undefined,
        contact_lens_family_id:
          lensType === "contact"
            ? formData.contact_lens_family_id || null
            : null,
        contact_lens_rx_sphere_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).od_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).od_cylinder ?? null)
            : null,
        contact_lens_rx_axis_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).od_axis ?? null)
            : null,
        contact_lens_rx_add_od:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).od_add ?? null)
            : null,
        contact_lens_rx_base_curve_od:
          lensType === "contact"
            ? formData.contact_lens_rx_base_curve_od
            : null,
        contact_lens_rx_diameter_od:
          lensType === "contact" ? formData.contact_lens_rx_diameter_od : null,
        contact_lens_rx_sphere_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).os_sphere ?? null)
            : null,
        contact_lens_rx_cylinder_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).os_cylinder ?? null)
            : null,
        contact_lens_rx_axis_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).os_axis ?? null)
            : null,
        contact_lens_rx_add_os:
          lensType === "contact" && selectedPrescription
            ? ((selectedPrescription as unknown).os_add ?? null)
            : null,
        contact_lens_rx_base_curve_os:
          lensType === "contact"
            ? formData.contact_lens_rx_base_curve_os
            : null,
        contact_lens_rx_diameter_os:
          lensType === "contact" ? formData.contact_lens_rx_diameter_os : null,
        contact_lens_quantity:
          lensType === "contact" ? formData.contact_lens_quantity || 1 : 1,
        contact_lens_cost:
          lensType === "contact" ? formData.contact_lens_cost || 0 : 0,
        contact_lens_price:
          lensType === "contact" ? formData.contact_lens_price || 0 : 0,
        frame_cost: formData.frame_cost,
        lens_cost: lensType === "contact" ? 0 : formData.lens_cost,
        treatments_cost:
          lensType === "contact" ? 0 : formData.treatments_cost,
        labor_cost: formData.labor_cost,
      });

      toast.success("Presupuesto creado exitosamente");
      onSuccess();
    } catch (error: unknown) {
      console.error("Error creating quote:", error);
      toast.error(
        (error as Error).message || "Error al crear presupuesto",
      );
    } finally {
      setSaving(false);
    }
  };

  return {
    loading,
    saving,
    setSaving,
    handleSubmit,
  };
}
