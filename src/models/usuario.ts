import { z } from "zod";
import type { ObjectId } from "mongodb";

/**
 * Roles y forma del usuario. Las colecciones de auth las crea y migra el
 * adaptador de Better Auth; aqui solo vive el vocabulario de roles del dominio.
 *
 *   - `publico` NO es un rol almacenado: es la ausencia de sesion.
 *   - En `user.role` solo se guarda `admin` o `registrado`.
 *   - Cualquier valor desconocido con sesion valida cuenta como `registrado`.
 */

/** Rol efectivo en tiempo de ejecucion. Es lo que consume `filtroVisibilidad`. */
export const rolSchema = z.enum(["publico", "registrado", "admin"]);

/** Lo unico que se persiste en `user.role`. */
export const rolAlmacenadoSchema = z.enum(["registrado", "admin"]);

export type Rol = z.infer<typeof rolSchema>;
export type RolAlmacenado = z.infer<typeof rolAlmacenadoSchema>;

export const ROL_POR_DEFECTO: RolAlmacenado = "registrado";

/**
 * Traduce lo que hay en la sesion al rol efectivo: sin valor -> `publico`,
 * `"admin"` -> `admin`, cualquier otra cosa -> `registrado`.
 *
 * Recibe el rol, no la sesion, asi que un usuario con sesion pero sin campo
 * `role` (solo posible tocando la base a mano) cae en `publico`: falla cerrado,
 * ve de menos, nunca de mas.
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
