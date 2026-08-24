import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { borrarDeImageKit } from "@/lib/imagekit";
import { docAImagen } from "@/lib/imagenes";
import { rolActual } from "@/lib/sesion";
import { idSchema } from "@/models/receta";

type Contexto = { params: Promise<{ id: string }> };

/**
 * Borra una imagen entera: el fichero en ImageKit, sus metadatos y cualquier
 * referencia desde recetas (portada o pasos), para no dejar ids colgando.
 *
 * El orden importa: primero ImageKit y solo despues Mongo. Si el borrado
 * remoto falla, el documento se queda con su `fileId`, que es justo lo que
 * permite reintentarlo; al reves, el fichero quedaria huerfano alli para
 * siempre y sin forma de localizarlo.
 */
export async function DELETE(_peticion: Request, contexto: Contexto) {
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

  try {
    await borrarDeImageKit(doc.fileId);
  } catch {
    return Response.json(
      { error: "ImageKit no respondio al borrar. Vuelve a intentarlo." },
      { status: 502 },
    );
  }

  await imagenes.deleteOne({ _id: doc._id });
  await recetas.updateMany({ portadaId: doc._id }, { $set: { portadaId: null } });
  await recetas.updateMany(
    { "pasos.imagenId": doc._id },
    { $set: { "pasos.$[paso].imagenId": null } },
    { arrayFilters: [{ "paso.imagenId": doc._id }] },
  );

  return Response.json(docAImagen(doc));
}
