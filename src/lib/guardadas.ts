import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { resumenParaTarjeta } from "@/lib/datos-tarjetas";
import type { RecetaParaTarjeta } from "@/components/tarjeta-receta";
import type { Imagen } from "@/models/imagen";
import type { Rol } from "@/models/usuario";
import { rutaImagen } from "@/lib/entrega-imagenes";

/** Datos mínimos de la tarjeta guardada, serializables para el cliente. */
export type RecetaGuardada = {
  recetaId: string;
  receta: RecetaParaTarjeta;
  foto?: Pick<Imagen, "url" | "alt" | "ancho" | "alto">;
};

/**
 * Las guardadas de un usuario con su portada, de la mas reciente
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
        receta: resumenParaTarjeta(receta),
        foto: foto ? { url: rutaImagen(foto._id.toHexString()), alt: foto.alt, ancho: foto.ancho, alto: foto.alto } : undefined,
      },
    ];
  });
}
