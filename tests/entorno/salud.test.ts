/**
 * Prueba la ruta /api/salud llamando al handler de verdad, no una imitacion.
 * Un route handler de Next no es mas que una funcion que devuelve un Response,
 * asi que se puede invocar desde aqui.
 *
 *   npm run test:entorno
 *
 * Solo lee: hace un ping. No escribe nada.
 */
import { test, describe, after } from "node:test";
import assert from "node:assert/strict";

import { GET } from "@/app/api/salud/route";
import { obtenerCliente } from "@/lib/mongo";

after(async () => {
  const cliente = await obtenerCliente().catch(() => null);
  await cliente?.close();
});

describe("/api/salud", () => {
  test("con la base viva responde 200 y ok:true", async () => {
    const respuesta = await GET();
    assert.equal(respuesta.status, 200);
    assert.deepEqual(await respuesta.json(), { ok: true });
  });

  test("el cuerpo no filtra nada de la infraestructura", async () => {
    // La respuesta es publica. Ni cadena de conexion, ni usuario, ni el nombre
    // de la base, ni el mensaje del driver, que incluye el host del cluster.
    const cuerpo = await (await GET()).text();

    assert.deepEqual(Object.keys(JSON.parse(cuerpo)), ["ok"]);
    for (const filtracion of ["mongodb", "mongo.net", "recetas_", "@"]) {
      assert.equal(
        cuerpo.includes(filtracion),
        false,
        `el cuerpo contiene "${filtracion}"`,
      );
    }
  });

  test("sin configuracion devuelve 503, no un error sin controlar", async () => {
    const guardada = process.env.MONGODB_DB;
    delete process.env.MONGODB_DB;

    try {
      const respuesta = await GET();
      assert.equal(respuesta.status, 503);
      assert.deepEqual(await respuesta.json(), { ok: false });
    } finally {
      process.env.MONGODB_DB = guardada;
    }
  });
});
