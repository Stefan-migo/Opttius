"use client";

import { useEffect, useState } from "react";
import type React from "react";

import { useLensPriceCalculation } from "@/hooks/useLensPriceCalculation";
import {
  contactLensFamilyService,
  contactLensMatrixService,
  lensFamilyService,
} from "@/lib/api/services";
import {
  getCylinder,
  getDefaultPresbyopiaSolution,
  getFarSphere,
  getMaxAddition,
  getNearSphere,
  hasAddition,
  type PresbyopiaSolution,
} from "@/lib/presbyopia-helpers";
import { toast } from "sonner";

import { MATERIAL_INDICES } from "./CreateQuoteForm.constants";
import type { QuoteFormData } from "./CreateQuoteForm.types";

export function useLensConfiguration(
  selectedPrescription: unknown,
  formData: QuoteFormData,
  setFormData: React.Dispatch<React.SetStateAction<QuoteFormData>>,
) {
  const { calculateLensPrice, loading: calculatingPrice } =
    useLensPriceCalculation();

  // Lens families and price calculation
  const [lensFamilies, setLensFamilies] = useState<unknown[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  // Contact lens families and price calculation
  const [contactLensFamilies, setContactLensFamilies] = useState<unknown[]>([]);
  const [loadingContactLensFamilies, setLoadingContactLensFamilies] =
    useState(false);
  const [lensType, setLensType] = useState<"optical" | "contact">("optical");
  const [calculatingContactLensPrice, setCalculatingContactLensPrice] =
    useState(false);

  // Presbyopia solution
  const [presbyopiaSolution, setPresbyopiaSolution] =
    useState<PresbyopiaSolution>("none");
  const [farLensFamilyId, setFarLensFamilyId] = useState<string>("");
  const [nearLensFamilyId, setNearLensFamilyId] = useState<string>("");
  const [farLensCost, setFarLensCost] = useState<number>(0);
  const [nearLensCost, setNearLensCost] = useState<number>(0);
  const [manualLensPrice, setManualLensPrice] = useState<boolean>(false);

  const fetchLensFamilies = async () => {
    try {
      setLoadingFamilies(true);
      const families = await lensFamilyService.getAll();
      setLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching lens families:", error);
    } finally {
      setLoadingFamilies(false);
    }
  };

  const fetchContactLensFamilies = async () => {
    try {
      setLoadingContactLensFamilies(true);
      const families = await contactLensFamilyService.getAll();
      setContactLensFamilies(families || []);
    } catch (error) {
      console.error("Error fetching contact lens families:", error);
    } finally {
      setLoadingContactLensFamilies(false);
    }
  };

  // Fetch families on mount
  useEffect(() => {
    fetchLensFamilies();
    fetchContactLensFamilies();
  }, []);

  // Lens family inheritance
  useEffect(() => {
    if (!formData.lens_family_id) return;
    const family = lensFamilies.find(
      (f: unknown) => (f as Record<string, unknown>).id === formData.lens_family_id,
    );
    if (!family) return;
    const materialIndex = (family as Record<string, unknown>).lens_material
      ? MATERIAL_INDICES[
          (family as Record<string, unknown>).lens_material as keyof typeof MATERIAL_INDICES
        ] || null
      : null;

    setFormData((prev) => ({
      ...prev,
      lens_type: ((family as Record<string, unknown>).lens_type as string) || prev.lens_type,
      lens_material: ((family as Record<string, unknown>).lens_material as string) || prev.lens_material,
      lens_index: materialIndex !== null ? materialIndex : prev.lens_index,
      lens_treatments: [],
      treatments_cost: 0,
    }));
  }, [formData.lens_family_id, lensFamilies, setFormData]);

  // Calculate lens price from matrix
  const calculateLensPriceFromMatrix = async () => {
    if (!formData.lens_family_id || !selectedPrescription) return;
    if (presbyopiaSolution === "two_separate") return;

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.lens_family_id)) return;

    const farSphere = getFarSphere(selectedPrescription as unknown);
    const cylinder = getCylinder(selectedPrescription as unknown);
    let addition: number | undefined;
    if (["progressive", "bifocal", "trifocal"].includes(presbyopiaSolution)) {
      addition = getMaxAddition(selectedPrescription as unknown);
    }

    try {
      await fetch(
        `/api/admin/lens-matrices/debug?lens_family_id=${formData.lens_family_id}&sphere=${farSphere}&cylinder=${cylinder}`,
      );
      const result = await calculateLensPrice({
        lens_family_id: formData.lens_family_id,
        sphere: farSphere,
        cylinder,
        addition,
      });
      if (result && result.price) {
        setFormData((prev) => ({ ...prev, lens_cost: result.price }));
      }
    } catch {
      // Silently fail — manual price entry available
    }
  };

  // Calculate contact lens price from matrix
  const calculateContactLensPriceFromMatrix = async () => {
    if (!formData.contact_lens_family_id || !selectedPrescription) return;
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(formData.contact_lens_family_id)) return;

    try {
      setCalculatingContactLensPrice(true);
      const sphereOD = (selectedPrescription as unknown).od_sphere || 0;
      const cylinderOD = (selectedPrescription as unknown).od_cylinder || 0;
      const axisOD = (selectedPrescription as unknown).od_axis || null;
      const additionOD = (selectedPrescription as unknown).od_add || null;

      const calculation = await contactLensMatrixService.calculate(
        formData.contact_lens_family_id,
        sphereOD,
        cylinderOD,
        axisOD,
        additionOD,
      );
      if (calculation && calculation.price) {
        const quantity = formData.contact_lens_quantity || 1;
        setFormData((prev) => ({
          ...prev,
          contact_lens_price: calculation.price * quantity,
          contact_lens_cost: calculation.cost * quantity,
        }));
      }
    } catch {
      toast.error("No se pudo calcular el precio del lente de contacto");
    } finally {
      setCalculatingContactLensPrice(false);
    }
  };

  // Detect presbyopia and set default solution
  useEffect(() => {
    if (selectedPrescription) {
      const hasAdd = hasAddition(selectedPrescription as unknown);
      if (hasAdd && presbyopiaSolution === "none") {
        const defaultSolution = getDefaultPresbyopiaSolution(
          selectedPrescription as unknown,
        );
        setPresbyopiaSolution(defaultSolution);
        setFormData((prev) => ({
          ...prev,
          presbyopia_solution: defaultSolution,
        }));
        if (["progressive", "bifocal", "trifocal"].includes(defaultSolution)) {
          setFormData((prev) => ({ ...prev, lens_type: defaultSolution }));
        }
      } else if (!hasAdd) {
        setPresbyopiaSolution("none");
        setFormData((prev) => ({ ...prev, presbyopia_solution: "none" }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrescription]);

  // Recalculate lens price when params change
  useEffect(() => {
    if (formData.lens_family_id && selectedPrescription) {
      const timer = setTimeout(() => {
        calculateLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.lens_family_id,
    (selectedPrescription as unknown)?.id,
    presbyopiaSolution,
  ]);

  // Recalculate contact lens price
  useEffect(() => {
    if (
      formData.contact_lens_family_id &&
      selectedPrescription &&
      lensType === "contact"
    ) {
      const timer = setTimeout(() => {
        calculateContactLensPriceFromMatrix();
      }, 50);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.contact_lens_family_id,
    formData.contact_lens_quantity,
    (selectedPrescription as unknown)?.id,
    lensType,
  ]);

  // Calculate prices for two separate lenses
  useEffect(() => {
    if (presbyopiaSolution === "two_separate" && selectedPrescription) {
      const calculateTwoLenses = async () => {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        if (farLensFamilyId && uuidRegex.test(farLensFamilyId)) {
          const farSphere = getFarSphere(selectedPrescription as unknown);
          const cylinder = getCylinder(selectedPrescription as unknown);
          try {
            const result = await calculateLensPrice({
              lens_family_id: farLensFamilyId,
              sphere: farSphere,
              cylinder,
            });
            if (result && result.price) {
              setFarLensCost(result.price);
              setFormData((prev) => ({ ...prev, far_lens_cost: result.price }));
            }
          } catch {
            /* silent */
          }
        }

        if (nearLensFamilyId && uuidRegex.test(nearLensFamilyId)) {
          const nearSphere = getNearSphere(selectedPrescription as unknown);
          const cylinder = getCylinder(selectedPrescription as unknown);
          try {
            const result = await calculateLensPrice({
              lens_family_id: nearLensFamilyId,
              sphere: nearSphere,
              cylinder,
            });
            if (result && result.price) {
              setNearLensCost(result.price);
              setFormData((prev) => ({
                ...prev,
                near_lens_cost: result.price,
              }));
            }
          } catch {
            /* silent */
          }
        }

        const totalLensCost = (farLensCost || 0) + (nearLensCost || 0);
        setFormData((prev) => ({ ...prev, lens_cost: totalLensCost }));
      };
      calculateTwoLenses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    farLensFamilyId,
    nearLensFamilyId,
    selectedPrescription,
    presbyopiaSolution,
  ]);

  return {
    lensFamilies,
    setLensFamilies,
    loadingFamilies,
    lensType,
    setLensType,
    contactLensFamilies,
    setContactLensFamilies,
    loadingContactLensFamilies,
    calculatingContactLensPrice,
    setCalculatingContactLensPrice,
    presbyopiaSolution,
    setPresbyopiaSolution,
    farLensFamilyId,
    setFarLensFamilyId,
    nearLensFamilyId,
    setNearLensFamilyId,
    farLensCost,
    setFarLensCost,
    nearLensCost,
    setNearLensCost,
    manualLensPrice,
    setManualLensPrice,
    calculatingPrice,
    calculateLensPriceFromMatrix,
    calculateContactLensPriceFromMatrix,
  };
}
