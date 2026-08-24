import { z } from "zod";
import type { ObjectId } from "mongodb";

/**
 * Roles y forma del usuario.
 *
 * Better Auth es el dueno de las colecciones `user`, `session`, `account` y
 * `verification`: las crea y las migra el propio adaptador de MongoDB, aqui no
 * se declaran esquemas de escritura para ellas. Lo que si vive aqui es el
 * vocabulario de roles del dominio, que es nuestro.
 *
 * Distincion importante:
 *
 *   - `publico` NO es un rol almacenado. Es la ausencia de sesion. Nadie tiene
 *     `role: "publico"` en la base de datos.
 *   - En `user.role` (campo que anade el plugin `admin` de Better Auth) solo se
 *     guarda `admin` o `registrado`.
 *   - El plugin `admin` pondria `"user"` por defecto en los usuarios nuevos; en
 *     src/lib/auth.ts se le configura `defaultRole: ROL_POR_DEFECTO` para que
 *     no lo haga. `rolDeSesion` trata igualmente cualquier valor desconocido
 *     con sesion valida como `registrado`, por si algun documento viejo o
 *     tocado a mano lo trae.
 */

/** Rol efectivo en tiempo de ejecucion. Es lo que consume `filtroVisibilidad`. */
export const rolSchema = z.enum(["publico", "registrado", "admin"]);

/** Lo unico que se persiste en `user.role`. */
export const rolAlmacenadoSchema = z.enum(["registrado", "admin"]);

export type Rol = z.infer<typeof rolSchema>;
export type RolAlmacenado = z.infer<typeof rolAlmacenadoSchema>;

export const ROL_POR_DEFECTO: RolAlmacenado = "registrado";

/**
 * Traduce lo que hay en la sesion al rol efectivo.
 *
 * Sin sesion -> `publico`. Con sesion y `role: "admin"` -> `admin`. Con sesion y
 * cualquier otra cosa (incluido el `"user"` que pone Better Auth por defecto)
 * -> `registrado`.
 *
 * Esta funcion recibe el rol, no la sesion, asi que NO distingue "no hay
 * sesion" de "hay sesion pero el documento de usuario no tiene campo `role`".
 * Los dos casos llegan aqui como `null` o `undefined` y los dos devuelven
 * `publico`.
 *
 * Decision de la fase 3: se queda asi. Todas las altas pasan por
 * `auth.api.createUser` (scripts/crear-usuario.ts), que siempre escribe `role`,
 * y el plugin lleva `defaultRole: ROL_POR_DEFECTO` por si acaso; el documento
 * sin campo `role` solo puede salir de tocar la base a mano. Y si sale, falla
 * cerrado: ese usuario ve de menos, nunca de mas.
 */
export function rolDeSesion(rolGuardado: string | null | undefined): Rol {
  if (rolGuardado === undefined || rolGuardado === null) return "publico";
  return rolGuardado === "admin" ? "admin" : "registrado";
}

/**
 * Vista de solo lectura del usuario tal y como lo deja Better Auth con el plugin
 * `admin`. No se escribe desde aqui: lo gestiona Better Auth.
 */
export type UsuarioDoc = {
  _id: ObjectId;
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Lo anade el plugin `admin`. Ver `rolDeSesion`. */
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
  banExpires?: Date | null;
};
