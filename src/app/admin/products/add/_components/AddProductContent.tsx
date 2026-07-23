"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useCategories } from "@/app/admin/products/hooks/useCategories";
import { useBranch } from "@/hooks/useBranch";
import { useProtectedForm } from "@/hooks/useFormProtection";
import { useProductOptions } from "@/hooks/useProductOptions";

import {
  ALLOWED_LENS_TYPES,
  DEFAULT_FRAME_FEATURES,
  DEFAULT_LENS_COATINGS,
  FRAME_GENDER_OPTIONS,
  FRAME_MATERIAL_OPTIONS,
  FRAME_SHAPE_OPTIONS,
  FRAME_SIZE_OPTIONS,
  FRAME_TYPE_OPTIONS,
  generateSlug,
  LENS_MATERIAL_OPTIONS,
  LENS_TYPE_OPTIONS,
  PRODUCT_TYPE_OPTIONS,
  UV_PROTECTION_OPTIONS,
} from "./_helpers/productOptionLists";
import { handleProductSubmit } from "./_helpers/productSubmitHandler";
import { AddProductBasicInfo } from "./AddProductBasicInfo";
import { AddProductFrameSpecs } from "./AddProductFrameSpecs";
import { AddProductImagesSection } from "./AddProductImagesSection";
import { AddProductInventorySection } from "./AddProductInventorySection";
import { AddProductLensSpecs } from "./AddProductLensSpecs";
import { AddProductPricingSection } from "./AddProductPricingSection";
import { AddProductWarrantySection } from "./AddProductWarrantySection";
import { ProductAddHeader } from "./ProductAddHeader";

const INITIAL_FORM_DATA = {
  name: "", slug: "", short_description: "",
  price: "", cost_price: "", price_includes_tax: false,
  category_id: "", featured_image: "", tags: [] as string[],
  stock_quantity: "0", low_stock_threshold: "5",
  is_featured: false, status: "active", product_type: "frame",
  sku: "", barcode: "", brand: "", manufacturer: "", model_number: "",
  frame_type: "", frame_material: "", frame_shape: "", frame_color: "",
  frame_colors: [] as string[], frame_brand: "", frame_model: "",
  frame_sku: "", frame_gender: "", frame_age_group: "", frame_size: "",
  frame_features: [] as string[],
  frame_measurements: { lens_width: "", bridge_width: "", temple_length: "", lens_height: "", total_width: "" },
  lens_type: "", lens_material: "", lens_index: "",
  lens_coatings: [] as string[], lens_tint_options: [] as string[],
  uv_protection: "", blue_light_filter: false, blue_light_filter_percentage: "",
  photochromic: false, prescription_available: false,
  prescription_range: { sph_min: "", sph_max: "", cyl_min: "", cyl_max: "", add_min: "", add_max: "" },
  requires_prescription: false, is_customizable: false, warranty_months: "", warranty_details: "",
};

