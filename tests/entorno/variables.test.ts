/**
 * Comprueba que .env.local esta completo y bien formado ANTES de intentar
 * conectar con nada. Si algo falla aqui, los fallos de mongo.test.ts y
 * imagekit.test.ts serian ruido derivado.
 *
 * No toca la red. Se ejecuta con --env-file=.env.local.
 *
 *   npm run test:entorno
 *
 * Ningun valor secreto se imprime: los mensajes de error hablan de la variable,
 * nunca de su contenido.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { BASE_PRODUCCION, esBaseDeProduccion } from "@/lib/mongo";

const RAIZ = process.cwd();

/** Lee un fichero .env a pares clave/valor. Suficiente para lo que se comprueba. */
function leerEnv(ruta: string): Map<string, string> {
  const pares = new Map<string, string>();
  for (const linea of readFileSync(ruta, "utf8").split("\n")) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith("#")) continue;

    const igual = limpia.indexOf("=");
    if (igual === -1) continue;

    const clave = limpia.slice(0, igual).trim();
    let valor = limpia.slice(igual + 1).trim();

    // Quita comillas y, si el valor no iba entre comillas, el comentario final.
    const entrecomillado = /^"(.*)"/.exec(valor) ?? /^'(.*)'/.exec(valor);
    valor = entrecomillado ? entrecomillado[1] : valor.replace(/\s+#.*$/, "").trim();

    pares.set(clave, valor);
  }
  return pares;
}

function exigir(clave: string): string {
  const valor = process.env[clave];
  assert.ok(
    valor && valor.length > 0,
    `Falta ${clave} en .env.local. Copia .env.example y rellenala.`,
  );
  return valor;
}

describe("plantilla y fichero real", () => {
  test("todas las variables de .env.example estan rellenas en .env.local", () => {
    const plantilla = leerEnv(join(RAIZ, ".env.example"));
    assert.ok(plantilla.size > 0, ".env.example no tiene variables; algo raro pasa");

    const faltan = [...plantilla.keys()].filter((clave) => !process.env[clave]);
    assert.deepEqual(
      faltan,
      [],
      `Estas variables estan en .env.example pero vacias o ausentes en .env.local: ${faltan.join(", ")}`,
    );
  });

  test(".env.example sigue sin secretos: es el fichero que SI se sube", () => {
    const plantilla = leerEnv(join(RAIZ, ".env.example"));
    const secretas = [
      "MONGODB_URI",
      "BETTER_AUTH_SECRET",
      "IMAGEKIT_PRIVATE_KEY",
      "NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY",
      "NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT",
    ];
    for (const clave of secretas) {
      assert.equal(
        plantilla.get(clave),
        "",
        `${clave} tiene valor en .env.example. Ese fichero se sube al repositorio: vacialo.`,
      );
    }
  });

  test(".env.local no esta versionado en git", () => {
    let versionado = true;
    try {
      execFileSync("git", ["ls-files", "--error-unmatch", ".env.local"], {
        cwd: RAIZ,
        stdio: "ignore",
      });
    } catch {
      versionado = false;
    }
    assert.equal(versionado, false, ".env.local esta en git. Sacalo del indice YA.");
  });
});

describe("MongoDB", () => {
  test("MONGODB_URI es una cadena de conexion de Mongo", () => {
    const uri = exigir("MONGODB_URI");
    assert.match(
      uri,
      /^mongodb(\+srv)?:\/\//,
      "MONGODB_URI no empieza por mongodb:// ni mongodb+srv://",
    );
  });

  test("MONGODB_URI trae usuario y contrasena", () => {
    const uri = exigir("MONGODB_URI");
    const autoridad = uri.split("://")[1] ?? "";
    assert.ok(
      autoridad.includes("@") && autoridad.split("@")[0].includes(":"),
      "MONGODB_URI no lleva usuario:contrasena. Atlas los pide.",
    );
  });

  test("MONGODB_URI no fija base de datos: eso es cosa de MONGODB_DB", () => {
    // La cadena es identica en local y en Vercel. Lo unico que cambia entre dev
    // y prod es MONGODB_DB. Si la base va incrustada en la URI, esa separacion
    // deja de ser fiable en cuanto alguien use el cliente sin pasar por obtenerDb.
    const uri = exigir("MONGODB_URI");
    const trasAutoridad = uri.split("://")[1]?.split("@").pop() ?? "";
    const camino = trasAutoridad.split("?")[0].split("/")[1] ?? "";
    assert.equal(
      camino,
      "",
      `MONGODB_URI incluye la base "${camino}" en la ruta. Quitala: la base la decide MONGODB_DB.`,
    );
  });

  test("en local se apunta a recetas_dev, nunca a produccion", () => {
    const base = exigir("MONGODB_DB");
    assert.equal(
      esBaseDeProduccion(),
      false,
      `MONGODB_DB vale "${base}". ${BASE_PRODUCCION} va SOLO en el entorno Production de Vercel.`,
    );
    assert.equal(base, "recetas_dev", `MONGODB_DB deberia ser recetas_dev en local, no "${base}".`);
  });
});

