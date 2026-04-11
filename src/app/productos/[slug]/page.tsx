"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Eye,
  Package,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  price: number;
  compare_at_price: number | null;
  inventory_quantity: number;
  status: string;
  featured_image: string | null;
  gallery: string[];
  is_featured: boolean;
  category?: { name: string; slug: string };
  categories?: { name: string; slug: string };
  product_type?: string;
  frame_type?: string;
  frame_material?: string;
  frame_shape?: string;
  frame_color?: string;
  lens_type?: string;
  lens_material?: string;
  sku?: string;
  brand?: string;
  created_at: string;
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/products/${slug}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Producto no encontrado");
        } else {
          setError("Error al cargar el producto");
        }
        return;
      }

      const data = await response.json();
      setProduct(data.product);

      // Set initial selected image
      if (data.product.featured_image) {
        setSelectedImage(data.product.featured_image);
      } else if (data.product.gallery && data.product.gallery.length > 0) {
        setSelectedImage(data.product.gallery[0]);
      }
    } catch (err) {
      console.error("Error fetching product:", err);
      setError("Error al cargar el producto");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(price);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-admin-bg-primary to-admin-bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Package className="h-12 w-12 text-azul-profundo animate-pulse mx-auto mb-4" />
              <p className="text-tierra-media">Cargando producto...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-admin-bg-primary to-admin-bg-secondary p-6">
        <div className="max-w-7xl mx-auto">
          <Button
            className="mb-6"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>

          <Card className="bg-admin-bg-tertiary">
            <CardContent className="p-12 text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-azul-profundo mb-2">
                {error || "Producto no encontrado"}
              </h1>
              <p className="text-tierra-media mb-6">
                El producto que buscas no existe o no está disponible.
              </p>
              <Button onClick={() => router.push("/")}>Ir al inicio</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const categoryName =
    product.categories?.name || product.category?.name || "Sin categoría";
  const hasDiscount =
    product.compare_at_price && product.compare_at_price > product.price;
  const discountPercentage = hasDiscount
    ? Math.round(
        ((product.compare_at_price! - product.price) /
          product.compare_at_price!) *
          100,
      )
    : 0;
  const inStock = product.inventory_quantity > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-admin-bg-primary to-admin-bg-secondary p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Button
          className="mb-6"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        {/* Product Details */}
        <Card className="bg-admin-bg-tertiary shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Images Section */}
              <div className="space-y-4">
                {/* Main Image */}
                <div className="relative aspect-square bg-white rounded-lg overflow-hidden border-2 border-gray-200">
                  {selectedImage ? (
                    <Image
                      fill
                      priority
                      alt={product.name}
                      className="object-contain p-4"
                      src={selectedImage}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-24 w-24 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* Gallery Thumbnails */}
                {product.gallery && product.gallery.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {product.featured_image && (
                      <button
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                          selectedImage === product.featured_image
                            ? "border-azul-profundo"
                            : "border-gray-200"
                        }`}
                        onClick={() =>
                          setSelectedImage(product.featured_image!)
                        }
                      >
                        <Image
                          fill
                          alt={product.name}
                          className="object-cover"
                          src={product.featured_image}
                        />
                      </button>
                    )}
                    {product.gallery.map((image, index) => (
                      <button
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 ${
                          selectedImage === image
                            ? "border-azul-profundo"
                            : "border-gray-200"
                        }`}
                        key={index}
                        onClick={() => setSelectedImage(image)}
                      >
                        <Image
                          fill
                          alt={`${product.name} - Imagen ${index + 1}`}
                          className="object-cover"
                          src={image}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info Section */}
              <div className="space-y-6">
                {/* Category & Featured Badge */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">{categoryName}</Badge>
                  {product.is_featured && (
                    <Badge className="bg-dorado text-azul-profundo">
                      Destacado
                    </Badge>
                  )}
                  {hasDiscount && (
                    <Badge variant="destructive">
                      -{discountPercentage}% OFF
                    </Badge>
                  )}
                </div>

                {/* Product Name */}
                <h1 className="text-3xl font-bold text-azul-profundo">
                  {product.name}
                </h1>

                {/* Short Description */}
                {product.short_description && (
                  <p className="text-lg text-tierra-media">
                    {product.short_description}
                  </p>
                )}

                {/* Price */}
                <div className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-verde-suave">
                      {formatPrice(product.price)}
                    </span>
                    {hasDiscount && (
                      <span className="text-xl text-tierra-media line-through">
                        {formatPrice(product.compare_at_price!)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock Status */}
                <div className="flex items-center gap-2">
                  {inStock ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-verde-suave" />
                      <span className="text-verde-suave font-medium">
                        En stock ({product.inventory_quantity} unidades
                        disponibles)
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-red-500 font-medium">
                        Sin stock
                      </span>
                    </>
                  )}
                </div>

                {/* SKU & Brand */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {product.sku && (
                    <div>
                      <span className="text-tierra-media">SKU: </span>
                      <span className="font-medium">{product.sku}</span>
                    </div>
                  )}
                  {product.brand && (
                    <div>
                      <span className="text-tierra-media">Marca: </span>
                      <span className="font-medium">{product.brand}</span>
                    </div>
                  )}
                </div>

                {/* Product Type Specific Info */}
                {product.product_type === "frame" && (
                  <div className="space-y-2 p-4 bg-white/50 rounded-lg">
                    <h3 className="font-semibold text-azul-profundo mb-2">
                      Especificaciones del Marco
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {product.frame_type && (
                        <div>
                          <span className="text-tierra-media">Tipo: </span>
                          <span className="font-medium">
                            {product.frame_type}
                          </span>
                        </div>
                      )}
                      {product.frame_material && (
                        <div>
                          <span className="text-tierra-media">Material: </span>
                          <span className="font-medium">
                            {product.frame_material}
                          </span>
                        </div>
                      )}
                      {product.frame_shape && (
                        <div>
                          <span className="text-tierra-media">Forma: </span>
                          <span className="font-medium">
                            {product.frame_shape}
                          </span>
                        </div>
                      )}
                      {product.frame_color && (
                        <div>
                          <span className="text-tierra-media">Color: </span>
                          <span className="font-medium">
                            {product.frame_color}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {product.product_type === "lens" && (
                  <div className="space-y-2 p-4 bg-white/50 rounded-lg">
                    <h3 className="font-semibold text-azul-profundo mb-2">
                      Especificaciones de la Lente
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {product.lens_type && (
                        <div>
                          <span className="text-tierra-media">Tipo: </span>
                          <span className="font-medium">
                            {product.lens_type}
                          </span>
                        </div>
                      )}
                      {product.lens_material && (
                        <div>
                          <span className="text-tierra-media">Material: </span>
                          <span className="font-medium">
                            {product.lens_material}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-4 pt-4">
                  <Button
                    asChild
                    className="w-full"
                    size="lg"
                    variant="outline"
                  >
                    <Link href={`/admin/products/edit/${product.id}`}>
                      <Eye className="h-5 w-5 mr-2" />
                      Ver en Admin
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            {/* Description Section */}
            {product.description && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-2xl font-bold text-azul-profundo mb-4">
                  Descripción
                </h2>
                <div
                  className="prose max-w-none text-tierra-media"
                  dangerouslySetInnerHTML={{ __html: product.description }}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
