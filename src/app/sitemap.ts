import type { MetadataRoute } from "next";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { conVisibilidadAlimentos } from "@/lib/alimentos";

// Un buscador es un visitante anonimo: el sitemap se genera SIEMPRE con el rol
// "publico", fijo. Las recetas de registrados y los borradores no aparecen —
// listarlos aqui seria confirmar que existen, la fuga que la seccion 5 prohibe.
//
// Dinamico a proposito: las recetas se publican sin redesplegar, y un sitemap
// resuelto en el build se quedaria con la foto del despliegue.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const { recetas: coleccion, alimentos } = await obtenerColecciones();
  const ultimoAlimento = await alimentos.findOne(conVisibilidadAlimentos("publico"), { sort: { actualizadaEn: -1 }, projection: { actualizadaEn: 1 } });

  const docs = await coleccion
    .find(conVisibilidad("publico", { estado: "publicada" }))
    .sort({ publicadaEn: -1, _id: -1 })
    .toArray();

  return [
    { url: `${base}/despensa`, ...(ultimoAlimento ? { lastModified: ultimoAlimento.actualizadaEn } : {}) },
    {
      url: base,
      lastModified: docs[0]?.actualizadaEn ?? new Date(),
    },
    {
      url: `${base}/recetas`,
      lastModified: docs[0]?.actualizadaEn ?? new Date(),
    },
    ...docs.map((receta) => ({
      url: `${base}/recetas/${receta.slug}`,
      lastModified: receta.actualizadaEn,
    })),
  ];
}
