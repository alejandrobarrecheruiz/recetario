import { test } from "node:test";
import assert from "node:assert/strict";
import { borradorEditorSchema } from "../../src/models/borrador-editor";
import { leerBorradores, prefijoBorrador } from "../../src/lib/borradores-editor";

const recetaId = "507f1f77bcf86cd799439011";
const usuarioId = "507f1f77bcf86cd799439012";
function borrador(guardadoEn = 100) {
  return { recetaId, usuarioId, revision: "2026-09-19T00:00:00.000Z", guardadoEn,
    datos: { slug: "", titulo: "", resumen: "", estado: "borrador", visibilidad: "publica", publicadaEn: null,
      raciones: 2, tiempo: { preparacion: 0, coccion: 0, total: 0 }, dificultad: "facil", categorias: [], etiquetas: [],
      ingredientes: [{ id: "i1", cantidad: 1, unidad: "cucharadita", nombre: "" }],
      pasos: [{ id: "p1", orden: 0, texto: "", imagenId: null }], portadaId: null, notas: "", seoDescripcion: "" },
    imagenes: [], fotosPendientes: [recetaId] };
}
function almacen(): Storage {
  const valores = new Map<string, string>();
  return { get length() { return valores.size; }, key: i => [...valores.keys()][i] ?? null,
    getItem: k => valores.get(k) ?? null, setItem: (k, v) => { valores.set(k, v); },
    removeItem: k => { valores.delete(k); }, clear: () => valores.clear() };
}
test("el borrador conserva campos incompletos, revisión y limpieza pendiente", () => {
  const datos = borradorEditorSchema.parse(JSON.parse(JSON.stringify(borrador())));
  assert.equal(datos.datos.ingredientes[0].nombre, "");
  assert.equal(datos.datos.pasos[0].texto, "");
  assert.equal(datos.revision, borrador().revision);
  assert.deepEqual(datos.fotosPendientes, [recetaId]);
});
test("dos pestañas no se pisan y se recupera primero la copia más reciente", () => {
  const a = almacen(); const prefijo = prefijoBorrador(usuarioId, recetaId);
  a.setItem(`${prefijo}pestaña1`, JSON.stringify(borrador(100)));
  a.setItem(`${prefijo}pestaña2`, JSON.stringify(borrador(200)));
  assert.deepEqual(leerBorradores(a, usuarioId, recetaId).map(b => b.borrador.guardadoEn), [200, 100]);
  a.removeItem(`${prefijo}pestaña2`);
  assert.equal(leerBorradores(a, usuarioId, recetaId).length, 1);
});
test("ignora copias dañadas y no muestra borradores de otras cuentas o recetas", () => {
  const a = almacen(); const prefijo = prefijoBorrador(usuarioId, recetaId);
  a.setItem(`${prefijo}roto`, "{");
  a.setItem(`${prefijo}otro-usuario`, JSON.stringify({ ...borrador(), usuarioId: recetaId }));
  a.setItem(`${prefijo}otra-receta`, JSON.stringify({ ...borrador(), recetaId: usuarioId }));
  a.setItem(`${prefijoBorrador(recetaId, recetaId)}fuera`, JSON.stringify(borrador()));
  a.setItem(`${prefijo}correcto`, JSON.stringify(borrador()));
  assert.equal(leerBorradores(a, usuarioId, recetaId).length, 1);
  assert.equal(a.length, 5);
});
