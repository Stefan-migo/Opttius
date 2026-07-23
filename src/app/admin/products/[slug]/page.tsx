"use client";

import { AlertTriangle, ArrowLeft, CheckCircle, Edit, Package } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Product, productService } from "@/lib/api/services";

import { ProductViewFrameSpecs, ProductViewLensSpecs } from "./_components/ProductViewFrameSpecs";
import { ProductViewImages } from "./_components/ProductViewImages";

export default function ProductViewPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => { if (slug) fetchProduct(); }, [slug]);

  const fetchProduct = async () => {
    try {
      setLoading(true); setError(null);
      const data = await productService.getProductBySlug(slug);
      setProduct(data);
      setSelectedImage(data.featured_image || (data.gallery?.[0] ?? null));
    } catch { setError("Error al cargar el producto"); }
    finally { setLoading(false); }
  };

  const formatPrice = (price: number) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(price);

  if (loading) return (
    <div className="p-6"><div className="flex items-center justify-center min-h-[60vh]"><div className="text-center"><Package className="h-12 w-12 text-azul-profundo animate-pulse mx-auto mb-4" /><p className="text-tierra-media">Cargando producto...</p></div></div></div>
  );

  if (error || !product) return (
    <div className="p-6">
      <Button className="mb-6" variant="outline" onClick={() => router.push("/admin/products")}><ArrowLeft className="h-4 w-4 mr-2" />Volver a Productos</Button>
      <Card className="bg-admin-bg-tertiary"><CardContent className="p-12 text-center">
        <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-azul-profundo mb-2">{error || "Producto no encontrado"}</h1>
        <p className="text-tierra-media mb-6">El producto que buscas no existe o no está disponible.</p>
        <Button onClick={() => router.push("/admin/products")}>Volver a Productos</Button>
      </CardContent></Card>
    </div>
  );

  const categoryName = product.categories?.name || product.category?.name || "Sin categoría";
  const hasDiscount = product.compare_at_price && product.compare_at_price > product.price;
  const discountPercentage = hasDiscount ? Math.round(((product.compare_at_price! - product.price) / product.compare_at_price!) * 100) : 0;
  const inStock = (product.inventory_quantity ?? 0) > 0;

  return (
    <div className="p-6">
      <Button className="mb-6" variant="outline" onClick={() => router.push("/admin/products")}><ArrowLeft className="h-4 w-4 mr-2" />Volver a Productos</Button>
      <Card className="bg-admin-bg-tertiary shadow-lg">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <ProductViewImages
              featuredImage={product.featured_image ?? null} gallery={product.gallery ?? null}
              name={product.name} selectedImage={selectedImage}
              onSelectImage={setSelectedImage}
            />
            <div className="space-y-6">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline">{categoryName}</Badge>
                {product.is_featured && <Badge className="bg-dorado text-azul-profundo">Destacado</Badge>}
                {hasDiscount && <Badge variant="destructive">-{discountPercentage}% OFF</Badge>}
                <Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status === "active" ? "Activo" : product.status}</Badge>
              </div>
              <h1 className="text-3xl font-bold text-azul-profundo">{product.name}</h1>
              {product.short_description && <p className="text-lg text-tierra-media">{product.short_description}</p>}
              <div className="space-y-2">
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-verde-suave">{formatPrice(product.price)}</span>
                  {hasDiscount && <span className="text-xl text-tierra-media line-through">{formatPrice(product.compare_at_price!)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {inStock ? (
                  <><CheckCircle className="h-5 w-5 text-verde-suave" /><span className="text-verde-suave font-medium">En stock ({product.inventory_quantity} unidades disponibles)</span></>
                ) : (
                  <><AlertTriangle className="h-5 w-5 text-red-500" /><span className="text-red-500 font-medium">Sin stock</span></>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {product.sku && <div><span className="text-tierra-media">SKU: </span><span className="font-medium">{product.sku}</span></div>}
                {product.brand && <div><span className="text-tierra-media">Marca: </span><span className="font-medium">{product.brand}</span></div>}
              </div>
              {product.product_type === "frame" && <ProductViewFrameSpecs product={product as never} />}
              {product.product_type === "lens" && <ProductViewLensSpecs product={product as never} />}
              <div className="flex gap-4 pt-4">
                <Button asChild className="flex-1" size="lg" variant="outline">
                  <Link href={`/admin/products/edit/${product.id}`}><Edit className="h-5 w-5 mr-2" /> Editar Producto</Link>
                </Button>
              </div>
            </div>
          </div>
          {product.description && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h2 className="text-2xl font-bold text-azul-profundo mb-4">Descripción</h2>
              <div className="prose max-w-none text-tierra-media" dangerouslySetInnerHTML={{ __html: product.description }} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
