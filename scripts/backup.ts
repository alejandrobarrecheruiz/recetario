/**
 * TODO(fase 8): volcado manual de la base a disco.
 *
 *   npm run backup
 *
 * Se ejecuta a mano justo despues de publicar cada receta, para que el ritmo de
 * los backups vaya sincronizado con el del blog (una receta a la semana).
 *
 * Lo que tiene que hacer cuando se implemente:
 *   - Exportar `recipes` e `images` a JSON en ./backups/AAAA-MM-DD/.
 *   - Exportar tambien las colecciones de Better Auth (`user`, `session`,
 *     `account`, `verification`): sin `user` no se pueden restaurar los autores
 *     ni los accesos.
 *   - Escribir un fichero con el nombre de la base y la fecha, para no confundir
 *     un volcado de dev con uno de prod al restaurar.
 *   - No borrar volcados antiguos: esto solo escribe.
 *
 * Este script es de SOLO LECTURA, asi que se le permite apuntar a produccion,
 * pero hay que pedirlo a mano con --permitir-prod. Cualquier script que
 * ESCRIBA (seed, migraciones) no debe correr nunca contra recetas_prod.
 */
import { esBaseDeProduccion, obtenerCliente } from "../src/lib/mongo";

async function principal() {
  const base = process.env.MONGODB_DB;

  if (esBaseDeProduccion() && !process.argv.includes("--permitir-prod")) {
    console.error(
      `Este script apunta a "${base}". Para volcar produccion, vuelve a ` +
        "lanzarlo con --permitir-prod.",
    );
    process.exit(1);
  }

  console.log(`TODO(fase 8): volcar la base "${base}" a ./backups/.`);

  await (await obtenerCliente()).close();
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
