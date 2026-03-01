import { JsonLd } from "@/components/seo/JsonLd";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

/**
 * JSON-LD structured data for SEO and AIO.
 * Organization, SoftwareApplication, and WebSite schemas.
 */
export function LandingStructuredData() {
  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Opttius",
    url: baseUrl,
    logo: `${baseUrl}/logo-opttius.svg`,
    description:
      "Sistema de gestión para ópticas. Automatiza. Controla. Crece.",
  };

  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Opttius",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Sistema de gestión para ópticas. Centraliza recetas, inventario, flujos de laboratorio y ventas. Creado por tecnólogo médico. 100% nativo para ópticas.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: { "@type": "Organization", name: "Opttius" },
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Opttius",
    url: baseUrl,
    description: "Sistema de gestión para ópticas.",
    publisher: { "@type": "Organization", name: "Opttius" },
  };

  return (
    <>
      <JsonLd data={organization} />
      <JsonLd data={softwareApp} />
      <JsonLd data={website} />
    </>
  );
}
