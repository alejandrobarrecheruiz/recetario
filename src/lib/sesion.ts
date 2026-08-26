import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { rolDeSesion, type Rol } from "@/models/usuario";

/**
 * Sesion y rol de la peticion actual, EN EL SERVIDOR.
 *
 * El rol sale siempre de aqui: nunca de una query string, una cabecera o un
 * campo que mande el cliente. Solo de servidor (importa auth.ts, que arrastra
 * el driver de Mongo).
 */

// `cache()` deduplica por peticion: la pagina, el rol y las guardadas pueden
// pedir la sesion sin resolverla mas de una vez.
export const sesionActual = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/** Rol efectivo de la peticion: `publico` si no hay sesion. */
export async function rolActual(): Promise<Rol> {
  const sesion = await sesionActual();
  return rolDeSesion(sesion?.user.role);
}
