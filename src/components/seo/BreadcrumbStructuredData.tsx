import { JsonLd } from "@/components/seo/JsonLd";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbStructuredDataProps {
  items: BreadcrumbItem[];
}

/**
 * Renders BreadcrumbList JSON-LD for SEO.
 */
export function BreadcrumbStructuredData({
  items,
}: BreadcrumbStructuredDataProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${baseUrl}${item.path}`,
    })),
  };

  return <JsonLd data={schema} />;
}
