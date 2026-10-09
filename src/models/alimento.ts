import { z } from "zod";
import type { ObjectId } from "mongodb";
import { idSchema } from "@/models/receta";

/** Identidad editorial: evita duplicados por mayúsculas, tildes o espacios. */
export function claveDeAlimento(nombre: string) {
  return nombre.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export const lugarCompraSchema = z.object({
  id: z.string().min(1).max(100),
  tienda: z.string().trim().min(1, "Indica el nombre de la tienda.").max(160),
  // Vacío permite recomendar tiendas físicas sin inventar una dirección web.
  url: z.union([z.literal(""), z.url().max(2000).refine(valor => {
    try {
      const url = new URL(valor);
      return url.protocol === "https:" && !url.username && !url.password;
    } catch { return false; }
  }, "Usa un enlace HTTPS sin credenciales.")]),
  nota: z.string().trim().max(500),
  revisadoEn: z.coerce.date().nullable(),
});

/** Una ficha por alimento; indispensable es una selección de esas mismas fichas. */
export const alimentoSchema = z.object({
  _id: idSchema,
  nombre: z.string().trim().min(1, "Ponle un nombre al alimento.").max(160),
  claveNombre: z.string().min(1).max(160),
  recomendacion: z.string().trim().max(5000),
  estado: z.enum(["borrador", "publicado"]),
  indispensable: z.boolean(),
  fotoId: idSchema.nullable(),
  compras: z.array(lugarCompraSchema).max(12),
  publicadaEn: z.coerce.date().nullable(),
  actualizadaEn: z.coerce.date(),
  autorId: idSchema,
});

export const alimentoEntradaSchema = alimentoSchema.omit({
  _id: true, claveNombre: true, publicadaEn: true, actualizadaEn: true, autorId: true,
}).superRefine((alimento, contexto) => {
  if (alimento.estado === "publicado" && !alimento.recomendacion) {
    contexto.addIssue({ code: "custom", path: ["recomendacion"], message: "Cuenta por qué lo recomiendas antes de publicar." });
  }
  if (new Set(alimento.compras.map(compra => compra.id)).size !== alimento.compras.length) {
    contexto.addIssue({ code: "custom", path: ["compras"], message: "Cada lugar de compra debe tener un identificador distinto." });
  }
  const destinos = alimento.compras.map(compra => {
    if (!compra.url) return claveDeAlimento(compra.tienda);
    try { return new URL(compra.url).href; } catch { return compra.url; }
  });
  if (new Set(destinos).size !== destinos.length) {
    contexto.addIssue({ code: "custom", path: ["compras"], message: "Hay un lugar de compra repetido." });
  }
});

export type Alimento = z.infer<typeof alimentoSchema>;
export type AlimentoEntrada = z.infer<typeof alimentoEntradaSchema>;
export type LugarCompra = z.infer<typeof lugarCompraSchema>;
export type AlimentoDoc = Omit<Alimento, "_id" | "fotoId" | "autorId"> & {
  _id: ObjectId; fotoId: ObjectId | null; autorId: ObjectId;
};

/** Cambiar el destino invalida la revisión anterior, salvo comprobación expresa nueva. */
export function revisarCompras(compras: LugarCompra[], anteriores: LugarCompra[], ahora = new Date()): LugarCompra[] {
  return compras.map(compra => {
    const anterior = anteriores.find(otra => otra.id === compra.id);
    const cambio = anterior && (compra.url !== anterior.url || compra.tienda !== anterior.tienda);
    const repetida = compra.revisadoEn?.getTime() === anterior?.revisadoEn?.getTime();
    return { ...compra, revisadoEn: !compra.revisadoEn || (cambio && repetida) ? null : new Date(Math.min(compra.revisadoEn.getTime(), ahora.getTime())) };
  });
}
