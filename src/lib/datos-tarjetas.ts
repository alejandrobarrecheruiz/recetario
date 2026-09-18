import "server-only";
import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import type { Receta, RecetaDoc } from "@/models/receta";
import type { Imagen } from "@/models/imagen";
import { rutaImagen } from "@/lib/entrega-imagenes";

type ResumenTarjeta = Pick<Receta, "_id" | "slug" | "titulo" | "resumen" | "publicadaEn" | "raciones" | "tiempo" | "dificultad" | "categorias">;
type FotoTarjeta = Pick<Imagen, "url" | "alt" | "ancho" | "alto">;

/** Solo los campos necesarios para una tarjeta; nunca documentos Mongo al cliente. */
export function resumenParaTarjeta(doc: RecetaDoc): ResumenTarjeta {
  return {
    _id: doc._id.toHexString(), slug: doc.slug, titulo: doc.titulo, resumen: doc.resumen,
    publicadaEn: doc.publicadaEn, raciones: doc.raciones, tiempo: doc.tiempo,
    dificultad: doc.dificultad, categorias: doc.categorias,
  };
}

/** Los candidatos deben proceder de una consulta con visibilidad ya aplicada. */
export async function datosParaTarjetas(docs: RecetaDoc[], usuarioId?: string) {
  const { imagenes, guardadas } = await obtenerColecciones();
  const ids = docs.map((doc) => doc._id);
  const portadas = docs.flatMap((doc) => doc.portadaId ? [doc.portadaId] : []);
  const [fotos, propias] = await Promise.all([
    portadas.length ? imagenes.find({ _id: { $in: portadas } }, { projection: { url: 1, alt: 1, ancho: 1, alto: 1 } }).toArray() : [],
    usuarioId && ids.length ? guardadas.find({ usuarioId: new ObjectId(usuarioId), recetaId: { $in: ids } }, { projection: { recetaId: 1 } }).toArray() : [],
  ]);
  return {
    fotos: new Map<string, FotoTarjeta>(fotos.map((foto) => [foto._id.toHexString(), { url: rutaImagen(foto._id.toHexString()), alt: foto.alt, ancho: foto.ancho, alto: foto.alto }])),
    guardadas: new Set(propias.map((guardada) => guardada.recetaId.toHexString())),
  };
}