export default function AddProductContent() {
  const router = useRouter();
  const { currentBranchId, isSuperAdmin } = useBranch();
  const [loading, setLoading] = useState(false);
  const { categories } = useCategories();
  const { options: productOptions, loading: optionsLoading } = useProductOptions();

  const { formData, updateFormData, hasChanges, markAsSaving, markAsSaved } =
    useProtectedForm(INITIAL_FORM_DATA);

  const getOptions = (fieldKey: string, fallback: unknown[] = []) => {
    if (optionsLoading) return fallback;
    const dbOptions = productOptions[fieldKey];
    return dbOptions?.length ? dbOptions.map((opt) => ({ value: opt.value, label: opt.label })) : fallback;
  };

  const productTypes = getOptions("product_type", PRODUCT_TYPE_OPTIONS);
  const frameTypes = getOptions("frame_type", FRAME_TYPE_OPTIONS);
  const frameMaterials = getOptions("frame_material", FRAME_MATERIAL_OPTIONS);
  const frameShapes = getOptions("frame_shape", FRAME_SHAPE_OPTIONS);
  const frameGenders = getOptions("frame_gender", FRAME_GENDER_OPTIONS);
  const frameSizes = getOptions("frame_size", FRAME_SIZE_OPTIONS);
  const frameFeatures = productOptions["frame_features"]?.map((opt) => opt.value) || DEFAULT_FRAME_FEATURES;
  const allLensTypes = getOptions("lens_type", LENS_TYPE_OPTIONS);
  const lensTypes = (allLensTypes as { value: string; label: string }[]).filter(
    (t) => ALLOWED_LENS_TYPES.includes(t.value),
  );
  const lensMaterials = getOptions("lens_material", LENS_MATERIAL_OPTIONS);
  const lensCoatings = productOptions["lens_coatings"]?.map((opt) => opt.value) || DEFAULT_LENS_COATINGS;
  const uvProtectionLevels = getOptions("uv_protection", UV_PROTECTION_OPTIONS);

  const handleInputChange = (field: string, value: unknown) => {
    updateFormData({ [field]: value, ...(field === "name" && value ? { slug: generateSlug(value as string) } : {}) });
  };

  const addToArray = (field: string, value: string) => {
    const arr = formData[field as keyof typeof formData] as string[];
    if (!arr.includes(value)) updateFormData({ [field]: [...arr, value] });
  };

  const removeFromArray = (field: string, value: string) => {
    const arr = formData[field as keyof typeof formData] as string[];
    updateFormData({ [field]: arr.filter((i) => i !== value) });
  };

  const updateFrameMeasurement = (field: string, value: string) =>
    updateFormData({ frame_measurements: { ...formData.frame_measurements, [field]: value } });

  const updatePrescriptionRange = (field: string, value: string) =>
    updateFormData({ prescription_range: { ...formData.prescription_range, [field]: value } });

  const handleSubmit = async (e?: React.FormEvent, status: string = "active") => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true);
    markAsSaving();
    try {
      await handleProductSubmit(formData as Record<string, unknown> as never, currentBranchId, isSuperAdmin, status);
      markAsSaved();
      router.push("/admin/products");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al crear el producto");
      markAsSaved();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-4xl">
      <ProductAddHeader
        hasChanges={hasChanges}
        saving={loading}
        onSave={handleSubmit}
      />

      <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
        <AddProductBasicInfo
          barcode={formData.barcode}
          brand={formData.brand}
          categories={categories}
          categoryId={formData.category_id}
          manufacturer={formData.manufacturer}
          modelNumber={formData.model_number}
          name={formData.name}
          productType={formData.product_type}
          productTypes={productTypes}
          shortDescription={formData.short_description}
          sku={formData.sku}
          slug={formData.slug}
          status={formData.status}
          onFieldChange={handleInputChange}
        />

        <AddProductPricingSection
          price={formData.price}
          priceIncludesTax={formData.price_includes_tax}
          onFieldChange={handleInputChange}
        />

        <AddProductInventorySection
          currentBranchId={currentBranchId}
          lowStockThreshold={formData.low_stock_threshold}
          stockQuantity={formData.stock_quantity}
          onFieldChange={handleInputChange}
        />

        <AddProductImagesSection
          featuredImage={formData.featured_image}
          onFieldChange={handleInputChange}
        />

        {formData.product_type === "frame" && (
          <AddProductFrameSpecs
            frameColor={formData.frame_color}
            frameFeatures={formData.frame_features}
            frameFeaturesOptions={frameFeatures}
            frameGender={formData.frame_gender}
            frameGenders={frameGenders}
            frameMaterial={formData.frame_material}
            frameMaterials={frameMaterials}
            frameMeasurements={formData.frame_measurements}
            frameShape={formData.frame_shape}
            frameShapes={frameShapes}
            frameSize={formData.frame_size}
            frameSizes={frameSizes}
            frameType={formData.frame_type}
            frameTypes={frameTypes}
            onAddToArray={addToArray}
            onFieldChange={handleInputChange}
            onRemoveFromArray={removeFromArray}
            onUpdateFrameMeasurement={updateFrameMeasurement}
          />
        )}

        {formData.product_type === "lens" && (
          <AddProductLensSpecs
            blueLightFilter={formData.blue_light_filter}
            blueLightFilterPercentage={formData.blue_light_filter_percentage}
            lensCoatingOptions={lensCoatings}
            lensCoatings={formData.lens_coatings}
            lensIndex={formData.lens_index}
            lensMaterial={formData.lens_material}
            lensMaterials={lensMaterials}
            lensType={formData.lens_type}
            lensTypes={lensTypes}
            photochromic={formData.photochromic}
            prescriptionAvailable={formData.prescription_available}
            prescriptionRange={formData.prescription_range}
            uvProtection={formData.uv_protection}
            uvProtectionLevels={uvProtectionLevels}
            onAddToArray={addToArray}
            onFieldChange={handleInputChange}
            onRemoveFromArray={removeFromArray}
            onUpdatePrescriptionRange={updatePrescriptionRange}
          />
        )}

        <AddProductWarrantySection
          isCustomizable={formData.is_customizable}
          requiresPrescription={formData.requires_prescription}
          warrantyDetails={formData.warranty_details}
          warrantyMonths={formData.warranty_months}
          onFieldChange={handleInputChange}
        />
      </form>
    </div>
  );
}
