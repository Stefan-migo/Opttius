import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export default function robots(): MetadataRoute.Robots {
  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    return {
      rules: { userAgent: "*", allow: "/", disallow: "/" },
      sitemap: undefined,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/onboarding/",
          "/checkout/",
          "/profile/",
          "/reset-password/",
        ],
      },
      {
        userAgent: "GPTBot",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/onboarding/",
          "/checkout/",
          "/profile/",
        ],
      },
      {
        userAgent: "ChatGPT-User",
        allow: "/",
        disallow: [
          "/admin/",
          "/api/",
          "/onboarding/",
          "/checkout/",
          "/profile/",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
