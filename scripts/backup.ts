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
import { BSON } from "mongodb";
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
  const hora = ahora.toISOString().slice(11, 16).replace(":", "");
  const carpeta = join(process.cwd(), "backups", `${base}-${fecha}-${hora}`);

  if (existsSync(carpeta)) {
    // Dos volcados en el mismo minuto: mejor negarse que pisar el anterior.
    console.error(`Ya existe ${carpeta}. Espera un minuto y repite.`);
    process.exit(1);
  }
  mkdirSync(carpeta, { recursive: true });

  console.log(`Volcando la base "${base}" en ${carpeta}...`);

  const db = await obtenerDb();
  const colecciones = (await db.listCollections().toArray())
    .map((coleccion) => coleccion.name)
    .filter((nombre) => !nombre.startsWith("system."))
    .sort();

  const resumen: Record<string, number> = {};
  for (const nombre of colecciones) {
    const documentos = await db.collection(nombre).find({}).toArray();
    // EJSON canonico: ObjectId y Date viajan con su tipo, no como strings sueltos.
    writeFileSync(
      join(carpeta, `${nombre}.json`),
      BSON.EJSON.stringify(documentos, undefined, 2, { relaxed: false }),
    );
    resumen[nombre] = documentos.length;
    console.log(`  - ${nombre}: ${documentos.length} documentos`);
  }

  writeFileSync(
    join(carpeta, "resumen.json"),
    JSON.stringify({ base, fecha: ahora.toISOString(), colecciones: resumen }, null, 2),
  );

  console.log("Listo. Los volcados no se suben al repositorio (.gitignore).");
  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
