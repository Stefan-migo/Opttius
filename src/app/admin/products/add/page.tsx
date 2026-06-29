"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useCategories } from "@/app/admin/products/hooks/useCategories";
import { useBranch } from "@/hooks/useBranch";
import { useProtectedForm } from "@/hooks/useFormProtection";
import { useProductOptions } from "@/hooks/useProductOptions";
import { productService } from "@/lib/api/services";

import { AddProductBasicInfo } from "./_components/AddProductBasicInfo";
import { AddProductFrameSpecs } from "./_components/AddProductFrameSpecs";
import { AddProductImagesSection } from "./_components/AddProductImagesSection";
import { AddProductInventorySection } from "./_components/AddProductInventorySection";
import { AddProductLensSpecs } from "./_components/AddProductLensSpecs";
import { AddProductPricingSection } from "./_components/AddProductPricingSection";
import { ProductAddHeader } from "./_components/ProductAddHeader";
import { AddProductWarrantySection } from "./_components/AddProductWarrantySection";

export default function AddProductPage() {
  const router = useRouter();
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const [loading, setLoading] = useState(false);
  const { categories } = useCategories();
  const { options: productOptions, loading: optionsLoading } =
    useProductOptions();

  // 🚀 Protected form state with auto data-loss prevention
  const {
    formData,
    updateFormData,
    hasChanges,
    markAsSaving,
    markAsSaved,
    resetForm,
  } = useProtectedForm({
    name: "",
    slug: "",
    short_description: "",
    price: "",
    cost_price: "",
    price_includes_tax: false,
    category_id: "",
    featured_image: "",
    tags: [] as string[],
    stock_quantity: "0", // Changed from inventory_quantity - now managed in product_branch_stock
    low_stock_threshold: "5", // Umbral de alerta de stock bajo por sucursal
    is_featured: false,
    status: "active",
    // Optical product fields
    product_type: "frame",
    sku: "",
    barcode: "",
    brand: "",
    manufacturer: "",
    model_number: "",
    // Frame fields
    frame_type: "",
    frame_material: "",
    frame_shape: "",
    frame_color: "",
    frame_colors: [] as string[],
    frame_brand: "",
    frame_model: "",
    frame_sku: "",
    frame_gender: "",
    frame_age_group: "",
    frame_size: "",
    frame_features: [] as string[],
    frame_measurements: {
      lens_width: "",
      bridge_width: "",
      temple_length: "",
      lens_height: "",
      total_width: "",
    },
    // Lens fields
    lens_type: "",
    lens_material: "",
    lens_index: "",
    lens_coatings: [] as string[],
    lens_tint_options: [] as string[],
    uv_protection: "",
    blue_light_filter: false,
    blue_light_filter_percentage: "",
    photochromic: false,
    prescription_available: false,
    prescription_range: {
      sph_min: "",
      sph_max: "",
      cyl_min: "",
      cyl_max: "",
      add_min: "",
      add_max: "",
    },
    requires_prescription: false,
    is_customizable: false,
    warranty_months: "",
    warranty_details: "",
  });

  // Helper function to get options from database or fallback to defaults
  const getOptions = (fieldKey: string, fallback: unknown[] = []) => {
    if (optionsLoading) return fallback;
    const dbOptions = productOptions[fieldKey];
    if (dbOptions && dbOptions.length > 0) {
      return dbOptions.map((opt) => ({ value: opt.value, label: opt.label }));
    }
    return fallback;
  };

  // Get options from database, with fallbacks for backwards compatibility
  const productTypes = getOptions("product_type", [
    { value: "frame", label: "Armazón" },
    { value: "lens", label: "Lente" },
    { value: "accessory", label: "Accesorio" },
    { value: "service", label: "Servicio" },
  ]);

  // Filtered lens types - only for reading glasses, sunglasses, and safety glasses
  const allowedLensTypes = ["reading", "sunglasses", "safety"];

  const frameTypes = getOptions("frame_type", [
    { value: "full_frame", label: "Marco Completo" },
    { value: "half_frame", label: "Media Montura" },
    { value: "rimless", label: "Sin Marco" },
    { value: "semi_rimless", label: "Semi Sin Marco" },
    { value: "browline", label: "Browline" },
    { value: "cat_eye", label: "Ojo de Gato" },
    { value: "aviator", label: "Aviador" },
    { value: "round", label: "Redondo" },
    { value: "square", label: "Cuadrado" },
    { value: "rectangular", label: "Rectangular" },
    { value: "oval", label: "Oval" },
    { value: "geometric", label: "Geométrico" },
  ]);

  const frameMaterials = getOptions("frame_material", [
    { value: "acetate", label: "Acetato" },
    { value: "metal", label: "Metal" },
    { value: "titanium", label: "Titanio" },
    { value: "stainless_steel", label: "Acero Inoxidable" },
    { value: "aluminum", label: "Aluminio" },
    { value: "carbon_fiber", label: "Fibra de Carbono" },
    { value: "wood", label: "Madera" },
    { value: "horn", label: "Cuerno" },
    { value: "plastic", label: "Plástico" },
    { value: "tr90", label: "TR90" },
    { value: "monel", label: "Monel" },
    { value: "beta_titanium", label: "Beta Titanio" },
  ]);

  const frameShapes = getOptions("frame_shape", [
    { value: "round", label: "Redondo" },
    { value: "square", label: "Cuadrado" },
    { value: "rectangular", label: "Rectangular" },
    { value: "oval", label: "Oval" },
    { value: "cat_eye", label: "Ojo de Gato" },
    { value: "aviator", label: "Aviador" },
    { value: "browline", label: "Browline" },
    { value: "geometric", label: "Geométrico" },
    { value: "shield", label: "Escudo" },
    { value: "wrap", label: "Wrap" },
    { value: "sport", label: "Deportivo" },
  ]);

  const frameGenders = getOptions("frame_gender", [
    { value: "mens", label: "Hombre" },
    { value: "womens", label: "Mujer" },
    { value: "unisex", label: "Unisex" },
    { value: "kids", label: "Niños" },
    { value: "youth", label: "Juvenil" },
  ]);

  const frameSizes = getOptions("frame_size", [
    { value: "narrow", label: "Estrecho" },
    { value: "medium", label: "Mediano" },
    { value: "wide", label: "Ancho" },
    { value: "extra_wide", label: "Extra Ancho" },
  ]);

  // For array fields, we need to get the values array
  const frameFeatures = productOptions["frame_features"]?.map(
    (opt) => opt.value,
  ) || [
    "spring_hinges",
    "adjustable_nose_pads",
    "flexible_temples",
    "lightweight",
    "durable",
    "sports_ready",
    "memory_metal",
  ];

  // Lens types - filtered to only show reading, sunglasses, and safety glasses
  const allLensTypes = getOptions("lens_type", [
    { value: "single_vision", label: "Monofocal" },
    { value: "bifocal", label: "Bifocal" },
    { value: "trifocal", label: "Trifocal" },
    { value: "progressive", label: "Progresivo" },
    { value: "reading", label: "Lectura" },
    { value: "computer", label: "Computadora" },
    { value: "driving", label: "Conducción" },
    { value: "sports", label: "Deportivo" },
    { value: "photochromic", label: "Fotocromático" },
    { value: "polarized", label: "Polarizado" },
    { value: "sunglasses", label: "Lentes de Sol" },
    { value: "safety", label: "Lentes de Seguridad" },
  ]);

  // Filter lens types to only show allowed ones (reading, sunglasses, safety)
  const lensTypes = allLensTypes.filter(
    (type) =>
      type.value === "reading" ||
      type.value === "sunglasses" ||
      type.value === "safety",
  );

  const lensMaterials = getOptions("lens_material", [
    { value: "cr39", label: "CR-39" },
    { value: "polycarbonate", label: "Policarbonato" },
    { value: "high_index_1_67", label: "Alto Índice 1.67" },
    { value: "high_index_1_74", label: "Alto Índice 1.74" },
    { value: "trivex", label: "Trivex" },
    { value: "glass", label: "Vidrio" },
    { value: "photochromic", label: "Fotocromático" },
  ]);

  const lensCoatings = productOptions["lens_coatings"]?.map(
    (opt) => opt.value,
  ) || [
    "anti_reflective",
    "blue_light_filter",
    "uv_protection",
    "scratch_resistant",
    "anti_fog",
    "mirror",
    "tint",
    "polarized",
  ];

  const uvProtectionLevels = getOptions("uv_protection", [
    { value: "none", label: "Ninguno" },
    { value: "uv400", label: "UV400" },
    { value: "uv380", label: "UV380" },
    { value: "uv350", label: "UV350" },
  ]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  };

  const handleInputChange = (field: string, value: unknown) => {
    const updates: unknown = { [field]: value };

    // Auto-generate slug from name
    if (field === "name" && value) {
      updates.slug = generateSlug(value);
    }

    updateFormData(updates);
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

  const handleSubmit = async (
    e?: React.FormEvent,
    status: string = "active",
  ) => {
    if (e && e.preventDefault) e.preventDefault();
    setLoading(true);
    markAsSaving(); // 🚀 Allow navigation during save process

    try {
      // Prepare frame measurements - convert empty strings to null
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

      // Prepare prescription range
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

      // Validate branch selection
      if (!currentBranchId && !isSuperAdmin) {
        toast.error("Debes seleccionar una sucursal para crear productos");
        setLoading(false);
        markAsSaved();
        return;
      }

      // Debug: Log formData.price before validation
      console.log("🔍 Form data before validation:", {
        price: formData.price,
        priceType: typeof formData.price,
        priceValue: formData.price,
        allFormData: Object.keys(formData).reduce((acc, key) => {
          if (key.includes("price") || key === "name" || key === "branch_id") {
            acc[key] = formData[key as keyof typeof formData];
          }
          return acc;
        }, {} as unknown),
      });

      // Validate and parse price
      const priceStr = String(formData.price || "").trim();
      const priceValue = priceStr ? parseFloat(priceStr) : NaN;

      console.log("💰 Price parsing:", {
        priceStr,
        priceValue,
        isNaN: isNaN(priceValue),
        isValid: priceStr && !isNaN(priceValue) && priceValue >= 0,
      });

      if (!priceStr || isNaN(priceValue) || priceValue < 0) {
        console.error("❌ Price validation failed in frontend:", {
          priceStr,
          priceValue,
          isNaN: isNaN(priceValue),
          formDataPrice: formData.price,
        });
        toast.error(
          "El precio es requerido y debe ser un número válido mayor o igual a 0",
        );
        setLoading(false);
        markAsSaved();
        return;
      }

      // Build product data object, explicitly setting price to avoid null/undefined issues
      const productData: unknown = {
        name: formData.name,
        slug: formData.slug,
        short_description: formData.short_description || null,
        price: priceValue, // Explicitly set as number
        cost_price: formData.cost_price
          ? parseFloat(String(formData.cost_price))
          : null,
        price_includes_tax: formData.price_includes_tax || false,
        category_id: formData.category_id || null,
        branch_id: currentBranchId, // Associate product with current branch
        // Stock quantity for initial stock in product_branch_stock
        stock_quantity: formData.stock_quantity
          ? parseInt(String(formData.stock_quantity))
          : 0,
        low_stock_threshold: formData.low_stock_threshold
          ? parseInt(String(formData.low_stock_threshold))
          : 5,
        status: status,
        featured_image: formData.featured_image || null,
        tags: formData.tags || [],
        is_featured: formData.is_featured || false,
        published_at: status === "active" ? new Date().toISOString() : null,
        // Optical product fields
        product_type: formData.product_type || "frame",
        sku: formData.sku || null,
        barcode: formData.barcode || null,
        brand: formData.brand || null,
        manufacturer: formData.manufacturer || null,
        model_number: formData.model_number || null,
        // Frame fields
        frame_type: formData.frame_type || null,
        frame_material: formData.frame_material || null,
        frame_shape: formData.frame_shape || null,
        frame_color: formData.frame_color || null,
        frame_colors: formData.frame_colors || [],
        frame_brand: formData.frame_brand || null,
        frame_model: formData.frame_model || null,
        frame_sku: formData.frame_sku || null,
        frame_gender: formData.frame_gender || null,
        frame_age_group: formData.frame_age_group || null,
        frame_size: formData.frame_size || null,
        frame_features: formData.frame_features || [],
        frame_measurements: frameMeasurements,
        // Lens fields
        lens_type: formData.lens_type || null,
        lens_material: formData.lens_material || null,
        lens_index: formData.lens_index
          ? parseFloat(String(formData.lens_index))
          : null,
        lens_coatings: formData.lens_coatings || [],
        lens_tint_options: formData.lens_tint_options || [],
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
        warranty_months: formData.warranty_months
          ? parseInt(String(formData.warranty_months))
          : null,
        warranty_details: formData.warranty_details || null,
      };

      // Remove undefined and null string fields, but keep valid nulls for optional fields
      Object.keys(productData).forEach((key) => {
        const value = productData[key];
        // Remove undefined values
        if (value === undefined) {
          delete productData[key];
        }
        // Convert empty strings to null for optional fields (but not for required fields like price)
        else if (
          typeof value === "string" &&
          value.trim() === "" &&
          key !== "price"
        ) {
          productData[key] = null;
        }
      });

      // Ensure price is always a valid number (should never be null or undefined at this point)
      if (
        productData.price === null ||
        productData.price === undefined ||
        isNaN(productData.price)
      ) {
        console.error("❌ Price validation failed in final check:", {
          price: productData.price,
          type: typeof productData.price,
          priceValue: priceValue,
          priceStr: priceStr,
        });
        toast.error(
          "Error: El precio no es válido. Por favor, verifica el formulario.",
        );
        setLoading(false);
        markAsSaved();
        return;
      }

      // Debug: Log data being sent
      const jsonBody = JSON.stringify(productData);
      const parsedBody = JSON.parse(jsonBody); // Parse to verify serialization

      console.log("📤 Sending product data:", {
        branch_id: productData.branch_id,
        isSuperAdmin: isSuperAdmin,
        price: productData.price,
        priceType: typeof productData.price,
        priceIsNaN: isNaN(productData.price),
        name: productData.name,
        priceAfterJSON: parsedBody.price,
        priceTypeAfterJSON: typeof parsedBody.price,
      });

      await productService.createProduct(productData as unknown);

      toast.success("Producto creado exitosamente");
      markAsSaved(); // 🚀 Mark as saved to allow navigation
      router.push("/admin/products");
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error al crear el producto";
      toast.error(errorMessage);
      markAsSaved(); // Reset saving state on error
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
          productType={formData.product_type}
          categoryId={formData.category_id}
          status={formData.status}
          name={formData.name}
          slug={formData.slug}
          shortDescription={formData.short_description}
          brand={formData.brand}
          manufacturer={formData.manufacturer}
          modelNumber={formData.model_number}
          sku={formData.sku}
          barcode={formData.barcode}
          categories={categories}
          productTypes={productTypes}
          onFieldChange={handleInputChange}
        />

        <AddProductPricingSection
          price={formData.price}
          priceIncludesTax={formData.price_includes_tax}
          onFieldChange={handleInputChange}
        />

        <AddProductInventorySection
          stockQuantity={formData.stock_quantity}
          lowStockThreshold={formData.low_stock_threshold}
          currentBranchId={currentBranchId}
          onFieldChange={handleInputChange}
        />

        <AddProductImagesSection
          featuredImage={formData.featured_image}
          onFieldChange={handleInputChange}
        />

        {formData.product_type === "frame" && (
          <AddProductFrameSpecs
            frameType={formData.frame_type}
            frameMaterial={formData.frame_material}
            frameShape={formData.frame_shape}
            frameGender={formData.frame_gender}
            frameSize={formData.frame_size}
            frameColor={formData.frame_color}
            frameMeasurements={formData.frame_measurements}
            frameFeatures={formData.frame_features}
            frameTypes={frameTypes}
            frameMaterials={frameMaterials}
            frameShapes={frameShapes}
            frameGenders={frameGenders}
            frameSizes={frameSizes}
            frameFeaturesOptions={frameFeatures}
            onFieldChange={handleInputChange}
            onAddToArray={addToArray}
            onRemoveFromArray={removeFromArray}
            onUpdateFrameMeasurement={updateFrameMeasurement}
          />
        )}

        {formData.product_type === "lens" && (
          <AddProductLensSpecs
            lensType={formData.lens_type}
            lensMaterial={formData.lens_material}
            lensIndex={formData.lens_index}
            uvProtection={formData.uv_protection}
            blueLightFilter={formData.blue_light_filter}
            blueLightFilterPercentage={formData.blue_light_filter_percentage}
            photochromic={formData.photochromic}
            prescriptionAvailable={formData.prescription_available}
            lensCoatings={formData.lens_coatings}
            prescriptionRange={formData.prescription_range}
            lensTypes={lensTypes}
            lensMaterials={lensMaterials}
            uvProtectionLevels={uvProtectionLevels}
            lensCoatingOptions={lensCoatings}
            onFieldChange={handleInputChange}
            onAddToArray={addToArray}
            onRemoveFromArray={removeFromArray}
            onUpdatePrescriptionRange={updatePrescriptionRange}
          />
        )}

        <AddProductWarrantySection
          warrantyMonths={formData.warranty_months}
          requiresPrescription={formData.requires_prescription}
          isCustomizable={formData.is_customizable}
          warrantyDetails={formData.warranty_details}
          onFieldChange={handleInputChange}
        />
      </form>
    </div>
  );
}
