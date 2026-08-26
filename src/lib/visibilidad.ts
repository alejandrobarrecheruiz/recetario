import type { Filter } from "mongodb";
import type { RecetaDoc } from "@/models/receta";
import type { Rol } from "@/models/usuario";

/**
 * REGLA DURA: el rol se traduce SIEMPRE a un filtro de consulta, NUNCA a un
 * condicional en el render (lo condicionado en JSX ya viajo al navegador).
 * Toda consulta a `recipes` pasa por aqui; si no incluye `filtroVisibilidad(rol)`,
 * esta mal. Ver CLAUDE.md, seccion 5.
 */
export function filtroVisibilidad(rol: Rol): Filter<RecetaDoc> {
  switch (rol) {
    case "admin":
      return {};

    case "registrado":
      return {
        estado: "publicada",
        visibilidad: { $in: ["publica", "registrada"] },
      };

    case "publico":
      return {
        estado: "publicada",
        visibilidad: "publica",
      };
  }
}

/**
 * Combina el filtro de visibilidad con un filtro propio. Usar esto en lugar de
 * hacer el spread a mano evita que un filtro descuidado pise `estado` o
 * `visibilidad` y abra un agujero.
 */
export function conVisibilidad(
  rol: Rol,
  filtro: Filter<RecetaDoc> = {},
): Filter<RecetaDoc> {
  const base = filtroVisibilidad(rol);
  if (Object.keys(base).length === 0) return filtro;
  return { $and: [filtro, base] };
}
