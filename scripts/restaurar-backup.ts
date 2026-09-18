/** Ensayo seguro: restaura únicamente en una base nueva recetas_restauracion_*. */
import { readFileSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { BSON, type IndexDescription } from "mongodb";
import { obtenerCliente } from "../src/lib/mongo";

function argumento(nombre: string) {
  const posicion = process.argv.indexOf(nombre);
  if (posicion < 0 || !process.argv[posicion + 1]) throw new Error(`Falta ${nombre}.`);
  return process.argv[posicion + 1];
}
async function principal() {
  const destino = argumento("--base");
  if (!/^recetas_restauracion_[a-z0-9_]+$/.test(destino)) throw new Error("Solo se admite una base aislada recetas_restauracion_*. Nunca dev ni producción.");
  const carpeta = realpathSync(resolve(argumento("--carpeta")));
  const resumen = JSON.parse(readFileSync(join(carpeta, "resumen.json"), "utf8"));
  if (resumen.version !== 2 || resumen.completo !== true) throw new Error("Hace falta un backup completo de versión 2, con índices y fotografías.");
  const fotos = JSON.parse(readFileSync(join(carpeta, "fotografias.json"), "utf8"));
  for (const foto of fotos) {
    if (!/^[a-f\d]{24}\.original$/.test(foto.fichero)) throw new Error("Nombre de fotografía no válido.");
    const bytes = readFileSync(join(carpeta, "fotografias", foto.fichero));
    if (bytes.length !== foto.bytes || createHash("sha256").update(bytes).digest("hex") !== foto.sha256) throw new Error(`Copia dañada: ${foto.fichero}`);
  }
  const indices = BSON.EJSON.parse(readFileSync(join(carpeta, "indices.json"), "utf8"));
  const cliente = await obtenerCliente();
  try {
    const db = cliente.db(destino);
    if ((await db.listCollections().toArray()).length) throw new Error("La base destino ya contiene colecciones. El ensayo no sobrescribe datos.");
    for (const [nombre, cantidad] of Object.entries(resumen.colecciones)) {
      if (!/^[a-zA-Z0-9_-]+$/.test(nombre)) throw new Error("Nombre de colección no válido.");
      const documentos = BSON.EJSON.parse(readFileSync(join(carpeta, `${nombre}.json`), "utf8"));
      if (!Array.isArray(documentos) || documentos.length !== cantidad) throw new Error(`Backup inconsistente: ${nombre}`);
      const coleccion = await db.createCollection(nombre);
      if (documentos.length) await coleccion.insertMany(documentos);
      const especificaciones: IndexDescription[] = (indices[nombre] ?? []).filter((indice: IndexDescription) => indice.name !== "_id_").map((indice: IndexDescription & { v?: number; ns?: string }) => {
        const copia = { ...indice }; delete copia.v; delete copia.ns; return copia;
      });
      if (especificaciones.length) await coleccion.createIndexes(especificaciones);
      if (await coleccion.countDocuments() !== cantidad) throw new Error(`Recuento incorrecto: ${nombre}`);
      // Comparar el EJSON completo, además de los recuentos, sin mostrar datos personales.
      const originales = documentos.map(d => BSON.EJSON.stringify(d, { relaxed: false })).sort();
      const restaurados = (await coleccion.find({}).toArray()).map(d => BSON.EJSON.stringify(d, { relaxed: false })).sort();
      if (JSON.stringify(originales) !== JSON.stringify(restaurados)) throw new Error(`Documentos diferentes: ${nombre}`);
    }
    console.log(`Restauración verificada en ${destino}: documentos, índices y ${fotos.length} originales comprobados. No se han subido fotos ni modificado sus referencias en ImageKit.`);
  } finally { await cliente.close(); }
}
principal().catch(error => { console.error(error instanceof Error ? error.message : "Falló la restauración."); process.exit(1); });
