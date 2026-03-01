import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://opttius.cl";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = [
    "",
    "/login",
    "/signup",
    "/about",
    "/legal/privacidad",
    "/legal/terminos",
    "/legal/cookies",
    "/legal/seguridad",
    "/support",
  ];

  return publicRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.8,
  }));
}
