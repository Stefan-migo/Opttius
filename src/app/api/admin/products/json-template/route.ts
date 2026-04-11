import { NextRequest, NextResponse } from "next/server";

import { appLogger as logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  try {
    // Since this is just a template download, we'll use static category IDs
    // that are commonly used in the system
    const categories = [
      {
        id: "b4f1ec28-813d-423d-a396-a6b969fedb70",
        name: "ECOS",
        slug: "ecos",
      },
      {
        id: "791cf640-5e0b-43a9-b5c4-64d45c3bdded",
        name: "JADE RITUAL",
        slug: "jade-ritual",
      },
      {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        name: "ALMA",
        slug: "alma",
      },
      {
        id: "b2c3d4e5-f6g7-8901-bcde-f23456789012",
        name: "UMBRAL",
        slug: "umbral",
      },
      {
        id: "c3d4e5f6-g7h8-9012-cdef-345678901234",
        name: "UTÓPICA",
        slug: "utopica",
      },
    ];

    // Create JSON template with example data
    const template = [
      {
        name: "Crema Hidratante Facial ECOS",
        slug: "crema-hidratante-facial-ecos",
        short_description:
          "Dale a tu piel el amor que se merece. Nuestra crema hidratante de la línea ECOS es un mimo para tu rostro, una caricia de la naturaleza.",
        description:
          "Descubrí el poder de la naturaleza con la Crema Hidratante Facial ECOS. Creada bajo una filosofía de respeto por tu piel y por el planeta, esta crema es el resultado de una cuidadosa selección de ingredientes orgánicos certificados.",
        price: 12500.0,
        compare_at_price: 14000.0,
        inventory_quantity: 75,
        category_id: categories[0].id,
        featured_image: "https://example.com/ecos-crema-featured.jpg",
        gallery: [
          "https://example.com/ecos-crema-gallery1.jpg",
          "https://example.com/ecos-crema-gallery2.jpg",
        ],
        skin_type: ["Seco", "Sensible"],
        benefits: ["Hidratante", "Regenerador", "Nutritivo", "Calmante"],
        certifications: ["Orgánico", "Libre de Crueldad", "Vegano", "Natural"],
        ingredients: [
          { name: "Hidrolato de Rosas Orgánico", percentage: 68 },
          { name: "Aceite de Jojoba Orgánico", percentage: 10 },
          { name: "Manteca de Karité Orgánica", percentage: 8 },
          { name: "Aceite de Almendras Dulces Orgánico", percentage: 5 },
          { name: "Glicerina Vegetal", percentage: 4 },
          { name: "Cera Emulsionante Vegetal", percentage: 2 },
          { name: "Vitamina E", percentage: 1.5 },
          { name: "Aceite Esencial de Lavanda Orgánico", percentage: 0.5 },
          { name: "Conservante Natural", percentage: 0.5 },
        ],
        usage_instructions:
          "1. Limpieza: Aplicá la crema sobre el rostro y cuello limpios y secos. 2. Aplicación: Tomá una pequeña cantidad de producto con la yema de tus dedos. 3. Masaje: Distribuí con suaves masajes circulares y ascendentes hasta su completa absorción. 4. Frecuencia: Usala por la mañana y por la noche para obtener mejores resultados.",
        precautions:
          "Uso externo exclusivamente. Evitar el contacto directo con los ojos. Si observás alguna reacción desfavorable, como irritación o enrojecimiento, suspendé su uso. Se recomienda realizar una prueba de sensibilidad en el antebrazo antes del primer uso. Mantener fuera del alcance de los niños.",
        weight: 50,
        dimensions: "6x6x5 cm",
        package_characteristics:
          "Frasco de vidrio 100% reciclable para preservar la pureza de la fórmula. Tapa a rosca de madera de bambú de fuentes gestionadas de forma responsable. La caja exterior está hecha de cartón reciclado e impreso con tintas vegetales.",
        is_featured: true,
        status: "active",
      },
      {
        name: "Aceite Facial Purificante JADE RITUAL",
        slug: "aceite-facial-purificante-jade-ritual",
        short_description:
          "Un aceite facial seco y liviano que equilibra la producción de sebo, purifica los poros y calma la piel sin dejar residuo graso.",
        description:
          "Complementá tu rutina con el Aceite Facial Purificante JADE RITUAL. Este elixir botánico, ligero como el aire, está diseñado para pieles que buscan hidratación sin congestión.",
        price: 13500.0,
        compare_at_price: 15000.0,
        inventory_quantity: 120,
        category_id: categories[1].id,
        featured_image: "https://example.com/jade-aceite-featured.jpg",
        gallery: ["https://example.com/jade-aceite-gallery1.jpg"],
        skin_type: ["Graso", "Mixto"],
        benefits: [
          "Equilibrante",
          "Purificante",
          "Antibacteriano",
          "Refrescante",
        ],
        certifications: ["Orgánico", "Vegano", "Libre de Crueldad"],
        ingredients: [
          { name: "Aceite de Jojoba Orgánico", percentage: 50 },
          { name: "Aceite de Semilla de Uva", percentage: 30 },
          { name: "Aceite de Avellana", percentage: 18 },
          { name: "Aceite Esencial de Árbol de Té", percentage: 1 },
          { name: "Aceite Esencial de Limón", percentage: 0.5 },
          { name: "Vitamina E", percentage: 0.5 },
        ],
        usage_instructions:
          "Aplicar 2-3 gotas sobre la piel limpia y húmeda, después del tónico o sérum. Masajear suavemente con las yemas de los dedos hasta su completa absorción. Puede usarse de día y/o de noche.",
        precautions:
          "Uso externo. Evitar contacto con los ojos. Contiene aceite esencial de limón que puede ser fotosensible, se recomienda usar protector solar durante el día. Discontinuar su uso si aparece irritación. Mantener fuera del alcance de los niños.",
        weight: 30,
        dimensions: "3x3x10 cm",
        package_characteristics:
          "Gotero de vidrio esmerilado verde jade con pipeta de bambú. Protege el contenido de la luz y permite una dosificación precisa. Empacado en caja de papel certificado FSC.",
        is_featured: false,
        status: "active",
      },
    ];

    // Return as downloadable JSON file
    const jsonString = JSON.stringify(template, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition":
          'attachment; filename="plantilla-productos.json"',
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    logger.error("Error generating JSON template", { error });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
