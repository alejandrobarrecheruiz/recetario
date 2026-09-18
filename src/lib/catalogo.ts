import type { Filter } from "mongodb";
import type { RecetaDoc } from "@/models/receta";
import type { Rol } from "@/models/usuario";
import { conVisibilidad } from "@/lib/visibilidad";

export const LIMITE_INICIO = 3;
export const ORDEN_CATALOGO = { publicadaEn: -1, _id: -1 } as const;

export function normalizarFiltrosCatalogo(parametros: Record<string, string | string[] | undefined>) {
  return {
    q: typeof parametros.q === "string" ? parametros.q.trim() : "",
    categoria: typeof parametros.categoria === "string" ? parametros.categoria.trim() : "",
  };
}

export function rutaCatalogo(q = "", categoria = "", buscar = false): string {
  const parametros = new URLSearchParams();
  if (q.trim()) parametros.set("q", q.trim());
  if (categoria.trim()) parametros.set("categoria", categoria.trim());
  if (buscar) parametros.set("buscar", "1");
  return parametros.size ? `/recetas?${parametros}` : "/recetas";
}

/** Incluso el administrador consulta aquí solo recetas publicadas. */
export function filtroCatalogo(rol: Rol, q = "", categoria = ""): Filter<RecetaDoc> {
  const propio: Filter<RecetaDoc> = { estado: "publicada" };
  if (q.trim()) {
    const patron = { $regex: q.trim().replace(/[.*+?^$()|[\]{}\\]/g, "\\$&"), $options: "i" };
    propio.$or = [{ titulo: patron }, { resumen: patron }, { categorias: patron }, { etiquetas: patron }, { "ingredientes.nombre": patron }];
  }
  if (categoria.trim()) propio.categorias = categoria.trim();
  return conVisibilidad(rol, propio);
}
