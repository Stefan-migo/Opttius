import type { QueryClient } from "@tanstack/react-query";

import type { UpdateProductData } from "@/lib/api/services";
import { productService } from "@/lib/api/services";
import { appLogger } from '@/lib/logger';

import type { FormState } from "./types";
export async function handleSubmitProduct(
  e: React.FormEvent | undefined,
  status: string | undefined,
  formData: FormState,
  productId: string,
  currentBranchId: string | null | undefined,
  isSuperAdmin: boolean,
  queryClient: QueryClient,
  onSuccess: () => void,
  onError: (msg: string) => void,
  setSaving: (v: boolean) => void,
) {
  if (e && e.preventDefault) e.preventDefault();
  setSaving(true);

  try {
    const frameMeasurements =
      formData.frame_measurements.lens_width ||
      formData.frame_measurements.bridge_width ||
      formData.frame_measurements.temple_length
        ? {
            lens_width: formData.frame_measurements.lens_width
              ? parseInt(formData.frame_measurements.lens_width)
              : null,
            bridge_width: formData.frame_measurements.bridge_width
              ? parseInt(formData.frame_measurements.bridge_width)
              : null,
            temple_length: formData.frame_measurements.temple_length
              ? parseInt(formData.frame_measurements.temple_length)
              : null,
            lens_height: formData.frame_measurements.lens_height
              ? parseInt(formData.frame_measurements.lens_height)
              : null,
            total_width: formData.frame_measurements.total_width
              ? parseInt(formData.frame_measurements.total_width)
              : null,
          }
        : null;

    const prescriptionRange =
      formData.prescription_available &&
      (formData.prescription_range.sph_min ||
        formData.prescription_range.sph_max ||
        formData.prescription_range.cyl_min ||
        formData.prescription_range.cyl_max ||
        formData.prescription_range.add_min ||
        formData.prescription_range.add_max)
        ? {
            sph_min: formData.prescription_range.sph_min
              ? parseFloat(formData.prescription_range.sph_min)
              : null,
            sph_max: formData.prescription_range.sph_max
              ? parseFloat(formData.prescription_range.sph_max)
              : null,
            cyl_min: formData.prescription_range.cyl_min
              ? parseFloat(formData.prescription_range.cyl_min)
              : null,
            cyl_max: formData.prescription_range.cyl_max
              ? parseFloat(formData.prescription_range.cyl_max)
              : null,
            add_min: formData.prescription_range.add_min
              ? parseFloat(formData.prescription_range.add_min)
              : null,
            add_max: formData.prescription_range.add_max
              ? parseFloat(formData.prescription_range.add_max)
              : null,
          }
        : null;

    const isGlobalMode = !currentBranchId || currentBranchId === "global";
    const productData = {
      ...formData,
      status: status || formData.status,
      price: parseFloat(formData.price),
      price_includes_tax: formData.price_includes_tax === true,
      ...(isGlobalMode
        ? {}
        : {
            stock_quantity: formData.stock_quantity
              ? parseInt(String(formData.stock_quantity))
              : 0,
            low_stock_threshold: formData.low_stock_threshold
              ? parseInt(String(formData.low_stock_threshold))
              : 5,
            branch_id: currentBranchId,
          }),
      frame_measurements: frameMeasurements,
      prescription_range: prescriptionRange,
      lens_index: formData.lens_index ? parseFloat(formData.lens_index) : null,
      warranty_months: formData.warranty_months
        ? parseInt(formData.warranty_months)
        : null,
      blue_light_filter_percentage: formData.blue_light_filter_percentage
        ? parseInt(formData.blue_light_filter_percentage)
        : null,
      optical_category: undefined,
      skin_type: undefined,
      benefits: undefined,
      certifications: undefined,
      ingredients: undefined,
      usage_instructions: undefined,
      precautions: undefined,
      package_characteristics: undefined,
    };

    // ponytail: direct cast to UpdateProductData fails due to FormState structural
    // mismatch (string vs number fields). Using double cast to document intent.
    await productService.updateProduct(
      productId,
      productData as UpdateProductData,
      currentBranchId || (isSuperAdmin ? "global" : undefined),
    );

    queryClient.invalidateQueries({ queryKey: ["products"] });
    queryClient.invalidateQueries({ queryKey: ["productStats"] });

    onSuccess();
  } catch (error) {
    appLogger.error("Error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Error al actualizar el producto";
    onError(errorMessage);
  } finally {
    setSaving(false);
  }
}
