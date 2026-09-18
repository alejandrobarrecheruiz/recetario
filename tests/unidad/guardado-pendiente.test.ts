import { test } from "node:test";
import assert from "node:assert/strict";
import { recordarGuardado, guardadoPendiente, olvidarGuardado, CLAVE_GUARDADO_PENDIENTE } from "../../src/lib/guardado-pendiente";
import { anchoImagen, rutaImagen } from "../../src/lib/entrega-imagenes";

const id = "1234567890abcdef12345678";
function almacen() {
  const valores = new Map<string, string>();
  return { getItem: (k: string) => valores.get(k) ?? null, setItem: (k: string, v: string) => { valores.set(k, v); }, removeItem: (k: string) => { valores.delete(k); } };
}
test("guardar tras entrar exige intención local vigente y mismo destino", () => {
  const a = almacen();
  assert.equal(guardadoPendiente(a, "/recetas", "https://recetario.test", 100), null);
  recordarGuardado(a, id, "/recetas?q=arroz#lista", "https://recetario.test", 100);
  assert.equal(guardadoPendiente(a, "/recetas?q=arroz#lista", "https://recetario.test", 200), id);
  assert.equal(guardadoPendiente(a, "/cuenta", "https://recetario.test", 200), null);
  recordarGuardado(a, id, "/", "https://recetario.test", 100);
  assert.equal(guardadoPendiente(a, "/", "https://recetario.test", 3_600_100), null);
  recordarGuardado(a, id, "/", "https://recetario.test", 100);
  olvidarGuardado(a);
  assert.equal(a.getItem(CLAVE_GUARDADO_PENDIENTE), null);
});
test("intenciones corruptas, futuras o con ids arbitrarios no ejecutan guardados", () => {
  const a = almacen();
  for (const valor of ["{", "null", JSON.stringify({ recetaId: "../otra", volver: "/", creadaEn: 100 }), JSON.stringify({ recetaId: id, volver: "/", creadaEn: 300 })]) {
    a.setItem(CLAVE_GUARDADO_PENDIENTE, valor);
    assert.equal(guardadoPendiente(a, "/", "https://recetario.test", 200), null);
  }
});
test("la entrega de imágenes solo admite tamaños acotados", () => {
  assert.equal(anchoImagen(null), 1200);
  assert.equal(anchoImagen("960"), 960);
  for (const valor of ["0", "-1", "999999", "960.0", "960&tr=orig", "abc", ""]) assert.equal(anchoImagen(valor), null);
  assert.equal(rutaImagen(id), `/api/imagenes/${id}`);
});
