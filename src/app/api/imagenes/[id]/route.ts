import { ObjectId } from "mongodb";
import { comprobarOrigen } from "@/lib/origen";
import { conVisibilidad } from "@/lib/visibilidad";
import { obtenerColecciones } from "@/lib/mongo";
import { borrarDeImageKit } from "@/lib/imagekit";
import { docAImagen } from "@/lib/imagenes";
import { rolActual } from "@/lib/sesion";
import { idSchema } from "@/models/receta";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Borra fichero y metadatos únicamente si ninguna receta lo referencia.
 * El editor guarda primero la sustitución y después solicita esta limpieza.
 *
 * El orden importa: primero ImageKit y solo despues Mongo. Si el borrado
 * remoto falla, el documento se queda con su `fileId`, que es justo lo que
 * permite reintentarlo; al reves, el fichero quedaria huerfano alli para
 * siempre y sin forma de localizarlo.
 */
export async function DELETE(_peticion: Request, contexto: Contexto) {
  const origenInvalido = comprobarOrigen(_peticion);
  if (origenInvalido) return origenInvalido;
  if ((await rolActual()) !== "admin") {
    return Response.json({ error: "Solo el admin borra imagenes." }, { status: 403 });
  }

  const { id } = await contexto.params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) {
    return Response.json({ error: "Identificador no valido." }, { status: 404 });
  }

  const { recetas, imagenes } = await obtenerColecciones();
  const doc = await imagenes.findOne({ _id: new ObjectId(idValido.data) });
  if (!doc) {
    return Response.json({ error: "No existe esa imagen." }, { status: 404 });
  }

  const referencia = await recetas.findOne(conVisibilidad("admin", {
    $or: [{ portadaId: doc._id }, { "pasos.imagenId": doc._id }],
  }), { projection: { _id: 1 } });
  if (referencia) {
    return Response.json({ error: "Esta foto sigue en una receta. Guarda primero el cambio de foto." }, { status: 409 });
  }

  try {
    await borrarDeImageKit(doc.fileId);
  } catch {
    return Response.json(
      { error: "ImageKit no respondio al borrar. Vuelve a intentarlo." },
      { status: 502 },
    );
  }

  await imagenes.deleteOne({ _id: doc._id });

  return Response.json(docAImagen(doc));
}
