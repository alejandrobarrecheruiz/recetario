import { borradorEditorSchema, type BorradorEditor } from "@/models/borrador-editor";

export function prefijoBorrador(usuarioId: string, recetaId: string) {
  return `recetario:editor:${usuarioId}:${recetaId}:`;
}
export function leerBorradores(almacen: Storage, usuarioId: string, recetaId: string) {
  const encontrados: Array<{ clave: string; borrador: BorradorEditor }> = [];
  const prefijo = prefijoBorrador(usuarioId, recetaId);
  for (let i = 0; i < almacen.length; i++) {
    const clave = almacen.key(i);
    if (!clave?.startsWith(prefijo)) continue;
    try {
      const resultado = borradorEditorSchema.safeParse(JSON.parse(almacen.getItem(clave) ?? "null"));
      if (resultado.success && resultado.data.usuarioId === usuarioId && resultado.data.recetaId === recetaId) encontrados.push({ clave, borrador: resultado.data });
    } catch { /* Un borrador dañado no impide abrir otros. */ }
  }
  return encontrados.sort((a, b) => b.borrador.guardadoEn - a.borrador.guardadoEn);
}
