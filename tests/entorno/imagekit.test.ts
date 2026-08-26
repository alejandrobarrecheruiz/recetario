/**
 * Comprueba que las credenciales de ImageKit valen contra la API real y que la
 * firma de subida se puede emitir con ellas.
 *
 *   npm run test:entorno
 *
 * Solo lee: lista un fichero. No sube ni borra nada.
 *
 * OJO CON EL PAQUETE QUE SE IMPORTA AQUI. La firma se calcula con
 * `@imagekit/nodejs` (cliente de servidor) y no con `getUploadAuthParams` de
 * `@imagekit/next/server`, que es lo que usa /api/imagenes/firma. Motivo:
 * `@imagekit/next` declara su subpath ./server con las claves "main" y "module"
 * dentro del campo "exports", y esas no son condiciones que Node entienda, asi
 * que desde Node plano (estas pruebas y cualquier script de scripts/) el import
 * revienta con ERR_PACKAGE_PATH_NOT_EXPORTED. Dentro de Next lo resuelve el
 * empaquetador. Las dos rutas calculan el mismo HMAC-SHA1, asi que esta prueba
 * cubre lo que importa: que las claves sirven para firmar.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import ImageKit from "@imagekit/nodejs";

function clientePrivado() {
  return new ImageKit({ privateKey: process.env.IMAGEKIT_PRIVATE_KEY as string });
}

describe("credenciales de ImageKit", () => {
  test("la clave privada es valida contra la API", async () => {
    try {
      const respuesta = await clientePrivado().assets.list({ limit: 1 });
      assert.ok(Array.isArray(respuesta), "la API no devolvio un listado");
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : String(error);
      if (/401|403|unauthor|forbidden|authentication/i.test(mensaje)) {
        throw new Error(
          "ImageKit rechaza IMAGEKIT_PRIVATE_KEY. Copiala de nuevo desde " +
            `Developer Options > API Keys.\n\nOriginal: ${mensaje}`,
        );
      }
      throw error;
    }
  });

  test("el endpoint de entrega responde y es de esta cuenta", async () => {
    const endpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT as string;
    const respuesta = await fetch(endpoint, { method: "HEAD" });

    // Pedir la raiz del endpoint sin fichero devuelve 400/404: basta con que
    // conteste y no sea un 401, que significaria endpoint de otra cuenta.
    assert.notEqual(
      respuesta.status,
      401,
      `El endpoint ${endpoint} devuelve 401: no corresponde a esta cuenta.`,
    );
    assert.ok(respuesta.status < 500, `El endpoint devolvio ${respuesta.status}`);
  });
});

describe("firma de subida (la que emite /api/imagenes/firma)", () => {
  test("se puede emitir con la clave privada del entorno", () => {
    const { token, expire, signature } = clientePrivado().helper.getAuthenticationParameters();

    assert.ok(token.length > 0, "la firma vino sin token");
    assert.match(signature, /^[0-9a-f]{40}$/, "la firma no es un HMAC-SHA1 hexadecimal");
    assert.ok(expire > Math.floor(Date.now() / 1000), "la firma nace caducada");
  });

  test("cada firma es de un solo uso: dos llamadas dan tokens distintos", () => {
    const cliente = clientePrivado();
    assert.notEqual(
      cliente.helper.getAuthenticationParameters().token,
      cliente.helper.getAuthenticationParameters().token,
    );
  });

  test("firmar sin clave privada falla, no devuelve una firma vacia", () => {
    // Si /api/imagenes/firma se despliega sin IMAGEKIT_PRIVATE_KEY, tiene que
    // romper de forma ruidosa y no emitir firmas invalidas en silencio.
    assert.throws(() => new ImageKit({ privateKey: "" }).helper.getAuthenticationParameters());
  });
});

describe("paquetes de ImageKit instalados", () => {
  test("@imagekit/next trae el subpath ./server que usa la app", () => {
    // Desde Node plano no se puede ni importar el subpath ni pedir el
    // package.json del paquete: su campo "exports" no expone ninguno de los dos
    // (ver la cabecera del fichero). Asi que se lee del disco. Que Next lo
    // resuelva de verdad lo confirma `npm run build`.
    const raiz = join(process.cwd(), "node_modules", "@imagekit", "next");
    assert.ok(existsSync(raiz), "@imagekit/next no esta instalado: npm install");

    const paquete = JSON.parse(readFileSync(join(raiz, "package.json"), "utf8"));
    const servidor = paquete.exports?.["./server"];
    assert.ok(servidor, "@imagekit/next ya no declara el subpath ./server");

    for (const destino of [servidor.main, servidor.module].filter(Boolean)) {
      assert.ok(
        existsSync(join(raiz, destino)),
        `@imagekit/next declara ${destino} en ./server pero el fichero no existe`,
      );
    }
  });
});
