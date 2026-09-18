import { test } from "node:test";
import assert from "node:assert/strict";
import { destinoInterno } from "../../src/lib/navegacion";
import { comprobarOrigen } from "../../src/lib/origen";

test("el retorno del login rechaza orígenes ajenos, controles y barras invertidas", () => {
  for (const valor of [null, "https://otro.test", "//otro.test", "/\\otro.test", "/\n/otro.test", "javascript:alert(1)", "/login"]) {
    assert.equal(destinoInterno(valor, "https://recetario.test"), "/");
  }
  assert.equal(destinoInterno("/recetas/pan?q=sal#pasos", "https://recetario.test"), "/recetas/pan?q=sal#pasos");
});

test("las mutaciones requieren Origin propio incluso desde subdominios", () => {
  const anterior = process.env.BETTER_AUTH_URL;
  process.env.BETTER_AUTH_URL = "https://recetario.test";
  try {
    for (const origen of ["https://otro.test", "https://sub.recetario.test", "null", ""]) {
      assert.equal(comprobarOrigen(new Request("https://recetario.test/api/recetas", { headers: { origin: origen } }))?.status, 403);
    }
    assert.equal(comprobarOrigen(new Request("https://recetario.test/api/recetas", { headers: { origin: "https://recetario.test", "sec-fetch-site": "same-origin" } })), null);
  } finally {
    if (anterior === undefined) delete process.env.BETTER_AUTH_URL;
    else process.env.BETTER_AUTH_URL = anterior;
  }
});
