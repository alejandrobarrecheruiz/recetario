import { z } from "zod";
import type { ObjectId } from "mongodb";

/**
 * Modelo de dominio de una receta. Coleccion `recipes`.
 *
 * El esquema Zod es la FUENTE DE VERDAD: los tipos se derivan con `z.infer`,
 * nunca al reves. El mismo esquema lo usan las rutas de API y los formularios
 * del panel.
 *
 * Los identificadores se validan como hex de 24 caracteres, no como `ObjectId`:
 * este fichero lo importan componentes de cliente y `z.instanceof(ObjectId)`
 * arrastraria el driver de Mongo al bundle del navegador. La forma real en Mongo
 * es `RecetaDoc`, al final, con un import de solo tipo.
 */

/** Identificador de MongoDB en su forma serializable (hex de 24 caracteres). */
export const idSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/, "Identificador de MongoDB no valido");

/** Propone un slug a partir del titulo; el resultado sigue validando `recetaSchema`. */
export function generarSlug(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Responde a "esta terminada?". No confundir con `visibilidad`. */
export const estadoSchema = z.enum(["borrador", "publicada"]);

/** Responde a "quien puede verla?". No confundir con `estado`. */
export const visibilidadSchema = z.enum(["publica", "registrada"]);

export const dificultadSchema = z.enum(["facil", "media", "dificil"]);

/**
 * `cantidad`, `unidad` y `nombre` van SEPARADOS: es lo que permite escalar
 * raciones. Nunca guardar "600 g de queso crema" como una sola cadena.
 * `id` es propio y estable, para reordenar en el panel con keys fiables.
 */
export const ingredienteSchema = z.object({
  id: z.string().min(1).max(100),
  cantidad: z.number().nonnegative(),
  /** "g", "ml", "cucharada", "diente"... Cadena vacia para "al gusto". */
  unidad: z.string().max(80),
  nombre: z.string().trim().min(1).max(300),
  nota: z.string().max(1000).optional(),
});

/**
 * `texto` es string plano (ya es Markdown valido si algun dia se renderiza asi).
 * `imagenId` referencia la coleccion `images`, NUNCA una URL: cambiar de
 * proveedor de imagenes solo toca esa coleccion.
 */
export const pasoSchema = z.object({
  id: z.string().min(1).max(100),
  orden: z.number().int().nonnegative(),
  /** Rotulillo opcional del paso («El sofrito»). Las recetas viejas no lo tienen. */
  titulo: z.string().max(300).optional(),
  texto: z.string().trim().min(1).max(10000),
  imagenId: idSchema.nullable(),
});

/** Minutos. */
export const tiempoSchema = z.object({
  preparacion: z.number().int().nonnegative(),
  coccion: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const seoSchema = z.object({
  descripcion: z.string().max(500),
});

export const recetaSchema = z.object({
  _id: idSchema,
  /** Unico. Es la URL: /recetas/{slug}. Indice unico en Mongo. */
  slug: z
    .string()
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "El slug va en minusculas y guiones"),
  titulo: z.string().trim().min(1).max(300),
  resumen: z.string().max(2000),
  estado: estadoSchema,
  visibilidad: visibilidadSchema,
  publicadaEn: z.coerce.date().nullable(),
  actualizadaEn: z.coerce.date(),
  autorId: idSchema,

  raciones: z.number().int().positive(),
  tiempo: tiempoSchema,
  dificultad: dificultadSchema,
  categorias: z.array(z.string().trim().min(1).max(80)).max(30),
  etiquetas: z.array(z.string().trim().min(1).max(80)).max(50),

  ingredientes: z.array(ingredienteSchema).max(200),
  pasos: z.array(pasoSchema).max(100),

  /** Referencia a `images`, no una URL. */
  portadaId: idSchema.nullable(),
  notas: z.string().max(10000).optional(),
  seo: seoSchema,
});

/**
 * Lo que envia el panel al crear o editar. Los campos que decide el servidor
 * (`_id`, `autorId`, `actualizadaEn`) no viajan desde el formulario.
 */
export const recetaEntradaSchema = recetaSchema.omit({
  _id: true,
  autorId: true,
  actualizadaEn: true,
}).superRefine((receta, contexto) => {
  for (const lista of ["ingredientes", "pasos"] as const) {
    const ids = receta[lista].map((elemento) => elemento.id);
    if (new Set(ids).size !== ids.length) {
      contexto.addIssue({ code: "custom", path: [lista], message: "Cada elemento debe tener un identificador distinto." });
    }
    if (receta.estado === "publicada" && ids.length === 0) {
      contexto.addIssue({ code: "custom", path: [lista], message: `Añade ${lista} antes de publicar.` });
    }
  }
  if (receta.estado === "publicada" && receta.tiempo.total < Math.max(receta.tiempo.preparacion, receta.tiempo.coccion)) {
    contexto.addIssue({ code: "custom", path: ["tiempo", "total"], message: "El tiempo total no puede ser menor que la preparación o la cocción." });
  }
});

export type Ingrediente = z.infer<typeof ingredienteSchema>;
export type Paso = z.infer<typeof pasoSchema>;
export type Tiempo = z.infer<typeof tiempoSchema>;
export type Estado = z.infer<typeof estadoSchema>;
export type Visibilidad = z.infer<typeof visibilidadSchema>;
export type Dificultad = z.infer<typeof dificultadSchema>;
export type Receta = z.infer<typeof recetaSchema>;
export type RecetaEntrada = z.infer<typeof recetaEntradaSchema>;

/**
 * La misma receta tal y como vive en MongoDB: los identificadores son `ObjectId`
 * de verdad. Se usa para tipar la coleccion en el servidor (`db.collection<RecetaDoc>`).
 * El import de `ObjectId` es de solo tipo, asi que no llega al navegador.
 */
export type RecetaDoc = Omit<
  Receta,
  "_id" | "autorId" | "portadaId" | "pasos"
> & {
  _id: ObjectId;
  autorId: ObjectId;
  portadaId: ObjectId | null;
  pasos: Array<Omit<Paso, "imagenId"> & { imagenId: ObjectId | null }>;
};
