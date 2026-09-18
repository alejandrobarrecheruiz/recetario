/**
 * Volcado manual de la base a disco.
 *
 *   npm run backup
 *
 * Se ejecuta a mano justo despues de publicar cada receta, para que el ritmo de
 * los backups vaya sincronizado con el del blog (una receta a la semana).
 *
 * Vuelca TODAS las colecciones de la base (recipes, images y las de Better
 * Auth: sin `user` no se pueden restaurar los autores ni los accesos) en EJSON
 * canonico, que conserva ObjectId y fechas tal cual para poder restaurar sin
 * adivinar tipos. La carpeta lleva la base y la fecha en el nombre, para no
 * confundir un volcado de dev con uno de prod al restaurar; `resumen.json` deja
 * constancia de que habia dentro.
 *
 * No borra volcados antiguos: esto solo escribe.
 *
 * Este script es de SOLO LECTURA, asi que se le permite apuntar a produccion,
 * pero hay que pedirlo a mano con --permitir-prod. Cualquier script que
 * ESCRIBA (seed, migraciones) no debe correr nunca contra recetas_prod.
 */
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { BSON, type Document } from "mongodb";
import { createHash } from "node:crypto";
import { urlFirmadaDeImagen } from "../src/lib/imagekit";
import { esBaseDeProduccion, obtenerCliente, obtenerDb } from "../src/lib/mongo";

async function principal() {
  const base = process.env.MONGODB_DB;

  if (esBaseDeProduccion() && !process.argv.includes("--permitir-prod")) {
    console.error(
      `Este script apunta a "${base}". Para volcar produccion, vuelve a ` +
        "lanzarlo con --permitir-prod.",
    );
    process.exit(1);
  }

  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10);
  const hora = ahora.toISOString().slice(11, 23).replace(/[:.]/g, "");
  const carpeta = join(process.cwd(), "backups", `${base}-${fecha}-${hora}`);

  if (existsSync(carpeta)) {
    // Dos volcados en el mismo minuto: mejor negarse que pisar el anterior.
    console.error(`Ya existe ${carpeta}. Espera un minuto y repite.`);
    process.exit(1);
  }
  mkdirSync(carpeta, { recursive: true, mode: 0o700 });

  console.log(`Volcando la base "${base}" en ${carpeta}...`);

  const db = await obtenerDb();
  const colecciones = (await db.listCollections().toArray())
    .map((coleccion) => coleccion.name)
    .filter((nombre) => !nombre.startsWith("system."))
    .sort();

  const resumen: Record<string, number> = {};
  const indices: Record<string, unknown> = {};
  let originales: Document[] = [];
  for (const nombre of colecciones) {
    const documentos = await db.collection(nombre).find({}).toArray();
    if (nombre === "images") originales = documentos;
    // EJSON canonico: ObjectId y Date viajan con su tipo, no como strings sueltos.
    writeFileSync(
      join(carpeta, `${nombre}.json`),
      BSON.EJSON.stringify(documentos, undefined, 2, { relaxed: false }),
      { mode: 0o600 },
    );
    indices[nombre] = await db.collection(nombre).listIndexes().toArray();
    resumen[nombre] = documentos.length;
    console.log(`  - ${nombre}: ${documentos.length} documentos`);
  }

  writeFileSync(join(carpeta, "indices.json"), BSON.EJSON.stringify(indices, undefined, 2, { relaxed: false }), { mode: 0o600 });
  const carpetaFotos = join(carpeta, "fotografias");
  mkdirSync(carpetaFotos, { mode: 0o700 });
  const fotografias = [];
  for (const imagen of originales) {
    const respuesta = await fetch(urlFirmadaDeImagen(imagen.path), { signal: AbortSignal.timeout(30000), redirect: "error" });
    if (!respuesta.ok) throw new Error(`No se pudo copiar la fotografía ${imagen._id}. El backup queda incompleto.`);
    const bytes = Buffer.from(await respuesta.arrayBuffer());
    const fichero = `${imagen._id}.original`;
    writeFileSync(join(carpetaFotos, fichero), bytes, { mode: 0o600 });
    fotografias.push({ imagenId: imagen._id.toString(), fileId: imagen.fileId, path: imagen.path,
      fichero, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
  }
  writeFileSync(join(carpeta, "fotografias.json"), JSON.stringify(fotografias, null, 2), { mode: 0o600 });

  writeFileSync(
    join(carpeta, "resumen.json"),
    JSON.stringify({ version: 2, completo: true, base, fecha: ahora.toISOString(), colecciones: resumen, fotografias: fotografias.length }, null, 2),
    { mode: 0o600 },
  );

  console.log("Listo. Los volcados no se suben al repositorio (.gitignore).");
  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error instanceof Error ? error.message : "No se pudo completar el backup.");
  process.exit(1);
});
