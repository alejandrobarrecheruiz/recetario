import { z } from "zod";
import type { ObjectId } from "mongodb";
import { idSchema } from "@/models/receta";

/**
 * Metadatos de una imagen. Coleccion `images`.
 *
 * Coleccion separada, NO subdocumentos dentro de la receta: asi se pueden
 * reutilizar imagenes entre recetas y detectar las que nadie referencia,
 * independientemente de que `recetaId` siga asignado o sea null.
 *
 * Los bytes viven en ImageKit; aqui solo viven los metadatos.
 */

export const proveedorSchema = z.literal("imagekit");

export const tipoImagenSchema = z.enum(["portada", "paso", "galeria"]);

export const imagenSchema = z.object({
  /** Identificador compartido con la receta: `portadaId` y `paso.imagenId` apuntan aqui. */
  _id: idSchema,
  /** Receta de origen para limpieza; los usos reales están en portadaId/pasos. */
  recetaId: idSchema.nullable(),
  /** Opcional para mantener compatibles las imágenes anteriores a Despensa. */
  alimentoId: idSchema.nullable().optional(),
  proveedor: proveedorSchema,
  /**
   * Id del fichero en ImageKit. OBLIGATORIO: sin el no se puede borrar alli, y
   * al eliminar una receta la foto se quedaria ocupando espacio para siempre.
   * Único junto a proveedor mediante índice en MongoDB.
   */
  fileId: z.string().min(1),
  url: z.url().refine((valor) => valor.startsWith("https://"), "La imagen debe usar HTTPS."),
  path: z.string().min(1),
  alt: z.string().max(1000),
  ancho: z.number().int().positive(),
  alto: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  tipo: tipoImagenSchema,
  orden: z.number().int().nonnegative(),
  subidaEn: z.coerce.date(),
  subidaPor: idSchema,
});

/**
 * Lo que envia el panel tras subir el fichero a ImageKit. Los campos que decide
 * el servidor (`_id`, `subidaEn`, `subidaPor`) no viajan desde el navegador.
 */
export const imagenEntradaSchema = imagenSchema.omit({
  _id: true,
  subidaEn: true,
  subidaPor: true,
}).refine(imagen => !(imagen.recetaId && imagen.alimentoId), "La imagen tiene un único origen: receta o alimento.");

export type TipoImagen = z.infer<typeof tipoImagenSchema>;
export type Imagen = z.infer<typeof imagenSchema>;
export type ImagenEntrada = z.infer<typeof imagenEntradaSchema>;

/** La imagen tal y como vive en MongoDB. Ver la nota de `RecetaDoc`. */
export type ImagenDoc = Omit<
  Imagen,
  "_id" | "recetaId" | "alimentoId" | "subidaPor"
> & {
  _id: ObjectId;
  recetaId: ObjectId | null;
  alimentoId?: ObjectId | null;
  subidaPor: ObjectId;
};
