/**
 * Crea los indices de MongoDB. Idempotente: se puede ejecutar las veces que haga
 * falta.
 *
 *   npm run indices
 *
 * La definicion vive en `crearIndices()` de src/lib/mongo.ts, para que la app y
 * este script no puedan divergir.
 */
import { crearIndices, esBaseDeProduccion, obtenerCliente } from "../src/lib/mongo";

async function principal() {
  const base = process.env.MONGODB_DB;

  // Los indices tambien hacen falta en prod, pero que ocurra por accidente no.
  if (esBaseDeProduccion() && !process.argv.includes("--permitir-prod")) {
    console.error(
      `Este script apunta a "${base}". Si de verdad quieres tocar produccion, ` +
        "vuelve a lanzarlo con --permitir-prod.",
    );
    process.exit(1);
  }

  console.log(`Creando indices en la base "${base}"...`);

  const nombres = await crearIndices();
  for (const nombre of nombres) console.log(`  - ${nombre}`);

  console.log("Listo.");
  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
