/**
 * TODO(fase 4): datos de ejemplo para desarrollo.
 *
 *   npm run seed:dev
 *
 * Lo que tiene que hacer cuando se implemente:
 *   - Insertar unas pocas recetas que cubran las tres combinaciones que importan
 *     para probar el filtro de visibilidad:
 *       borrador                       -> solo la ve el admin
 *       publicada + visibilidad publica    -> la ve todo el mundo
 *       publicada + visibilidad registrada -> la ven registrados y admin
 *   - Validar cada documento con `recetaSchema` ANTES de insertarlo. Si el seed
 *     mete basura que el esquema rechaza, el fallo aparece luego en la app y
 *     cuesta el doble encontrarlo.
 *   - Ser idempotente: `updateOne` con upsert por `slug`, no `insertMany` a
 *     ciegas, para poder relanzarlo sin duplicar.
 *
 * Este script ESCRIBE. No debe correr nunca contra recetas_prod.
 */
import { esBaseDeProduccion, obtenerCliente } from "../src/lib/mongo";

async function principal() {
  const base = process.env.MONGODB_DB;

  if (esBaseDeProduccion()) {
    console.error(
      `Este script escribe y esta apuntando a "${base}". Abortado. ` +
        "El seed solo se ejecuta contra recetas_dev.",
    );
    process.exit(1);
  }

  console.log(`TODO(fase 4): sembrar recetas de ejemplo en "${base}".`);

  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
