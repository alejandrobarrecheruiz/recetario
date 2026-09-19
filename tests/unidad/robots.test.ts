import { test } from "node:test";
import assert from "node:assert/strict";
import robots from "../../src/app/robots";

test("robots permite fotos públicas sin abrir el resto de la API y cierra Preview", () => {
  const entornoAnterior = process.env.VERCEL_ENV;
  try {
    process.env.VERCEL_ENV = "production";
    const reglas = robots().rules;
    assert.ok(Array.isArray(reglas));
    assert.deepEqual(reglas[0].allow, ["/", "/api/imagenes/"]);
    assert.ok(reglas[0].disallow?.includes("/api/"));
    assert.ok(reglas[0].disallow?.includes("/api/imagenes/firma"));

    process.env.VERCEL_ENV = "preview";
    assert.deepEqual(robots(), { rules: { userAgent: "*", disallow: "/" } });
  } finally {
    if (entornoAnterior === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = entornoAnterior;
  }
});
