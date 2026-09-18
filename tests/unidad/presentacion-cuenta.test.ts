import assert from "node:assert/strict";
import { test } from "node:test";
import { ilustracionCategoria, inicialesDelNombre } from "../../src/lib/presentacion-cuenta";
import { rutaCatalogo } from "../../src/lib/catalogo";

test("las iniciales soportan nombres vacíos, espacios y caracteres acentuados", () => {
  assert.equal(inicialesDelNombre("Alejandro Barreche Ruiz"), "AB");
  assert.equal(inicialesDelNombre("  álex   ruiz  "), "ÁR");
  assert.equal(inicialesDelNombre("María"), "M");
  assert.equal(inicialesDelNombre("   "), "?");
});

test("las ilustraciones reconocen las categorías reales sin imponer la taxonomía de la maqueta", () => {
  assert.equal(ilustracionCategoria(""), "todas");
  assert.equal(ilustracionCategoria("aperitivos"), "aperitivos");
  assert.equal(ilustracionCategoria("sopas frías"), "sopas");
  assert.equal(ilustracionCategoria("REPOSTERÍA"), "postres");
  assert.equal(ilustracionCategoria("clásicos"), "platos");
  assert.equal(ilustracionCategoria("Una categoría nueva"), "platos");
});

test("la ilustración no altera la categoría, la búsqueda ni el acceso sin JavaScript", () => {
  const categoria = "sopas frías";
  ilustracionCategoria(categoria);
  const ruta = new URL(rutaCatalogo("tomate & pepino", categoria, true), "https://ejemplo.test");
  assert.equal(ruta.searchParams.get("categoria"), categoria);
  assert.equal(ruta.searchParams.get("q"), "tomate & pepino");
  assert.equal(ruta.searchParams.get("buscar"), "1");
  assert.equal(new URL(rutaCatalogo("tomate", "", true), "https://ejemplo.test").searchParams.has("categoria"), false);
});
