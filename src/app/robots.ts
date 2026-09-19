import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        // Las fotos públicas de Recipe/OG deben poder rastrearse. El endpoint
        // sigue aplicando visibilidad y devuelve 404 para fotos restringidas.
        allow: ["/", "/api/imagenes/"],
        disallow: ["/admin", "/api/", "/api/imagenes/firma", "/login", "/cuenta"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
