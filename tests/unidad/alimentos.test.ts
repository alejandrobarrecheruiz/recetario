import { test } from "node:test";
import assert from "node:assert/strict";
import { alimentoEntradaSchema, alimentoSchema, claveDeAlimento, revisarCompras } from "@/models/alimento";
import { alimentoADoc, conVisibilidadAlimentos, docAAlimento } from "@/lib/alimentos";
import { imagenEntradaSchema } from "@/models/imagen";

const id = "68a000000000000000000001";
const compra = { id: "tienda-1", tienda: "Mercado", url: "https://ejemplo.test/arroz", nota: "", revisadoEn: new Date("2026-09-01") };
const entrada = { nombre: "Arroz integral", recomendacion: "Para las comidas de la semana.", estado: "borrador" as const,
  indispensable: false, fotoId: null, compras: [compra] };

test("la identidad del alimento normaliza mayúsculas, espacios y tildes", () => {
  assert.equal(claveDeAlimento("  CAFÉ   molido "), claveDeAlimento("cafe molido"));
  assert.notEqual(claveDeAlimento("arroz integral"), claveDeAlimento("arroz blanco"));
});

test("un alimento admite borrador incompleto y exige recomendación al publicar", () => {
  assert.ok(alimentoEntradaSchema.safeParse({ ...entrada, recomendacion: "" }).success);
  assert.equal(alimentoEntradaSchema.safeParse({ ...entrada, estado: "publicado", recomendacion: " " }).success, false);
  const validada = alimentoEntradaSchema.parse({ ...entrada, estado: "publicado", indispensable: true, compras: [], claveNombre: "inyectada", autorId: id });
  assert.equal(validada.indispensable, true);
  assert.equal("claveNombre" in validada, false);
  assert.equal("autorId" in validada, false);
});

test("los lugares permiten tiendas físicas y rechazan enlaces inseguros, IDs y destinos repetidos", () => {
  assert.ok(alimentoEntradaSchema.safeParse({ ...entrada, compras: [{ ...compra, url: "" }] }).success);
  for (const url of ["javascript:alert(1)", "http://ejemplo.test", "https://user:pass@ejemplo.test", "no es una URL"]) {
    assert.equal(alimentoEntradaSchema.safeParse({ ...entrada, compras: [{ ...compra, url }] }).success, false);
  }
  assert.equal(alimentoEntradaSchema.safeParse({ ...entrada, compras: [compra, { ...compra, url: "https://otra.test" }] }).success, false);
  assert.equal(alimentoEntradaSchema.safeParse({ ...entrada, compras: [compra, { ...compra, id: "otra" }] }).success, false);
});

test("editar la recomendación conserva la revisión; cambiar el destino invalida la antigua", () => {
  const ahora = new Date("2026-10-09");
  assert.deepEqual(revisarCompras([compra], [compra], ahora), [compra]);
  assert.equal(revisarCompras([{ ...compra, url: "https://otra.test" }], [compra], ahora)[0].revisadoEn, null);
  assert.equal(revisarCompras([{ ...compra, tienda: "Otra tienda" }], [compra], ahora)[0].revisadoEn, null);
  assert.deepEqual(revisarCompras([{ ...compra, url: "https://otra.test", revisadoEn: ahora }], [compra], ahora)[0].revisadoEn, ahora);
  assert.deepEqual(revisarCompras([{ ...compra, revisadoEn: new Date("2030-01-01") }], [], ahora)[0].revisadoEn, ahora);
});

test("los borradores de alimentos se excluyen en la consulta de lectores y público", () => {
  for (const rol of ["publico", "registrado"] as const) {
    assert.deepEqual(conVisibilidadAlimentos(rol, { estado: "borrador" }), { $and: [{ estado: "publicado" }, { estado: "borrador" }] });
  }
  assert.deepEqual(conVisibilidadAlimentos("admin", { indispensable: true }), { indispensable: true });
});

test("la conversión de alimento conserva foto, fechas y compras sin copiar imágenes", () => {
  const alimento = alimentoSchema.parse({ ...entrada, _id: id, autorId: id, fotoId: id, claveNombre: claveDeAlimento(entrada.nombre), publicadaEn: null, actualizadaEn: new Date() });
  assert.deepEqual(docAAlimento(alimentoADoc(alimento)), alimento);
});

test("una imagen puede proceder de Despensa, pero no de dos propietarios a la vez", () => {
  const imagen = { recetaId: null, alimentoId: id, proveedor: "imagekit", fileId: "archivo", url: "https://ejemplo.test/foto.jpg", path: "/dev/foto.jpg",
    alt: "Arroz", ancho: 1, alto: 1, bytes: 1, tipo: "portada", orden: 0 };
  assert.ok(imagenEntradaSchema.safeParse(imagen).success);
  assert.equal(imagenEntradaSchema.safeParse({ ...imagen, recetaId: id }).success, false);
});
