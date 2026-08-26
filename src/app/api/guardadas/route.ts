import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { duracion } from "@/lib/formato";
import { sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";

// Las recetas guardadas de la sesion. Como toda la API, comprueba la sesion
// por su cuenta; el rol nunca llega del cliente.

/**
 * Listado para la vista de cuenta. Las recetas se filtran con el rol de la
 * sesion: una guardada que ya no es visible (despublicada, o de registrados
 * si el rol bajase) simplemente no aparece, como si no existiera.
 */
export async function GET() {
  const sesion = await sesionActual();
  if (!sesion) {
    return Response.json({ error: "Hace falta una cuenta." }, { status: 401 });
  }
  const rol = rolDeSesion(sesion.user.role);

  const { recetas, guardadas } = await obtenerColecciones();
  const propias = await guardadas
    .find({ usuarioId: new ObjectId(sesion.user.id) })
    .sort({ guardadaEn: -1 })
    .toArray();

  const visibles = await recetas
    .find(conVisibilidad(rol, { _id: { $in: propias.map((doc) => doc.recetaId) } }))
    .toArray();
  const porId = new Map(visibles.map((doc) => [doc._id.toHexString(), doc]));

  // En el orden en que se guardaron, de la mas reciente a la primera.
  const lista = propias.flatMap((doc) => {
    const receta = porId.get(doc.recetaId.toHexString());
    if (!receta) return [];
    return [
      {
        recetaId: receta._id.toHexString(),
        slug: receta.slug,
        titulo: receta.titulo,
        categoria: receta.categorias[0] ?? "receta",
        tiempo: duracion(receta.tiempo.total),
      },
    ];
  });

  return Response.json(lista);
}
