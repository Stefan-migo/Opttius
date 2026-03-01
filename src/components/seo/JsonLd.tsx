interface JsonLdProps {
  data: object;
}

/**
 * Renders JSON-LD structured data for SEO.
 * Sanitizes data by replacing < with \u003c to prevent XSS.
 */
export function JsonLd({ data }: JsonLdProps) {
  const jsonString = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
