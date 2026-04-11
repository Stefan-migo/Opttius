"use client";

import { AlertTriangle, ArrowLeft, Save, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useCategories } from "@/app/admin/products/hooks/useCategories";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ImageUpload from "@/components/ui/ImageUpload";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RichTextEditor from "@/components/ui/RichTextEditor";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBranch } from "@/hooks/useBranch";
import { useProtectedForm } from "@/hooks/useFormProtection";
import { useProductOptions } from "@/hooks/useProductOptions";
import { productService } from "@/lib/api/services";

export default function AddProductPage() {
  const router = useRouter();
  const { currentBranchId, isSuperAdmin, branches } = useBranch();
  const [loading, setLoading] = useState(false);
  const { categories } = useCategories();
  const [showPublishAlert, setShowPublishAlert] = useState(false);
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
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 mb-4 sm:mb-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-admin-text-primary">
            Agregar Producto
          </h1>
          {hasChanges && (
            <span className="px-2 py-1 text-[10px] sm:text-xs bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Cambios sin guardar
            </span>
          )}
        </div>
        <Button
          className="h-10 w-10 sm:h-auto sm:w-auto sm:px-4 shrink-0"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Volver</span>
        </Button>
      </div>

      {/* Product Form */}
      <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
        {/* Product Type & Category - MOVED TO FIRST POSITION */}
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-sm sm:text-base">
              Tipo de Producto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="product_type">Tipo de Producto *</Label>
                <Select
                  value={formData.product_type}
                  onValueChange={(value) =>
                    handleInputChange("product_type", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {productTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Categoría General</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) =>
                    handleInputChange("category_id", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardHeader className="px-4 sm:px-6 py-4 sm:py-6">
            <CardTitle className="text-sm sm:text-base">
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre del Producto *</Label>
                <Input
                  required
                  className="border-black/20"
                  id="name"
                  placeholder="Ej: Ray-Ban RB2140 Wayfarer"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="slug">URL (slug)</Label>
                <Input
                  className="border-black/20"
                  id="slug"
                  placeholder="Se genera automáticamente"
                  value={formData.slug}
                  onChange={(e) => handleInputChange("slug", e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="short_description">Descripción</Label>
              <RichTextEditor
                placeholder="Descripción del producto"
                rows={3}
                value={formData.short_description}
                onChange={(value) =>
                  handleInputChange("short_description", value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardHeader>
            <CardTitle>Precios e Inventario</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Precio *</Label>
                <Input
                  required
                  className="border-black/20"
                  id="price"
                  placeholder="0.00"
                  step="0.01"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange("price", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stock_quantity">
                  Cantidad en Stock (Sucursal Actual)
                </Label>
                <Input
                  className="border-black/20"
                  id="stock_quantity"
                  min="0"
                  placeholder="0"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) =>
                    handleInputChange("stock_quantity", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Stock inicial para esta sucursal. Puede agregar más stock
                  después de crear el producto.
                </p>
              </div>
              <div>
                <Label htmlFor="low_stock_threshold">
                  Umbral de Stock Bajo
                </Label>
                <Input
                  className="border-black/20"
                  id="low_stock_threshold"
                  min="0"
                  placeholder="5"
                  type="number"
                  value={formData.low_stock_threshold}
                  onChange={(e) =>
                    handleInputChange("low_stock_threshold", e.target.value)
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Alerta cuando el stock disponible sea menor o igual a este
                  valor.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                checked={formData.price_includes_tax}
                className="h-4 w-4 rounded border-gray-300 text-epoch-primary focus:ring-epoch-primary"
                id="price_includes_tax"
                type="checkbox"
                onChange={(e) =>
                  handleInputChange("price_includes_tax", e.target.checked)
                }
              />
              <Label
                className="text-sm font-normal cursor-pointer"
                htmlFor="price_includes_tax"
              >
                El precio ya incluye IVA
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Brand & Model Information - Hidden for services */}
        {formData.product_type !== "service" && (
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <CardHeader>
              <CardTitle>Marca y Modelo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    className="border-black/20"
                    id="brand"
                    placeholder="Ej: Ray-Ban"
                    value={formData.brand}
                    onChange={(e) => handleInputChange("brand", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="manufacturer">Fabricante</Label>
                  <Input
                    className="border-black/20"
                    id="manufacturer"
                    placeholder="Ej: Luxottica"
                    value={formData.manufacturer}
                    onChange={(e) =>
                      handleInputChange("manufacturer", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="model_number">Número de Modelo</Label>
                  <Input
                    className="border-black/20"
                    id="model_number"
                    placeholder="Ej: RB2140"
                    value={formData.model_number}
                    onChange={(e) =>
                      handleInputChange("model_number", e.target.value)
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* SKU and Barcode - Available for all product types */}
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardHeader>
            <CardTitle>Códigos de Identificación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  className="border-black/20"
                  id="sku"
                  placeholder="Código SKU"
                  value={formData.sku}
                  onChange={(e) => handleInputChange("sku", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="barcode">Código de Barras</Label>
                <Input
                  className="border-black/20"
                  id="barcode"
                  placeholder="Código de barras"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange("barcode", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardHeader>
            <CardTitle>Imagen del Producto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="featured_image">Imagen del Producto</Label>
              <ImageUpload
                placeholder="Seleccionar imagen del producto"
                value={formData.featured_image}
                onChange={(url) => handleInputChange("featured_image", url)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Frame Specifications - Only show if product_type is 'frame' */}
        {formData.product_type === "frame" && (
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <CardHeader>
              <CardTitle>Especificaciones del Armazón</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Armazón</Label>
                  <Select
                    value={formData.frame_type}
                    onValueChange={(value) =>
                      handleInputChange("frame_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Material del Armazón</Label>
                  <Select
                    value={formData.frame_material}
                    onValueChange={(value) =>
                      handleInputChange("frame_material", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar material" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameMaterials.map((material) => (
                        <SelectItem key={material.value} value={material.value}>
                          {material.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Forma del Armazón</Label>
                  <Select
                    value={formData.frame_shape}
                    onValueChange={(value) =>
                      handleInputChange("frame_shape", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar forma" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameShapes.map((shape) => (
                        <SelectItem key={shape.value} value={shape.value}>
                          {shape.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Género</Label>
                  <Select
                    value={formData.frame_gender}
                    onValueChange={(value) =>
                      handleInputChange("frame_gender", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar género" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameGenders.map((gender) => (
                        <SelectItem key={gender.value} value={gender.value}>
                          {gender.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tamaño</Label>
                  <Select
                    value={formData.frame_size}
                    onValueChange={(value) =>
                      handleInputChange("frame_size", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tamaño" />
                    </SelectTrigger>
                    <SelectContent>
                      {frameSizes.map((size) => (
                        <SelectItem key={size.value} value={size.value}>
                          {size.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Color Principal</Label>
                  <Input
                    className="border-black/20"
                    placeholder="Ej: Negro"
                    value={formData.frame_color}
                    onChange={(e) =>
                      handleInputChange("frame_color", e.target.value)
                    }
                  />
                </div>
              </div>

              {/* Frame Measurements */}
              <div>
                <Label className="mb-2 block">Medidas del Armazón (mm)</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <Label className="text-xs">Ancho de Lente</Label>
                    <Input
                      className="border-black/20"
                      placeholder="52"
                      type="number"
                      value={formData.frame_measurements.lens_width}
                      onChange={(e) =>
                        updateFrameMeasurement("lens_width", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Puente</Label>
                    <Input
                      className="border-black/20"
                      placeholder="18"
                      type="number"
                      value={formData.frame_measurements.bridge_width}
                      onChange={(e) =>
                        updateFrameMeasurement("bridge_width", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Largo de Varilla</Label>
                    <Input
                      className="border-black/20"
                      placeholder="140"
                      type="number"
                      value={formData.frame_measurements.temple_length}
                      onChange={(e) =>
                        updateFrameMeasurement("temple_length", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Alto de Lente</Label>
                    <Input
                      className="border-black/20"
                      placeholder="40"
                      type="number"
                      value={formData.frame_measurements.lens_height}
                      onChange={(e) =>
                        updateFrameMeasurement("lens_height", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Ancho Total</Label>
                    <Input
                      className="border-black/20"
                      placeholder="140"
                      type="number"
                      value={formData.frame_measurements.total_width}
                      onChange={(e) =>
                        updateFrameMeasurement("total_width", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Frame Features */}
              <div>
                <Label>Características del Armazón</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.frame_features.map((feature) => (
                    <Badge
                      className="flex items-center gap-1"
                      key={feature}
                      variant="secondary"
                    >
                      {feature.replace(/_/g, " ")}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray("frame_features", feature)
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <Select
                  onValueChange={(value) => addToArray("frame_features", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Agregar característica" />
                  </SelectTrigger>
                  <SelectContent>
                    {frameFeatures
                      .filter((f) => !formData.frame_features.includes(f))
                      .map((feature) => (
                        <SelectItem key={feature} value={feature}>
                          {feature.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lens Specifications - Only show if product_type is 'lens' */}
        {formData.product_type === "lens" && (
          <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            <CardHeader>
              <CardTitle>Especificaciones del Lente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Tipo de Lente</Label>
                  <Select
                    value={formData.lens_type}
                    onValueChange={(value) =>
                      handleInputChange("lens_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {lensTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Material del Lente</Label>
                  <Select
                    value={formData.lens_material}
                    onValueChange={(value) =>
                      handleInputChange("lens_material", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar material" />
                    </SelectTrigger>
                    <SelectContent>
                      {lensMaterials.map((material) => (
                        <SelectItem key={material.value} value={material.value}>
                          {material.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Índice de Refracción</Label>
                  <Input
                    className="border-black/20"
                    placeholder="Ej: 1.67"
                    step="0.01"
                    type="number"
                    value={formData.lens_index}
                    onChange={(e) =>
                      handleInputChange("lens_index", e.target.value)
                    }
                  />
                </div>
                <div>
                  <Label>Protección UV</Label>
                  <Select
                    value={formData.uv_protection}
                    onValueChange={(value) =>
                      handleInputChange("uv_protection", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar nivel" />
                    </SelectTrigger>
                    <SelectContent>
                      {uvProtectionLevels.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <input
                    checked={formData.blue_light_filter}
                    className="rounded"
                    id="blue_light_filter"
                    type="checkbox"
                    onChange={(e) =>
                      handleInputChange("blue_light_filter", e.target.checked)
                    }
                  />
                  <Label htmlFor="blue_light_filter">Filtro de Luz Azul</Label>
                </div>
                {formData.blue_light_filter && (
                  <div>
                    <Label>Porcentaje de Filtro (%)</Label>
                    <Input
                      className="border-black/20"
                      max="100"
                      min="0"
                      placeholder="Ej: 40"
                      type="number"
                      value={formData.blue_light_filter_percentage}
                      onChange={(e) =>
                        handleInputChange(
                          "blue_light_filter_percentage",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <input
                    checked={formData.photochromic}
                    className="rounded"
                    id="photochromic"
                    type="checkbox"
                    onChange={(e) =>
                      handleInputChange("photochromic", e.target.checked)
                    }
                  />
                  <Label htmlFor="photochromic">
                    Fotocromático (Transitions)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    checked={formData.prescription_available}
                    className="rounded"
                    id="prescription_available"
                    type="checkbox"
                    onChange={(e) =>
                      handleInputChange(
                        "prescription_available",
                        e.target.checked,
                      )
                    }
                  />
                  <Label htmlFor="prescription_available">
                    Disponible con Receta
                  </Label>
                </div>
              </div>

              {/* Lens Coatings */}
              <div>
                <Label>Tratamientos y Recubrimientos</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.lens_coatings.map((coating) => (
                    <Badge
                      className="flex items-center gap-1"
                      key={coating}
                      variant="secondary"
                    >
                      {coating.replace(/_/g, " ")}
                      <X
                        className="h-3 w-3 cursor-pointer"
                        onClick={() =>
                          removeFromArray("lens_coatings", coating)
                        }
                      />
                    </Badge>
                  ))}
                </div>
                <Select
                  onValueChange={(value) => addToArray("lens_coatings", value)}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Agregar tratamiento" />
                  </SelectTrigger>
                  <SelectContent>
                    {lensCoatings
                      .filter((c) => !formData.lens_coatings.includes(c))
                      .map((coating) => (
                        <SelectItem key={coating} value={coating}>
                          {coating.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prescription Range */}
              {formData.prescription_available && (
                <div>
                  <Label className="mb-2 block">
                    Rango de Receta Soportado
                  </Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs">SPH Mínimo</Label>
                      <Input
                        className="border-black/20"
                        placeholder="-10.00"
                        step="0.25"
                        type="number"
                        value={formData.prescription_range.sph_min}
                        onChange={(e) =>
                          updatePrescriptionRange("sph_min", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">SPH Máximo</Label>
                      <Input
                        className="border-black/20"
                        placeholder="+6.00"
                        step="0.25"
                        type="number"
                        value={formData.prescription_range.sph_max}
                        onChange={(e) =>
                          updatePrescriptionRange("sph_max", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CIL Mínimo</Label>
                      <Input
                        className="border-black/20"
                        placeholder="-4.00"
                        step="0.25"
                        type="number"
                        value={formData.prescription_range.cyl_min}
                        onChange={(e) =>
                          updatePrescriptionRange("cyl_min", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">CIL Máximo</Label>
                      <Input
                        className="border-black/20"
                        placeholder="+4.00"
                        step="0.25"
                        type="number"
                        value={formData.prescription_range.cyl_max}
                        onChange={(e) =>
                          updatePrescriptionRange("cyl_max", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ADD Mínimo</Label>
                      <Input
                        className="border-black/20"
                        placeholder="0.00"
                        step="0.25"
                        type="number"
                        value={formData.prescription_range.add_min}
                        onChange={(e) =>
                          updatePrescriptionRange("add_min", e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">ADD Máximo</Label>
                      <Input
                        className="border-black/20"
                        placeholder="+4.00"
                        step="0.25"
                        type="number"
                        value={formData.prescription_range.add_max}
                        onChange={(e) =>
                          updatePrescriptionRange("add_max", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warranty & Additional Info */}
        <Card className="bg-admin-bg-tertiary shadow-[0_1px_3px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
          <CardHeader>
            <CardTitle>Garantía e Información Adicional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="warranty_months">Garantía (meses)</Label>
                <Input
                  className="border-black/20"
                  id="warranty_months"
                  placeholder="Ej: 12"
                  type="number"
                  value={formData.warranty_months}
                  onChange={(e) =>
                    handleInputChange("warranty_months", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  checked={formData.requires_prescription}
                  className="rounded"
                  id="requires_prescription"
                  type="checkbox"
                  onChange={(e) =>
                    handleInputChange("requires_prescription", e.target.checked)
                  }
                />
                <Label htmlFor="requires_prescription">Requiere Receta</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  checked={formData.is_customizable}
                  className="rounded"
                  id="is_customizable"
                  type="checkbox"
                  onChange={(e) =>
                    handleInputChange("is_customizable", e.target.checked)
                  }
                />
                <Label htmlFor="is_customizable">Personalizable</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="warranty_details">Detalles de Garantía</Label>
              <RichTextEditor
                placeholder="Detalles de la garantía, condiciones, etc."
                rows={3}
                value={formData.warranty_details}
                onChange={(value) =>
                  handleInputChange("warranty_details", value)
                }
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-4">
          <Button
            className="w-full sm:w-auto"
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            disabled={loading}
            type="button"
            variant="secondary"
            onClick={() => handleSubmit(undefined, "draft")}
          >
            <Save className="h-4 w-4" />
            {loading ? "Guardando..." : "Borrador"}
          </Button>
          <Button
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            disabled={loading}
            type="button"
            onClick={() => setShowPublishAlert(true)}
          >
            <Save className="h-4 w-4" />
            {loading ? "Guardando..." : "Guardar Producto"}
          </Button>
        </div>
      </form>

      {/* Publish Alert Dialog */}
      <Dialog open={showPublishAlert} onOpenChange={setShowPublishAlert}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Confirmar Publicación
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-3">
                <p>
                  <strong>
                    ¿Estás seguro de que deseas publicar este producto?
                  </strong>
                </p>
                <p>
                  Al hacer clic en &quot;Publicar&quot;, el producto será
                  publicado inmediatamente y estará visible para los clientes.
                </p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 font-medium">
                    ⚠️ Recomendación de Seguridad:
                  </p>
                  <p className="text-amber-700 text-sm mt-1">
                    Te recomendamos guardar primero como &quot;Borrador&quot;
                    para revisar todos los detalles, especialmente los precios,
                    antes de publicar el producto.
                  </p>
                </div>
                <p className="text-sm text-gray-600">
                  ¿Has verificado que todos los precios y detalles son
                  correctos?
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              disabled={loading}
              variant="outline"
              onClick={() => setShowPublishAlert(false)}
            >
              Cancelar
            </Button>
            <Button
              className="text-white"
              disabled={loading}
              style={{ backgroundColor: "var(--admin-accent-tertiary)" }}
              variant="secondary"
              onClick={() => handleSubmit(undefined, "draft")}
            >
              Guardar como Borrador
            </Button>
            <Button
              disabled={loading}
              onClick={() => {
                setShowPublishAlert(false);
                handleSubmit(undefined, "active");
              }}
            >
              {loading ? "Publicando..." : "Sí, Publicar Producto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
