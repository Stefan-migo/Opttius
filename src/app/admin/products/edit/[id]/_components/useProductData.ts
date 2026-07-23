import { useEffect } from "react";

import type { Category } from "@/app/admin/products/hooks/useCategories";
import { productService } from "@/lib/api/services";
import { appLogger } from "@/lib/logger";

import type { FormState } from "./types";
export function useProductData(
  productId: string | undefined,
  currentBranchId: string | null | undefined,
  isSuperAdmin: boolean,
  setFormData: (data: FormState) => void,
  setInitialData: (data: FormState) => void,
  setCategories: (categories: Category[]) => void,
  setError: (err: string | null) => void,
  setLoading: (v: boolean) => void,
) {
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const productData = await productService.getProduct(
          productId!,
          currentBranchId || undefined,
        );

        const categoriesResponse = await fetch("/api/categories");
        if (!categoriesResponse.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categoriesData = await categoriesResponse.json();

        const product = productData;

        let stockQuantity = "0";
        let lowStockThreshold = "5";
        if (
          product.product_branch_stock &&
          Array.isArray(product.product_branch_stock) &&
          product.product_branch_stock.length > 0
        ) {
          const stockRecord = product.product_branch_stock[0];
          const stockQty = stockRecord.quantity;
          stockQuantity =
            stockQty !== null && stockQty !== undefined
              ? stockQty.toString()
              : "0";
          lowStockThreshold =
            stockRecord.low_stock_threshold !== null &&
            stockRecord.low_stock_threshold !== undefined
              ? stockRecord.low_stock_threshold.toString()
              : "5";
        } else if (
          product.inventory_quantity !== undefined &&
          product.inventory_quantity !== null
        ) {
          stockQuantity = product.inventory_quantity.toString();
        }

        const transformedFrameMeasurements = {
          lens_width: product.frame_measurements?.lens_width?.toString() || "",
          bridge_width:
            product.frame_measurements?.bridge_width?.toString() || "",
          temple_length:
            product.frame_measurements?.temple_length?.toString() || "",
          lens_height:
            product.frame_measurements?.lens_height?.toString() || "",
          total_width:
            product.frame_measurements?.total_width?.toString() || "",
        };

        const transformedPrescriptionRange = {
          sph_min: product.prescription_range?.sph_min?.toString() || "",
          sph_max: product.prescription_range?.sph_max?.toString() || "",
          cyl_min: product.prescription_range?.cyl_min?.toString() || "",
          cyl_max: product.prescription_range?.cyl_max?.toString() || "",
          add_min: product.prescription_range?.add_min?.toString() || "",
          add_max: product.prescription_range?.add_max?.toString() || "",
        };

        const uvProtectionValue =
          typeof product.uv_protection === "string"
            ? product.uv_protection
            : product.uv_protection
              ? "true"
              : "";

        const initialFormData: FormState = {
          name: product.name || "",
          slug: product.slug || "",
          short_description: product.short_description || "",
          description: product.description || "",
          price: product.price?.toString() || "",
          price_includes_tax: product.price_includes_tax === true,
          category_id: product.category_id || "",
          featured_image: product.featured_image || "",
          gallery: product.gallery || [],
          stock_quantity: stockQuantity,
          low_stock_threshold: lowStockThreshold,
          is_featured: product.is_featured || false,
          status: product.status || "active",
          product_type: product.product_type || "frame",
          sku: product.sku || "",
          barcode: product.barcode || "",
          brand: product.brand || "",
          manufacturer: product.manufacturer || "",
          model_number: product.model_number || "",
          frame_type: product.frame_type || "",
          frame_material: product.frame_material || "",
          frame_shape: product.frame_shape || "",
          frame_color: product.frame_color || "",
          frame_colors: product.frame_colors || [],
          frame_brand: product.frame_brand || "",
          frame_model: product.frame_model || "",
          frame_sku: product.frame_sku || "",
          frame_gender: product.frame_gender || "",
          frame_age_group: product.frame_age_group || "",
          frame_size: product.frame_size || "",
          frame_features: product.frame_features || [],
          frame_measurements: transformedFrameMeasurements,
          lens_type: product.lens_type || "",
          lens_material: product.lens_material || "",
          lens_index: product.lens_index?.toString() || "",
          lens_coatings: product.lens_coatings || [],
          lens_tint_options: product.lens_tint_options || [],
          uv_protection: uvProtectionValue,
          blue_light_filter: product.blue_light_filter || false,
          blue_light_filter_percentage:
            product.blue_light_filter_percentage?.toString() || "",
          photochromic: product.photochromic || false,
          prescription_available: product.prescription_available || false,
          prescription_range: transformedPrescriptionRange,
          requires_prescription: product.requires_prescription || false,
          is_customizable: product.is_customizable || false,
          warranty_months: product.warranty_months?.toString() || "",
          warranty_details: product.warranty_details || "",
        };

        setFormData(initialFormData);
        setInitialData(initialFormData);
        setCategories(categoriesData.categories || []);
        setError(null);
      } catch (err) {
        appLogger.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId, currentBranchId, isSuperAdmin]);
}
