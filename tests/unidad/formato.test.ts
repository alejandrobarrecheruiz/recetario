/**
 * El formato de cantidades: el redondeo al alza de `medida` (piezas al cuarto
 * y en fracciones, medidas al medio con un decimal como mucho) y el parseo de
 * lo que se teclea en el editor (`parsearCantidad`). Los redondeos con coma
 * flotante son terreno clásico de sorpresas: por eso están fijados aquí.
 *
 * Son puras: no tocan la red ni necesitan .env.local.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { medida, parsearCantidad } from "@/lib/formato";

describe("medida: piezas (sin unidad o «unidad»)", () => {
  test("las enteras se escriben sin decimales ni unidad", () => {
    assert.equal(medida(1, "unidad"), "1");
    assert.equal(medida(6, ""), "6");
  });

  test("las fracciones exactas salen como glifo", () => {
    assert.equal(medida(0.25, "unidad"), "¼");
    assert.equal(medida(0.5, ""), "½");
    assert.equal(medida(0.75, "unidad"), "¾");
    assert.equal(medida(1.5, "unidad"), "1½");
    assert.equal(medida(2.75, ""), "2¾");
  });

  test("lo que no cae en el cuarto se redondea al cuarto superior", () => {
    assert.equal(medida(0.1, "unidad"), "¼");
    assert.equal(medida(1 / 3, "unidad"), "½");
    assert.equal(medida(1.1, "unidad"), "1¼");
    assert.equal(medida(1.9, ""), "2");
  });

  test("escalar a la baja nunca hace desaparecer una pieza", () => {
    // Un cuarto de cebolla a la mitad de raciones sigue siendo un cuarto.
    assert.equal(medida(0.25 * 0.5, "unidad"), "¼");
  });

  test("los restos de coma flotante no suben un cuarto de más", () => {
    // 2.9999999999999996, el clásico producto de escalar.
    assert.equal(medida(0.6 * 5, "unidad"), "3");
    assert.equal(medida(1.0000000000000002, "unidad"), "1");
  });
});

describe("medida: unidades de medida", () => {
  test("escribe la cantidad con su unidad", () => {
    assert.equal(medida(150, "g"), "150 g");
    assert.equal(medida(25, "ml"), "25 ml");
  });

  test("redondea al medio superior: 0,4 → 0,5 y 3,6 → 4", () => {
    assert.equal(medida(0.4, "cucharadita"), "0,5 cucharadita");
    assert.equal(medida(3.6, "cdas"), "4 cdas");
  });

  test("un decimal como mucho, y solo puede ser ,5", () => {
    assert.equal(medida(1.6666666666, "dl"), "2 dl");
    assert.equal(medida(262.5, "g"), "262,5 g");
    assert.equal(medida(262.4999, "g"), "262,5 g");
  });

  test("los restos de coma flotante no suben medio de más", () => {
    assert.equal(medida(7.000000000000001, "g"), "7 g");
  });
});

describe("medida: al gusto", () => {
  test("cantidad 0 no es una medida", () => {
    assert.equal(medida(0, ""), null);
    assert.equal(medida(0, "g"), null);
  });
});

describe("parsearCantidad", () => {
  test("números con coma o punto", () => {
    assert.equal(parsearCantidad("2"), 2);
    assert.equal(parsearCantidad("0,25"), 0.25);
    assert.equal(parsearCantidad("0.25"), 0.25);
    assert.equal(parsearCantidad("1,5"), 1.5);
  });

  test("fracciones con barra, también mixtas", () => {
    assert.equal(parsearCantidad("1/4"), 0.25);
    assert.equal(parsearCantidad("3 / 4"), 0.75);
    assert.equal(parsearCantidad("1 1/2"), 1.5);
  });

  test("glifos de fracción, solos o tras un entero", () => {
    assert.equal(parsearCantidad("¼"), 0.25);
    assert.equal(parsearCantidad("1½"), 1.5);
    assert.equal(parsearCantidad("2 ¾"), 2.75);
    assert.equal(parsearCantidad("⅓"), 1 / 3);
  });

  test("lo que no es una cantidad devuelve null", () => {
    assert.equal(parsearCantidad(""), null);
    assert.equal(parsearCantidad("   "), null);
    assert.equal(parsearCantidad("1/"), null);
    assert.equal(parsearCantidad("1/0"), null);
    assert.equal(parsearCantidad("-1"), null);
    assert.equal(parsearCantidad("un cuarto"), null);
  });

  test("lo parseado vuelve a pintarse igual en la ficha", () => {
    assert.equal(medida(parsearCantidad("1/4")!, "unidad"), "¼");
    assert.equal(medida(parsearCantidad("1 1/2")!, ""), "1½");
  });
});
