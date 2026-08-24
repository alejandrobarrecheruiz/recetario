import type { MetadataRoute } from "next";
import { obtenerRecetas } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";

// Un buscador es un visitante anonimo: el sitemap se genera SIEMPRE con el rol
// "publico", fijo. Las recetas de registrados y los borradores no aparecen —
// listarlos aqui seria confirmar que existen, la fuga que la seccion 5 prohibe.
//
// Dinamico a proposito: las recetas se publican sin redesplegar, y un sitemap
// resuelto en el build se quedaria con la foto del despliegue.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const coleccion = await obtenerRecetas();

  const docs = await coleccion
    .find(conVisibilidad("publico"))
    .sort({ publicadaEn: -1 })
    .toArray();

  return [
    {
      url: base,
      lastModified: docs[0]?.actualizadaEn ?? new Date(),
    },
    ...docs.map((receta) => ({
      url: `${base}/recetas/${receta.slug}`,
      lastModified: receta.actualizadaEn,
    })),
  ];
}
