import { z } from "zod";
import type { ObjectId } from "mongodb";
import { idSchema } from "@/models/receta";

/**
 * Una receta guardada por un usuario. Coleccion `saves`.
 *
 * Documento propio por (usuario, receta) con indice unico compuesto: guardar
 * dos veces no duplica, y quitar es borrar un documento. Guarda el id de la
 * receta, NUNCA una copia: si la receta cambia de visibilidad, el listado de
 * guardadas la filtra con el rol de la sesion como cualquier otra consulta.
 */
export const guardadaSchema = z.object({
  _id: idSchema,
  usuarioId: idSchema,
  recetaId: idSchema,
  guardadaEn: z.coerce.date(),
});

export type Guardada = z.infer<typeof guardadaSchema>;

/** La forma en Mongo, con `ObjectId` de verdad. Ver la nota de `RecetaDoc`. */
export type GuardadaDoc = Omit<Guardada, "_id" | "usuarioId" | "recetaId"> & {
  _id: ObjectId;
  usuarioId: ObjectId;
  recetaId: ObjectId;
};
