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
import { ObjectId } from "mongodb";
import { registrarImagen } from "@/lib/imagenes";
import type { ImagenDoc } from "@/models/imagen";

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
  test("crearIndices() deja los índices de recetas e imágenes y es idempotente", async () => {
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
    const enAlimentos = await db.collection(COLECCIONES.alimentos).listIndexes().toArray();
    assert.ok(enAlimentos.some(indice => indice.name === "alimento_nombre_unico" && indice.unique));

    assert.ok(enRecetas.includes("slug_unico"), `faltan indices en recipes: ${enRecetas.join(", ")}`);
    assert.ok(
      enRecetas.includes("estado_visibilidad_publicadaEn"),
      "falta el indice que cubre la consulta de portada (visibilidad + fecha)",
    );
    assert.ok(enImagenes.includes("recetaId"), `faltan indices en images: ${enImagenes.join(", ")}`);
    assert.ok(enImagenes.includes("proveedor_fileId_unico"), "falta el índice único de archivos del proveedor");
    assert.ok(enImagenes.includes("alimentoId"), "falta el índice de limpieza de fotos de Despensa");
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

  test("el alta de imágenes es idempotente incluso en paralelo y conserva sus metadatos", async () => {
    assert.equal(process.env.MONGODB_DB, "recetas_dev");
    await crearIndices();
    const db = await obtenerDb();
    const imagenes = db.collection<ImagenDoc>(COLECCIONES.imagenes);
    const fileId = `${MARCA}-${new ObjectId()}`;
    const nueva = (): ImagenDoc => ({
      _id: new ObjectId(), recetaId: new ObjectId(), proveedor: "imagekit", fileId,
      url: "https://example.invalid/prueba.jpg", path: "/dev/prueba.jpg", alt: "Descripción original",
      ancho: 1, alto: 1, bytes: 1, tipo: "portada", orden: 0, subidaEn: new Date(), subidaPor: new ObjectId(),
    });
    try {
      const resultados = await Promise.all(Array.from({ length: 6 }, () => registrarImagen(imagenes, nueva())));
      const primera = resultados.find(resultado => resultado.creada)!;
      assert.ok(primera);
      assert.equal(resultados.filter(resultado => resultado.creada).length, 1);
      assert.ok(resultados.every(resultado => resultado.imagen._id.equals(primera.imagen._id)));
      const repetida = await registrarImagen(imagenes, { ...nueva(), alt: "No sustituir la descripción" });
      assert.equal(repetida.creada, false);
      assert.deepEqual(repetida.imagen, primera.imagen);
      assert.equal(await imagenes.countDocuments({ proveedor: "imagekit", fileId }), 1);
      await assert.rejects(imagenes.insertOne(nueva()), /duplicate key/i);
    } finally {
      await imagenes.deleteMany({ proveedor: "imagekit", fileId });
    }
  });
});
