import { z } from "zod";
import type { ObjectId } from "mongodb";
import { idSchema } from "@/models/receta";

/**
 * Metadatos de una imagen. Coleccion `images`.
 *
 * Coleccion separada, NO subdocumentos dentro de la receta: asi se pueden
 * reutilizar imagenes entre recetas y detectar huerfanas (las que tienen
 * `recetaId: null` y nadie referencia).
 *
 * Los bytes viven en ImageKit; aqui solo viven los metadatos.
 */

export const proveedorSchema = z.literal("imagekit");

export const tipoImagenSchema = z.enum(["portada", "paso", "galeria"]);

export const imagenSchema = z.object({
  /** Identificador compartido con la receta: `portadaId` y `paso.imagenId` apuntan aqui. */
  _id: idSchema,
  recetaId: idSchema.nullable(),
  proveedor: proveedorSchema,
  /**
   * Id del fichero en ImageKit. OBLIGATORIO: sin el no se puede borrar alli, y
   * al eliminar una receta la foto se quedaria ocupando espacio para siempre.
   */
  fileId: z.string().min(1),
  url: z.url(),
  path: z.string().min(1),
  alt: z.string(),
  ancho: z.number().int().positive(),
  alto: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  tipo: tipoImagenSchema,
  orden: z.number().int().nonnegative(),
  subidaEn: z.coerce.date(),
  subidaPor: idSchema,
});

export type TipoImagen = z.infer<typeof tipoImagenSchema>;
export type Imagen = z.infer<typeof imagenSchema>;

/** La imagen tal y como vive en MongoDB. Ver la nota de `RecetaDoc`. */
export type ImagenDoc = Omit<
  Imagen,
  "_id" | "recetaId" | "subidaPor"
> & {
  _id: ObjectId;
  recetaId: ObjectId | null;
  subidaPor: ObjectId;
};