describe("Better Auth", () => {
  test("BETTER_AUTH_SECRET tiene entropia suficiente", () => {
    const secreto = exigir("BETTER_AUTH_SECRET");
    assert.ok(
      secreto.length >= 32,
      `BETTER_AUTH_SECRET tiene ${secreto.length} caracteres. Generalo con: openssl rand -base64 32`,
    );
  });

  test("BETTER_AUTH_URL es una URL absoluta y apunta a localhost en local", () => {
    const url = new URL(exigir("BETTER_AUTH_URL"));
    assert.ok(["http:", "https:"].includes(url.protocol));
    assert.equal(
      url.hostname,
      "localhost",
      `BETTER_AUTH_URL apunta a ${url.hostname}. En local va a http://localhost:3000.`,
    );
  });
});

describe("ImageKit", () => {
  test("IMAGEKIT_PRIVATE_KEY es la privada, no una copia de la publica", () => {
    const privada = exigir("IMAGEKIT_PRIVATE_KEY");
    assert.match(
      privada,
      /^private_/,
      "IMAGEKIT_PRIVATE_KEY no empieza por private_. Es facil pegar la publica por error.",
    );
  });

  test("NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY es la publica", () => {
    assert.match(
      exigir("NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY"),
      /^public_/,
      "NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY no empieza por public_.",
    );
  });

  test("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT es el endpoint de entrega", () => {
    const url = new URL(exigir("NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT"));
    assert.equal(url.protocol, "https:");
    assert.match(url.hostname, /imagekit\.io$/);
    assert.ok(url.pathname.length > 1, "al endpoint le falta el identificador de cuenta");
  });

  test("IMAGEKIT_FOLDER separa dev de prod y en local es dev", () => {
    assert.equal(exigir("IMAGEKIT_FOLDER"), "dev");
  });
});

describe("secretos y el prefijo NEXT_PUBLIC_", () => {
  test("ningun secreto lleva el prefijo NEXT_PUBLIC_", () => {
    // Todo lo que lleva NEXT_PUBLIC_ acaba en el bundle del navegador y es
    // publico. Si alguna vez hace falta un secreto en el cliente, la respuesta
    // no es ponerle el prefijo: es mover la logica al servidor.
    const prohibidas = [
      "NEXT_PUBLIC_MONGODB_URI",
      "NEXT_PUBLIC_BETTER_AUTH_SECRET",
      "NEXT_PUBLIC_IMAGEKIT_PRIVATE_KEY",
    ];
    for (const clave of prohibidas) {
      assert.equal(
        process.env[clave],
        undefined,
        `${clave} existe. Ese valor acabaria publicado en el bundle del navegador.`,
      );
    }
  });

  test("ninguna variable NEXT_PUBLIC_ contiene algo que parezca un secreto", () => {
    const publicas = Object.entries(process.env).filter(([clave]) =>
      clave.startsWith("NEXT_PUBLIC_"),
    );
    for (const [clave, valor = ""] of publicas) {
      assert.ok(
        !valor.startsWith("private_"),
        `${clave} contiene una clave privada de ImageKit y es publica.`,
      );
      assert.ok(
        !/^mongodb(\+srv)?:\/\//.test(valor),
        `${clave} contiene una cadena de conexion de Mongo y es publica.`,
      );
    }
  });
});
