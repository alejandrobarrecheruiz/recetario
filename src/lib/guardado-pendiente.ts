import { destinoInterno } from "@/lib/navegacion";

export const CLAVE_GUARDADO_PENDIENTE = "recetario:guardar-tras-acceso";
const VIGENCIA = 60 * 60 * 1000;
type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Solo se crea al pulsar Guardar. Una URL recibida de fuera no crea intención. */
export function recordarGuardado(almacen: Almacen, recetaId: string, volver: string, origen: string, ahora = Date.now()) {
  if (!/^[a-f\d]{24}$/i.test(recetaId)) return;
  almacen.setItem(CLAVE_GUARDADO_PENDIENTE, JSON.stringify({ recetaId, volver: destinoInterno(volver, origen), creadaEn: ahora }));
}

export function guardadoPendiente(almacen: Almacen, volver: string, origen: string, ahora = Date.now()): string | null {
  try {
    const valor = JSON.parse(almacen.getItem(CLAVE_GUARDADO_PENDIENTE) ?? "null");
    if (valor && typeof valor.recetaId === "string" && /^[a-f\d]{24}$/i.test(valor.recetaId)
      && typeof valor.creadaEn === "number" && valor.creadaEn <= ahora && ahora - valor.creadaEn < VIGENCIA
      && valor.volver === destinoInterno(volver, origen)) return valor.recetaId;
  } catch { /* Almacenamiento bloqueado o dato antiguo: el acceso sigue funcionando. */ }
  olvidarGuardado(almacen);
  return null;
}

export function olvidarGuardado(almacen: Almacen) {
  try { almacen.removeItem(CLAVE_GUARDADO_PENDIENTE); } catch { /* Puede estar bloqueado. */ }
}
