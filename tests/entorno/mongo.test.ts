/**
 * Conexion real contra el cluster de Atlas. Es la comprobacion que dice si
 * MONGODB_URI sirve de verdad: credenciales validas, IP autorizada en Atlas y
 * permisos de escritura sobre la base.
 *
 *   npm run test:entorno
 *
 * Escribe en la base, asi que se niega a correr si MONGODB_DB apunta a
 * produccion. Todo lo que inserta lo borra despues.
 */
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import {
  BASE_PRODUCCION,
  COLECCIONES,
  crearIndices,
  esBaseDeProduccion,
  obtenerCliente,
  obtenerDb,
} from "@/lib/mongo";

/** Marca los documentos de prueba para poder limpiarlos aunque falle algo. */
const MARCA = "comprobacion-entorno";

/** Traduce los fallos tipicos de Atlas a lo que hay que hacer para arreglarlos. */
function diagnosticar(error: unknown): never {
  const mensaje = error instanceof Error ? error.message : String(error);

  if (/ServerSelection|ETIMEDOUT|ENOTFOUND|queryTxt|whitelist|IP/i.test(mensaje)) {
    throw new Error(
      "No se llega al cluster. Lo mas probable es que tu IP no este autorizada: " +
        "Atlas > Network Access > Add IP Address > Add Current IP Address. " +
        `Tambien revisa el nombre del cluster en MONGODB_URI.\n\nOriginal: ${mensaje}`,
    );
  }
  if (/Authentication failed|bad auth|SCRAM/i.test(mensaje)) {
    throw new Error(
      "Credenciales rechazadas. Revisa usuario y contrasena en MONGODB_URI " +
        "(Atlas > Database Access). Si la contrasena lleva @ : / ? # tiene que ir " +
        `codificada con encodeURIComponent.\n\nOriginal: ${mensaje}`,
    );
  }
  if (/not authorized|Unauthorized/i.test(mensaje)) {
    throw new Error(
      `El usuario de Atlas no tiene permisos sobre "${process.env.MONGODB_DB}". ` +
        "Dale readWrite sobre esa base en Atlas > Database Access.\n\n" +
        `Original: ${mensaje}`,
    );
  }
  throw error;
}

// El cliente se cachea en globalThis y lo comparten los dos describe de este
// fichero, asi que se cierra una sola vez, al final de todo. Si lo cerrara cada
// describe, el segundo se encontraria el cliente ya cerrado.
after(async () => {
  const cliente = await obtenerCliente().catch(() => null);
  await cliente?.close();
});

describe("conexion con MongoDB", () => {
  before(() => {
    // Este fichero escribe. Puerta antes de tocar nada.
    assert.equal(
      esBaseDeProduccion(),
      false,
      `MONGODB_DB apunta a ${BASE_PRODUCCION}. Estas pruebas escriben: no se ejecutan contra produccion.`,
    );
  });

  test("el cluster responde al ping", async () => {
    try {
      const db = await obtenerDb();
      const respuesta = await db.command({ ping: 1 });
      assert.equal(respuesta.ok, 1);
    } catch (error) {
      diagnosticar(error);
    }
  });

  test("se conecta a la base que dice MONGODB_DB", async () => {
    const db = await obtenerDb();
    assert.equal(db.databaseName, process.env.MONGODB_DB);
  });

  test("el cliente se cachea: dos llamadas, una sola conexion", async () => {
    // Si esto falla, cada invocacion en Vercel abriria una conexion nueva y el
    // cluster gratuito (M0, 500 conexiones) se agota en cuanto haya trafico.
    const [uno, dos] = await Promise.all([obtenerCliente(), obtenerCliente()]);
    assert.equal(uno, dos, "obtenerCliente() devuelve clientes distintos: la cache no funciona");
  });

  test("el usuario de Atlas puede escribir, leer y borrar", async () => {
    const db = await obtenerDb();
    const coleccion = db.collection("_comprobacion");

    try {
      const { insertedId } = await coleccion.insertOne({ marca: MARCA, cuando: new Date() });
      const leido = await coleccion.findOne({ _id: insertedId });
      assert.equal(leido?.marca, MARCA, "se escribio pero no se pudo leer de vuelta");

      const { deletedCount } = await coleccion.deleteOne({ _id: insertedId });
      assert.equal(deletedCount, 1);
    } catch (error) {
      diagnosticar(error);
    } finally {
      // Se tira la coleccion entera, no solo los documentos: la comprobacion no
      // debe dejar rastro en la base de desarrollo.
      await coleccion.drop().catch(() => {});
    }
  });
});

describe("indices", () => {
  test("crearIndices() deja los tres indices y es idempotente", async () => {
    assert.equal(esBaseDeProduccion(), false);

    const primera = await crearIndices();
    const segunda = await crearIndices();
    assert.deepEqual(primera, segunda, "crearIndices() no es idempotente");

    const db = await obtenerDb();
    const enRecetas = (await db.collection(COLECCIONES.recetas).listIndexes().toArray()).map(
      (indice) => indice.name,
    );
    const enImagenes = (await db.collection(COLECCIONES.imagenes).listIndexes().toArray()).map(
      (indice) => indice.name,
    );

    assert.ok(enRecetas.includes("slug_unico"), `faltan indices en recipes: ${enRecetas.join(", ")}`);
    assert.ok(
      enRecetas.includes("estado_visibilidad_publicadaEn"),
      "falta el indice que cubre la consulta de portada (visibilidad + fecha)",
    );
    assert.ok(enImagenes.includes("recetaId"), `faltan indices en images: ${enImagenes.join(", ")}`);
  });

  test("el indice de slug rechaza duplicados de verdad", async () => {
    assert.equal(esBaseDeProduccion(), false);
    await crearIndices();

    const db = await obtenerDb();
    const recetas = db.collection(COLECCIONES.recetas);
    const slug = `${MARCA}-slug-unico`;

    try {
      await recetas.insertOne({ slug, marca: MARCA });

      await assert.rejects(
        () => recetas.insertOne({ slug, marca: MARCA }),
        /duplicate key/i,
        "se pudo insertar dos veces el mismo slug: el indice unico no esta activo",
      );
    } finally {
      await recetas.deleteMany({ marca: MARCA }).catch(() => {});
    }
  });
});
