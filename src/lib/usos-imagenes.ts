import type { Filter, ObjectId } from "mongodb";
import type { Rol } from "@/models/usuario";
import type { ImagenDoc } from "@/models/imagen";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { conVisibilidadAlimentos } from "@/lib/alimentos";
import { borrarDeImageKit } from "@/lib/imagekit";

/** Fuente común para autorizar la entrega y conservar imágenes compartidas. */
export async function buscarUsoDeImagen(imagenId: ObjectId, rol: Rol) {
  const { recetas, alimentos } = await obtenerColecciones();
  const [receta, alimento] = await Promise.all([
    recetas.findOne(conVisibilidad(rol, { $or: [{ portadaId: imagenId }, { "pasos.imagenId": imagenId }] }), { projection: { _id: 1 } }),
    alimentos.findOne(conVisibilidadAlimentos(rol, { fotoId: imagenId }), { projection: { _id: 1 } }),
  ]);
  if (receta) return { recetaId: receta._id, alimentoId: null };
  if (alimento) return { recetaId: null, alimentoId: alimento._id };
  return null;
}

/** Solo tras persistir las nuevas referencias. Conserva fileId si falla ImageKit. */
export async function borrarImagenSinUso(imagen: ImagenDoc): Promise<boolean> {
  const { imagenes } = await obtenerColecciones();
  const uso = await buscarUsoDeImagen(imagen._id, "admin");
  if (uso) {
    await imagenes.updateOne({ _id: imagen._id }, { $set: uso });
    return false;
  }
  await borrarDeImageKit(imagen.fileId);
  await imagenes.deleteOne({ _id: imagen._id });
  return true;
}

/** Borrado editorial y reintento de limpiezas: nunca decide por el propietario solo. */
export async function limpiarImagenesAsociadas(filtro: Filter<ImagenDoc>) {
  const { imagenes } = await obtenerColecciones();
  const candidatas = await imagenes.find(filtro).toArray();
  let imagenesBorradas = 0;
  let imagenesConFallo = 0;
  for (const imagen of candidatas) {
    try { if (await borrarImagenSinUso(imagen)) imagenesBorradas += 1; }
    catch { imagenesConFallo += 1; }
  }
  return { imagenesBorradas, imagenesConFallo };
}
