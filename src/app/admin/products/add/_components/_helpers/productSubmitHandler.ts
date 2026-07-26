import { toast } from "sonner";

import type { CreateProductData } from "@/lib/api/services";
import { productService } from "@/lib/api/services";

interface FormData {
  name: string;
  slug: string;
  price: string;
  cost_price: string;
  price_includes_tax: boolean;
  category_id: string;
  featured_image: string;
  tags: string[];
  stock_quantity: string;
  low_stock_threshold: string;
  is_featured: boolean;
  status: string;
  product_type: string;
  sku: string;
  barcode: string;
  brand: string;
  manufacturer: string;
  model_number: string;
  short_description: string;
  [key: string]: unknown;
}

interface FrameMeasurements {
  lens_width: string;
  bridge_width: string;
  temple_length: string;
  lens_height: string;
  total_width: string;
}

interface PrescriptionRange {
  sph_min: string;
  sph_max: string;
  cyl_min: string;
  cyl_max: string;
  add_min: string;
  add_max: string;
}

function buildFrameMeasurements(measurements: FrameMeasurements) {
  return measurements.lens_width || measurements.bridge_width || measurements.temple_length
    ? {
        lens_width: measurements.lens_width ? parseInt(measurements.lens_width) : null,
        bridge_width: measurements.bridge_width ? parseInt(measurements.bridge_width) : null,
        temple_length: measurements.temple_length ? parseInt(measurements.temple_length) : null,
        lens_height: measurements.lens_height ? parseInt(measurements.lens_height) : null,
        total_width: measurements.total_width ? parseInt(measurements.total_width) : null,
      }
    : null;
}

function buildPrescriptionRange(prescriptionAvailable: boolean, range: PrescriptionRange) {
  return prescriptionAvailable &&
    (range.sph_min || range.sph_max || range.cyl_min || range.cyl_max || range.add_min || range.add_max)
    ? {
        sph_min: range.sph_min ? parseFloat(range.sph_min) : null,
        sph_max: range.sph_max ? parseFloat(range.sph_max) : null,
        cyl_min: range.cyl_min ? parseFloat(range.cyl_min) : null,
        cyl_max: range.cyl_max ? parseFloat(range.cyl_max) : null,
        add_min: range.add_min ? parseFloat(range.add_min) : null,
        add_max: range.add_max ? parseFloat(range.add_max) : null,
      }
    : null;
}

export async function handleProductSubmit(
  formData: FormData,
  currentBranchId: string | null,
  isSuperAdmin: boolean,
  status: string = "active",
) {
  if (!currentBranchId && !isSuperAdmin) {
    toast.error("Debes seleccionar una sucursal para crear productos");
    return;
  }

  const priceStr = String(formData.price || "").trim();
  const priceValue = priceStr ? parseFloat(priceStr) : NaN;

  if (!priceStr || isNaN(priceValue) || priceValue < 0) {
    toast.error("El precio es requerido y debe ser un número válido mayor o igual a 0");
    return;
  }

  const frameMeasurements = buildFrameMeasurements(formData.frame_measurements as FrameMeasurements);
  const prescriptionRange = buildPrescriptionRange(
    !!formData.prescription_available,
    formData.prescription_range as PrescriptionRange,
  );

  const productData: Record<string, unknown> = {
    name: formData.name,
    slug: formData.slug,
    short_description: formData.short_description || null,
    price: priceValue,
    cost_price: formData.cost_price ? parseFloat(String(formData.cost_price)) : null,
    price_includes_tax: formData.price_includes_tax || false,
    category_id: formData.category_id || null,
    branch_id: currentBranchId,
    stock_quantity: formData.stock_quantity ? parseInt(String(formData.stock_quantity)) : 0,
    low_stock_threshold: formData.low_stock_threshold ? parseInt(String(formData.low_stock_threshold)) : 5,
    status,
    featured_image: formData.featured_image || null,
    tags: formData.tags || [],
    is_featured: formData.is_featured || false,
    published_at: status === "active" ? new Date().toISOString() : null,
    product_type: formData.product_type || "frame",
    sku: formData.sku || null,
    barcode: formData.barcode || null,
    brand: formData.brand || null,
    manufacturer: formData.manufacturer || null,
    model_number: formData.model_number || null,
    frame_type: formData.frame_type || null,
    frame_material: formData.frame_material || null,
    frame_shape: formData.frame_shape || null,
    frame_color: formData.frame_color || null,
    frame_colors: (formData.frame_colors as string[]) || [],
    frame_brand: formData.frame_brand || null,
    frame_model: formData.frame_model || null,
    frame_sku: formData.frame_sku || null,
    frame_gender: formData.frame_gender || null,
    frame_age_group: formData.frame_age_group || null,
    frame_size: formData.frame_size || null,
    frame_features: (formData.frame_features as string[]) || [],
    frame_measurements: frameMeasurements,
    lens_type: formData.lens_type || null,
    lens_material: formData.lens_material || null,
    lens_index: formData.lens_index ? parseFloat(String(formData.lens_index)) : null,
    lens_coatings: (formData.lens_coatings as string[]) || [],
    lens_tint_options: (formData.lens_tint_options as string[]) || [],
    uv_protection: formData.uv_protection || null,
    blue_light_filter: formData.blue_light_filter || false,
    blue_light_filter_percentage: formData.blue_light_filter_percentage
      ? parseInt(String(formData.blue_light_filter_percentage))
      : null,
    photochromic: formData.photochromic || false,
    prescription_available: formData.prescription_available || false,
    prescription_range: prescriptionRange,
    requires_prescription: formData.requires_prescription || false,
    is_customizable: formData.is_customizable || false,
    warranty_months: formData.warranty_months ? parseInt(String(formData.warranty_months)) : null,
    warranty_details: formData.warranty_details || null,
  };

  Object.keys(productData).forEach((key) => {
    const value = productData[key];
    if (value === undefined) {
      delete productData[key];
    } else if (typeof value === "string" && value.trim() === "" && key !== "price") {
      productData[key] = null;
    }
  });

  if (productData.price === null || productData.price === undefined || isNaN(productData.price as number)) {
    toast.error("Error: El precio no es válido. Por favor, verifica el formulario.");
    return;
  }

  await productService.createProduct(productData as CreateProductData);
  toast.success("Producto creado exitosamente");
}
