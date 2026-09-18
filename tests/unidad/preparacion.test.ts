import assert from "node:assert/strict";
import { test } from "node:test";
import { clavePreparacion, preparacionInicial, reducirPreparacion, type ConfiguracionPreparacion } from "../../src/lib/preparacion";

const receta: ConfiguracionPreparacion = { recetaId: "receta-a", version: "v1", racionesBase: 4, pasoIds: ["secar", "cocer", "servir"] };

test("la preparación parte de las raciones originales y IDs estables", () => {
  assert.deepEqual(preparacionInicial(receta), { raciones: 4, pasoId: "secar", iniciada: false, terminada: false });
});

test("escala limitada sin perder el paso actual", () => {
  let estado = reducirPreparacion(preparacionInicial(receta), { tipo: "mover", cambio: 1 }, receta);
  estado = reducirPreparacion(estado, { tipo: "raciones", cambio: 200 }, receta);
  assert.equal(estado.raciones, 12);
  assert.equal(estado.pasoId, "cocer");
  assert.equal(reducirPreparacion(estado, { tipo: "raciones", cambio: -200 }, receta).raciones, 1);
});

test("una receta grande conserva sus raciones originales como límite superior", () => {
  const grande = { ...receta, racionesBase: 20 };
  const inicial = preparacionInicial(grande);
  assert.equal(reducirPreparacion(inicial, { tipo: "raciones", cambio: 1 }, grande).raciones, 20);
  assert.equal(reducirPreparacion(inicial, { tipo: "raciones", cambio: -1 }, grande).raciones, 19);
});

test("abrir y retomar no reinicia el paso ni las raciones", () => {
  let estado = reducirPreparacion(preparacionInicial(receta), { tipo: "raciones", cambio: 2 }, receta);
  estado = reducirPreparacion(estado, { tipo: "mover", cambio: 1 }, receta);
  const retomado = reducirPreparacion(estado, { tipo: "iniciar" }, receta);
  assert.equal(retomado.pasoId, "cocer");
  assert.equal(retomado.raciones, 6);
  assert.equal(retomado.iniciada, true);
});

test("ajustar raciones ya permite retomar", () => {
  const inicial = preparacionInicial(receta);
  assert.equal(reducirPreparacion(inicial, { tipo: "raciones", cambio: 1 }, receta).iniciada, true);
});

test("navegación acotada y finalización explícita", () => {
  let estado = reducirPreparacion(preparacionInicial(receta), { tipo: "mover", cambio: -20 }, receta);
  assert.equal(estado.pasoId, "secar");
  estado = reducirPreparacion(estado, { tipo: "mover", cambio: 20 }, receta);
  assert.equal(estado.pasoId, "servir");
  assert.equal(estado.terminada, false);
  estado = reducirPreparacion(estado, { tipo: "terminar" }, receta);
  assert.equal(estado.terminada, true);
  assert.equal(reducirPreparacion(estado, { tipo: "mover", cambio: -1 }, receta).terminada, false);
});

test("reiniciar vuelve al primer paso sin perder las raciones elegidas", () => {
  let estado = reducirPreparacion(preparacionInicial(receta), { tipo: "raciones", cambio: 2 }, receta);
  estado = reducirPreparacion(estado, { tipo: "mover", cambio: 2 }, receta);
  estado = reducirPreparacion(estado, { tipo: "reiniciar" }, receta);
  assert.equal(estado.pasoId, "secar");
  assert.equal(estado.iniciada, false);
  assert.equal(estado.raciones, 6);
});

test("recetas y ediciones usan claves de progreso distintas", () => {
  assert.notEqual(clavePreparacion(receta), clavePreparacion({ ...receta, recetaId: "receta-b" }));
  assert.notEqual(clavePreparacion(receta), clavePreparacion({ ...receta, version: "v2" }));
});

test("borrador sin pasos no crea un progreso inválido", () => {
  const vacia = { ...receta, pasoIds: [] };
  const inicial = preparacionInicial(vacia);
  assert.equal(inicial.pasoId, null);
  assert.deepEqual(reducirPreparacion(inicial, { tipo: "mover", cambio: 1 }, vacia), inicial);
  assert.deepEqual(reducirPreparacion(inicial, { tipo: "terminar" }, vacia), inicial);
});
