import { test } from "node:test";
import assert from "node:assert/strict";
import { comprobarIntegridadImagenes, entornoIntegridadImagenes } from "@/lib/integridad-imagenes";
import { inventariarArchivosImageKit } from "@/lib/inventario-imagekit";

const imagen = (_id: string, fileId = _id, recetaId: string | null = null) => ({
  _id, proveedor: "imagekit" as const, fileId, recetaId, path: `/dev/${fileId}.jpg`,
});
const archivo = (fileId: string) => ({ fileId, path: `/dev/${fileId}.jpg` });

test("las referencias reales protegen imágenes compartidas aunque recetaId sea null o antiguo", () => {
  const resultado = comprobarIntegridadImagenes([
    { _id: "receta-1", portadaId: "portada", pasos: [{ id: "paso-1", imagenId: "paso" }] },
    { _id: "receta-2", portadaId: "paso", pasos: [] },
  ], [imagen("portada"), imagen("paso", "paso", "receta-eliminada")], [archivo("portada"), archivo("paso")], "dev");
  assert.ok(Object.values(resultado).every(incidencias => incidencias.length === 0));
});

test("detecta duplicados, referencias rotas y huérfanas incluso con recetaId asignado", () => {
  const resultado = comprobarIntegridadImagenes([
    { _id: "receta", portadaId: "ausente", pasos: [{ id: "paso-estable", imagenId: "tambien-ausente" }, { id: "sin-foto", imagenId: null }] },
  ], [imagen("a", "compartido", "receta"), imagen("b", "compartido")], [archivo("compartido"), archivo("sin-metadatos")], "dev");
  assert.deepEqual(resultado.duplicados, [{ proveedor: "imagekit", fileId: "compartido", imagenIds: ["a", "b"] }]);
  assert.deepEqual(resultado.referenciasRotas, [
    { recetaId: "receta", imagenId: "ausente", ubicacion: "portada" },
    { recetaId: "receta", imagenId: "tambien-ausente", ubicacion: "paso:paso-estable" },
  ]);
  assert.deepEqual(resultado.imagenesSinReferencias.map(imagen => imagen.imagenId), ["a", "b"]);
  assert.deepEqual(resultado.archivosSinMetadatos, [archivo("sin-metadatos")]);
  assert.deepEqual(resultado.imagenesSinArchivo, []);
});

test("distingue archivos ausentes de rutas incorrectas y de otros entornos", () => {
  const resultado = comprobarIntegridadImagenes([], [
    imagen("eliminada"),
    { ...imagen("movida"), path: "/dev/anterior.jpg" },
    { ...imagen("otro-entorno"), path: "/prod/foto.jpg" },
  ], [archivo("movida")], "dev");
  assert.deepEqual(resultado.imagenesSinArchivo, [{ imagenId: "eliminada", fileId: "eliminada" }]);
  assert.deepEqual(resultado.rutasInconsistentes.map(imagen => imagen.imagenId), ["movida", "otro-entorno"]);
});

test("el inventario exige destinos conocidos, carpetas coherentes y permiso explícito para producción", () => {
  assert.deepEqual(entornoIntegridadImagenes("recetas_dev", "/dev/"), { base: "recetas_dev", carpeta: "dev" });
  assert.deepEqual(entornoIntegridadImagenes("recetas_prod", "prod", true), { base: "recetas_prod", carpeta: "prod" });
  assert.throws(() => entornoIntegridadImagenes("recetas_prod", "prod"), /--permitir-prod/);
  for (const [base, carpeta] of [["recetas_dev", "prod"], ["recetas_prod", "dev"], ["recetas_dev", ""], ["otra-base", "dev"], [undefined, undefined]]) {
    assert.throws(() => entornoIntegridadImagenes(base, carpeta, true));
  }
});

test("el listado de ImageKit pagina y recorre subcarpetas sin salir del entorno", async () => {
  const llamadas: { path: string; skip: number }[] = [];
  const resultado = await inventariarArchivosImageKit("dev", async parametros => {
    llamadas.push({ path: parametros.path, skip: parametros.skip });
    if (parametros.path === "/dev/subcarpeta/") return [{ type: "file", fileId: "anidado", filePath: "/dev/subcarpeta/a.jpg" }];
    if (parametros.skip === 1000) return [{ type: "file", fileId: "ultimo", filePath: "/dev/ultimo.jpg" }];
    return [
      ...Array.from({ length: 999 }, (_, indice) => ({ type: "file" as const, fileId: `f${indice}`, filePath: `/dev/${indice}.jpg` })),
      { type: "folder", folderPath: "/dev/subcarpeta" },
    ];
  });
  assert.equal(resultado.length, 1001);
  assert.ok(resultado.some(archivo => archivo.fileId === "anidado"));
  assert.ok(resultado.some(archivo => archivo.fileId === "ultimo"));
  assert.deepEqual(llamadas, [{ path: "/dev/", skip: 0 }, { path: "/dev/", skip: 1000 }, { path: "/dev/subcarpeta/", skip: 0 }]);
});

test("un fallo en una subcarpeta no devuelve un inventario parcial como completo", async () => {
  await assert.rejects(inventariarArchivosImageKit("dev", async ({ path }) => {
    if (path !== "/dev/") throw new Error("Proveedor no disponible");
    return [{ type: "file", fileId: "foto", filePath: "/dev/foto.jpg" }, { type: "folder", folderPath: "/dev/subcarpeta" }];
  }), /Proveedor no disponible/);
});

test("rechaza metadatos incompletos, listados repetidos y resultados fuera de la carpeta", async () => {
  for (const pagina of [
    [{ type: "file" as const, fileId: "sin-path" }],
    [{ type: "file" as const, fileId: "fuera", filePath: "/prod/a.jpg" }],
    [{ type: "folder" as const, folderPath: "/prod" }],
    Array.from({ length: 2 }, () => ({ type: "file" as const, fileId: "repetido", filePath: "/dev/a.jpg" })),
  ]) {
    await assert.rejects(inventariarArchivosImageKit("dev", async () => pagina));
  }
  await assert.rejects(inventariarArchivosImageKit("", async () => []));
});
