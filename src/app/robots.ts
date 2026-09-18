import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") return { rules: { userAgent: "*", disallow: "/" } };
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // El panel, la API y las paginas de cuenta no pintan nada en un indice.
        disallow: ["/admin", "/api/", "/login", "/cuenta"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
