"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useBranch } from "@/hooks/useBranch";
import { useProductOptions } from "@/hooks/useProductOptions";
import { productService } from "@/lib/api/services";

import { ProductBasicInfo } from "./_components/ProductBasicInfo";
import { ProductEditHeader } from "./_components/ProductEditHeader";
import { ProductFrameSpecs } from "./_components/ProductFrameSpecs";
import { ProductImagesSection } from "./_components/ProductImagesSection";
import { ProductInventorySection } from "./_components/ProductInventorySection";
import { ProductLensSpecs } from "./_components/ProductLensSpecs";
import { ProductPricingSection } from "./_components/ProductPricingSection";
import { ProductWarrantySection } from "./_components/ProductWarrantySection";

export default function EditProductPage() {
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

  // Helper function to get options from database or fallback to defaults
  const getOptions = (fieldKey: string, fallback: unknown[] = []) => {
    if (optionsLoading) return fallback;
    const dbOptions = productOptions[fieldKey];
    if (dbOptions && dbOptions.length > 0) {
      return dbOptions.map((opt) => ({ value: opt.value, label: opt.label }));
    }
    return fallback;
  };

  // Optical product options
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

  // Form state type
  interface FormState {
    name: string;
    slug: string;
    short_description: string;
    description: string;
    price: string;
    price_includes_tax: boolean;
    category_id: string;
    featured_image: string;
    gallery: string[];
    stock_quantity: string;
    low_stock_threshold: string;
    is_featured: boolean;
    status: string;
    // Optical product fields
    product_type: string;
    sku: string;
    barcode: string;
    brand: string;
    manufacturer: string;
    model_number: string;
    // Frame fields
    frame_type: string;
    frame_material: string;
    frame_shape: string;
    frame_color: string;
    frame_colors: string[];
    frame_brand: string;
    frame_model: string;
    frame_sku: string;
    frame_gender: string;
    frame_age_group: string;
    frame_size: string;
    frame_features: string[];
    frame_measurements: {
      lens_width: string;
      bridge_width: string;
      temple_length: string;
      lens_height: string;
      total_width: string;
    };
    // Lens fields
    lens_type: string;
    lens_material: string;
    lens_index: string;
    lens_coatings: string[];
    lens_tint_options: string[];
    uv_protection: string;
    blue_light_filter: boolean;
    blue_light_filter_percentage: string;
    photochromic: boolean;
    prescription_available: boolean;
    prescription_range: {
      sph_min: string;
      sph_max: string;
      cyl_min: string;
      cyl_max: string;
      add_min: string;
      add_max: string;
    };
    requires_prescription: boolean;
    is_customizable: boolean;
    warranty_months: string;
    warranty_details: string;
  }

  const [formData, setFormData] = useState<FormState>({
    name: "",
    slug: "",
    short_description: "",
    description: "",
    price: "",
    price_includes_tax: false,
    category_id: "",
    featured_image: "",
    gallery: [] as string[],
    stock_quantity: "", // Changed from inventory_quantity - now managed in product_branch_stock
    low_stock_threshold: "5",
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

  // Form protection state
  const [hasChanges, setHasChanges] = useState(false);
  const [initialData, setInitialData] = useState<unknown>(null);

  // Update form data with change detection
  const updateFormData = (updates: unknown) => {
    setFormData((prev) => {
      const newData = { ...prev, ...updates };

      // Check if there are changes
      if (initialData) {
        const hasFormChanges =
          JSON.stringify(newData) !== JSON.stringify(initialData);
        setHasChanges(hasFormChanges);
      }

      return newData;
    });
  };

  // Fetch product data and categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch product data including archived products for admin editing
        // Pass branch ID to get correct stock data for the selected branch
        const productData = await productService.getProduct(
          productId,
          currentBranchId || undefined,
        );

        // Fetch categories - Note: This would need a categoryService in the future
        const categoriesResponse = await fetch("/api/categories");
        if (!categoriesResponse.ok) {
          throw new Error("Failed to fetch categories");
        }
        const categoriesData = await categoriesResponse.json();

        // Set form data with product values
        const product = productData;

        // Debug: Log product data to see what we're getting
        console.log("Product data:", {
          productId: product.id,
          productName: product.name,
          product_branch_stock: product.product_branch_stock,
          price_includes_tax: product.price_includes_tax,
          currentBranchId,
        });

        // Get stock and low_stock_threshold from product_branch_stock if available
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
          console.log(
            "Stock found in product_branch_stock:",
            stockQty,
            "->",
            stockQuantity,
            "threshold:",
            lowStockThreshold,
          );
        } else if (
          product.inventory_quantity !== undefined &&
          product.inventory_quantity !== null
        ) {
          // Fallback to deprecated field for backward compatibility
          stockQuantity = product.inventory_quantity.toString();
          console.log(
            "Stock from deprecated inventory_quantity:",
            stockQuantity,
          );
        } else {
          console.log("No stock found, using default 0");
        }

        // Transform frame_measurements to ensure all fields are strings
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

        // Transform prescription_range to ensure all fields are strings
        const transformedPrescriptionRange = {
          sph_min: product.prescription_range?.sph_min?.toString() || "",
          sph_max: product.prescription_range?.sph_max?.toString() || "",
          cyl_min: product.prescription_range?.cyl_min?.toString() || "",
          cyl_max: product.prescription_range?.cyl_max?.toString() || "",
          add_min: product.prescription_range?.add_min?.toString() || "",
          add_max: product.prescription_range?.add_max?.toString() || "",
        };

        // Ensure uv_protection is string
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
          stock_quantity: stockQuantity, // Changed from inventory_quantity
          low_stock_threshold: lowStockThreshold,
          is_featured: product.is_featured || false,
          status: product.status || "active",
          // Optical product fields
          product_type: product.product_type || "frame",
          sku: product.sku || "",
          barcode: product.barcode || "",
          brand: product.brand || "",
          manufacturer: product.manufacturer || "",
          model_number: product.model_number || "",
          // Frame fields
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
          // Lens fields
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
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (productId) {
      fetchData();
    }
  }, [productId, currentBranchId, isSuperAdmin]);

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
    if (e && e.preventDefault) e.preventDefault();
    setSaving(true);

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

      // In global mode, do NOT send stock fields - stock cannot be configured globally
      const isGlobalMode = !currentBranchId || currentBranchId === "global";
      const productData = {
        ...formData,
        status: status || formData.status,
        price: parseFloat(formData.price),
        price_includes_tax: formData.price_includes_tax === true,
        // Stock only when branch selected - API rejects stock changes in global mode
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
        // Optical fields
        frame_measurements: frameMeasurements,
        prescription_range: prescriptionRange,
        lens_index: formData.lens_index
          ? parseFloat(formData.lens_index)
          : null,
        warranty_months: formData.warranty_months
          ? parseInt(formData.warranty_months)
          : null,
        blue_light_filter_percentage: formData.blue_light_filter_percentage
          ? parseInt(formData.blue_light_filter_percentage)
          : null,
        // Remove optical_category and cosmetics fields that don't apply
        optical_category: undefined,
        skin_type: undefined,
        benefits: undefined,
        certifications: undefined,
        ingredients: undefined,
        usage_instructions: undefined,
        precautions: undefined,
        package_characteristics: undefined,
      };

      // Prepare headers with branch context
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (currentBranchId) {
        headers["x-branch-id"] = currentBranchId;
      } else if (isSuperAdmin) {
        headers["x-branch-id"] = "global";
      }

      const result = await productService.updateProduct(
        productId,
        productData as unknown,
        currentBranchId || (isSuperAdmin ? "global" : undefined),
      );

      // Invalidate React Query cache to refresh the products list
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });

      toast.success("Producto actualizado exitosamente");
      router.push("/admin/products");
    } catch (error) {
      console.error("Error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Error al actualizar el producto";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Loading state
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

  // Error state
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
        name={formData.name}
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSubmit}
      />

      <form className="space-y-6 min-w-0" onSubmit={handleSubmit}>
        <ProductBasicInfo
          productType={formData.product_type}
          categoryId={formData.category_id}
          status={formData.status}
          name={formData.name}
          slug={formData.slug}
          shortDescription={formData.short_description}
          description={formData.description}
          brand={formData.brand}
          manufacturer={formData.manufacturer}
          modelNumber={formData.model_number}
          sku={formData.sku}
          barcode={formData.barcode}
          categories={categories}
          productTypes={productTypes}
          onFieldChange={handleInputChange}
        />

        <ProductPricingSection
          price={formData.price}
          priceIncludesTax={formData.price_includes_tax}
          onFieldChange={handleInputChange}
        />

        <ProductInventorySection
          stockQuantity={formData.stock_quantity}
          lowStockThreshold={formData.low_stock_threshold}
          currentBranchId={currentBranchId}
          onFieldChange={handleInputChange}
        />

        <ProductImagesSection
          featuredImage={formData.featured_image}
          onFieldChange={handleInputChange}
        />

        {formData.product_type === "frame" && (
          <ProductFrameSpecs
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
          <ProductLensSpecs
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

        <ProductWarrantySection
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
