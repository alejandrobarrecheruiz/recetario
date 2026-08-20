import type { Filter } from "mongodb";
import type { RecetaDoc } from "@/models/receta";
import type { Rol } from "@/models/usuario";

/**
 * REGLA DURA DEL PROYECTO
 * ----------------------
 * El rol se traduce SIEMPRE a un filtro de consulta, NUNCA a un condicional en
 * el render.
 *
 * Si se oculta contenido con `{rol === "registrado" && <Receta/>}` en el JSX,
 * ese contenido ya ha viajado al navegador dentro del payload de React y se ve
 * abriendo las herramientas de desarrollo. No es una proteccion, es un adorno.
 *
 * Toda consulta a `recipes` pasa por aqui. Si escribes una consulta de recetas
 * que no incluye `filtroVisibilidad(rol)`, esta mal.
 *
 * | Rol         | Ve                                                     |
 * |-------------|--------------------------------------------------------|
 * | publico     | estado: publicada + visibilidad: publica                |
 * | registrado  | lo anterior mas visibilidad: registrada                 |
 * | admin       | todo, incluidos borradores                             |
 */
export function filtroVisibilidad(rol: Rol): Filter<RecetaDoc> {
  switch (rol) {
    case "admin":
      // Sin restricciones: ve borradores y todo lo demas.
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
