import { z } from "zod";
import { recetaSchema, ingredienteSchema, pasoSchema, idSchema } from "@/models/receta";
import { imagenSchema } from "@/models/imagen";

/** Un borrador local admite campos a medio escribir; la API sigue siendo estricta. */
export const datosEditorSchema = recetaSchema.omit({ _id: true, autorId: true, actualizadaEn: true, seo: true }).extend({
  slug: z.string().max(1000), titulo: z.string().max(10000),
  ingredientes: z.array(ingredienteSchema.extend({ nombre: z.string().max(10000) })).max(200),
  pasos: z.array(pasoSchema.extend({ texto: z.string().max(100000) })).max(100),
  notas: z.string().max(100000), seoDescripcion: z.string().max(10000),
  publicadaEn: z.union([z.date(), z.string(), z.null()]),
});
export const borradorEditorSchema = z.object({
  recetaId: idSchema, usuarioId: idSchema, revision: z.iso.datetime(),
  guardadoEn: z.number(), datos: datosEditorSchema,
  imagenes: z.array(imagenSchema.extend({ url: z.string().regex(/^\/api\/imagenes\/[a-f\d]{24}$/) })),
  fotosPendientes: z.array(idSchema),
});
export type DatosEditor = z.infer<typeof datosEditorSchema>;
export type BorradorEditor = z.infer<typeof borradorEditorSchema>;
