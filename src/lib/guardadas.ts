import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { duracion, urlConAncho } from "@/lib/formato";
import type { Rol } from "@/models/usuario";

/** Fila del listado de guardadas. Serializable: la consume un componente de cliente. */
export type RecetaGuardada = {
  recetaId: string;
  slug: string;
  titulo: string;
  categoria: string;
  tiempo: string;
  fotoUrl: string | null;
  fotoAlt: string;
};

/**
 * Las guardadas de un usuario con su miniatura de portada, de la mas reciente
 * a la primera. Solo de servidor.
 *
 * Las recetas pasan por el filtro del rol, como toda consulta: una guardada
 * que ya no es visible (despublicada, o de registrados si el rol bajase)
 * simplemente no aparece, como si no existiera.
 */
export async function recetasGuardadasDe(
  usuarioId: string,
  rol: Rol,
): Promise<RecetaGuardada[]> {
  const { recetas, imagenes, guardadas } = await obtenerColecciones();

  const propias = await guardadas
    .find({ usuarioId: new ObjectId(usuarioId) })
    .sort({ guardadaEn: -1 })
    .toArray();
  if (propias.length === 0) return [];

  const visibles = await recetas
    .find(conVisibilidad(rol, { _id: { $in: propias.map((doc) => doc.recetaId) } }))
    .toArray();
  const porId = new Map(visibles.map((doc) => [doc._id.toHexString(), doc]));

  const idsDePortada = visibles.flatMap((doc) => (doc.portadaId ? [doc.portadaId] : []));
  const fotos = new Map(
    (await imagenes.find({ _id: { $in: idsDePortada } }).toArray()).map((foto) => [
      foto._id.toHexString(),
      foto,
    ]),
  );

  return propias.flatMap((doc) => {
    const receta = porId.get(doc.recetaId.toHexString());
    if (!receta) return [];
    const foto = receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;
    return [
      {
        recetaId: receta._id.toHexString(),
        slug: receta.slug,
        titulo: receta.titulo,
        categoria: receta.categorias[0] ?? "receta",
        tiempo: duracion(receta.tiempo.total),
        fotoUrl: foto ? urlConAncho(foto.url, 160) : null,
        fotoAlt: foto?.alt ?? "",
      },
    ];
  });
}
