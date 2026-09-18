import assert from "node:assert/strict";
import { test } from "node:test";
import { filtroCatalogo, LIMITE_INICIO, normalizarFiltrosCatalogo, ORDEN_CATALOGO, rutaCatalogo } from "../../src/lib/catalogo";

test("catálogo normaliza texto y descarta parámetros repetidos o desconocidos", () => {
  assert.deepEqual(normalizarFiltrosCatalogo({ q: "  limón  ", categoria: "  Entrantes ", rol: "admin" }), { q: "limón", categoria: "Entrantes" });
  assert.deepEqual(normalizarFiltrosCatalogo({ q: ["arroz", "tofu"], categoria: ["Postres"] }), { q: "", categoria: "" });
  assert.deepEqual(normalizarFiltrosCatalogo({ q: " \t ", categoria: undefined }), { q: "", categoria: "" });
});

test("las rutas de catálogo mantienen texto y categoría sin interpretar caracteres como URL", () => {
  const destino = new URL(rutaCatalogo("  quinoa & limón / arroz? #2  ", "Acompañantes / salsas"), "https://recetario.test");
  assert.equal(destino.origin, "https://recetario.test");
  assert.equal(destino.pathname, "/recetas");
  assert.equal(destino.hash, "");
  assert.equal(destino.searchParams.get("q"), "quinoa & limón / arroz? #2");
  assert.equal(destino.searchParams.get("categoria"), "Acompañantes / salsas");
  assert.equal(destino.searchParams.size, 2);
});

test("catálogo sin filtros y apertura de búsqueda tienen destinos distintos", () => {
  assert.equal(rutaCatalogo(), "/recetas");
  assert.equal(rutaCatalogo(" ", "\t"), "/recetas");
  assert.equal(rutaCatalogo("", "", true), "/recetas?buscar=1");
  const destino = new URL(rutaCatalogo("tofu", "Cenas", true), "https://recetario.test");
  assert.deepEqual(Object.fromEntries(destino.searchParams), { q: "tofu", categoria: "Cenas", buscar: "1" });
});

test("el catálogo público excluye borradores y recetas registradas en la consulta", () => {
  assert.deepEqual(filtroCatalogo("publico"), {
    $and: [{ estado: "publicada" }, { estado: "publicada", visibilidad: "publica" }],
  });
});

test("el catálogo de lectores registrados sigue excluyendo borradores", () => {
  assert.deepEqual(filtroCatalogo("registrado"), {
    $and: [{ estado: "publicada" }, { estado: "publicada", visibilidad: { $in: ["publica", "registrada"] } }],
  });
});

test("el administrador tampoco ve borradores en inicio ni catálogo", () => {
  assert.deepEqual(filtroCatalogo("admin"), { estado: "publicada" });
});

test("texto y categoría se combinan sin sustituir las restricciones de visibilidad", () => {
  const propio = {
    estado: "publicada",
    categorias: "Cenas",
    $or: [
      { titulo: { $regex: "tofu", $options: "i" } },
      { resumen: { $regex: "tofu", $options: "i" } },
      { categorias: { $regex: "tofu", $options: "i" } },
      { etiquetas: { $regex: "tofu", $options: "i" } },
      { "ingredientes.nombre": { $regex: "tofu", $options: "i" } },
    ],
  };
  assert.deepEqual(filtroCatalogo("publico", " tofu ", " Cenas "), {
    $and: [propio, { estado: "publicada", visibilidad: "publica" }],
  });
  assert.deepEqual(filtroCatalogo("admin", " tofu ", " Cenas "), propio);
});

test("la búsqueda trata los metacaracteres como texto literal en sus cinco campos", () => {
  const texto = ".* [tofu] (limón)+ $ ^ {2} \\";
  const filtro = filtroCatalogo("admin", texto);
  assert.equal(filtro.$or?.length, 5);
  for (const campo of filtro.$or ?? []) {
    const patron = Object.values(campo)[0] as { $regex: string; $options: string };
    const regex = new RegExp(patron.$regex, patron.$options);
    assert.ok(regex.test(`Receta ${texto.toUpperCase()} casera`));
    assert.equal(regex.test("Cualquier receta de tofu o limón"), false);
  }
  assert.deepEqual(filtroCatalogo("admin", " \t ", " "), { estado: "publicada" });
});

test("inicio pide tres recetas con orden estable de publicación más reciente", () => {
  assert.equal(LIMITE_INICIO, 3);
  assert.deepEqual(ORDEN_CATALOGO, { publicadaEn: -1, _id: -1 });
});
