"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranch } from "@/hooks/useBranch";
import { useProductOptions } from "@/hooks/useProductOptions";

import { ProductBasicInfo } from "./ProductBasicInfo";
import { ProductEditHeader } from "./ProductEditHeader";
import { ProductFrameSpecs } from "./ProductFrameSpecs";
import { ProductImagesSection } from "./ProductImagesSection";
import { ProductInventorySection } from "./ProductInventorySection";
import { ProductLensSpecs } from "./ProductLensSpecs";
import { useProductOptions as useFormattedOptions } from "./productOptions";
import { ProductPricingSection } from "./ProductPricingSection";
import { handleSubmitProduct } from "./productSubmitHandler";
import { ProductWarrantySection } from "./ProductWarrantySection";
import { defaultFormState, type FormState } from "./types";
import { useProductData } from "./useProductData";

export default function EditProductContent() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { currentBranchId, isSuperAdmin } = useBranch();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<unknown[]>([]);
  const { options: productOptions, loading: optionsLoading } =
    useProductOptions();

  const [formData, setFormData] = useState<FormState>(defaultFormState);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<FormState | null>(null);

  const {
    productTypes,
    frameTypes,
    frameMaterials,
    frameShapes,
    frameGenders,
    frameSizes,
    frameFeatures,
    lensTypes,
    lensMaterials,
    lensCoatings,
    uvProtectionLevels,
  } = useFormattedOptions(productOptions, optionsLoading);

  useProductData(
    productId,
    currentBranchId,
    isSuperAdmin,
    setFormData,
    setInitialData,
    setCategories,
    setError,
    setLoading,
  );

  const updateFormData = (updates: Record<string, unknown>) => {
    setFormData((prev) => {
      const newData = { ...prev, ...updates } as FormState;

      if (initialData) {
        const hasFormChanges =
          JSON.stringify(newData) !== JSON.stringify(initialData);
        setHasChanges(hasFormChanges);
      }

      return newData;
    });
  };

  const handleInputChange = (field: string, value: unknown) => {
    updateFormData({
      [field]: value,
    });
  };

  const addToArray = (field: string, value: string) => {
    const currentArray = formData[field as keyof typeof formData] as string[];
    if (!currentArray.includes(value)) {
      updateFormData({
        [field]: [...currentArray, value],
      });
    }
  };

  const removeFromArray = (field: string, value: string) => {
    const currentArray = formData[field as keyof typeof formData] as string[];
    updateFormData({
      [field]: currentArray.filter((item) => item !== value),
    });
  };

  const updateFrameMeasurement = (field: string, value: string) => {
    updateFormData({
      frame_measurements: {
        ...formData.frame_measurements,
        [field]: value,
      },
    });
  };

  const updatePrescriptionRange = (field: string, value: string) => {
    updateFormData({
      prescription_range: {
        ...formData.prescription_range,
        [field]: value,
      },
    });
  };

  const handleSubmit = async (e?: React.FormEvent, status?: string) => {
    void handleSubmitProduct(
      e,
      status,
      formData,
      productId,
      currentBranchId,
      isSuperAdmin,
      queryClient,
      () => {
        toast.success("Producto actualizado exitosamente");
        router.push("/admin/products");
      },
      (msg) => toast.error(msg),
      setSaving,
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="h-96 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Button asChild size="sm" variant="ghost">
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Productos
            </Link>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-600 mb-2">
                Error al cargar producto
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 max-w-4xl min-w-0">
      <ProductEditHeader
        hasChanges={hasChanges}
        name={formData.name}
        saving={saving}
        onSave={handleSubmit}
      />

      <form className="space-y-6 min-w-0" onSubmit={handleSubmit}>
        <ProductBasicInfo
          barcode={formData.barcode}
          brand={formData.brand}
          categories={categories}
          categoryId={formData.category_id}
          description={formData.description}
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

        <ProductPricingSection
          price={formData.price}
          priceIncludesTax={formData.price_includes_tax}
          onFieldChange={handleInputChange}
        />

        <ProductInventorySection
          currentBranchId={currentBranchId}
          lowStockThreshold={formData.low_stock_threshold}
          stockQuantity={formData.stock_quantity}
          onFieldChange={handleInputChange}
        />

        <ProductImagesSection
          featuredImage={formData.featured_image}
          onFieldChange={handleInputChange}
        />

        {formData.product_type === "frame" && (
          <ProductFrameSpecs
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
          <ProductLensSpecs
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

        <ProductWarrantySection
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
