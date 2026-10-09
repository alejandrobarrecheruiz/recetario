/** Inventario de solo lectura: MongoDB + la carpeta del entorno en ImageKit. */
import { obtenerCliente, obtenerColecciones } from "../src/lib/mongo";
import { conVisibilidad } from "../src/lib/visibilidad";
import { listarArchivosDeImageKit } from "../src/lib/imagekit";
import { comprobarIntegridadImagenes, entornoIntegridadImagenes } from "../src/lib/integridad-imagenes";

async function principal() {
  const argumentos = process.argv.slice(2);
  if (argumentos.some(argumento => !["--permitir-prod", "--json"].includes(argumento))) {
    throw new Error("Opciones admitidas: --permitir-prod y --json.");
  }
  const entorno = entornoIntegridadImagenes(process.env.MONGODB_DB, process.env.IMAGEKIT_FOLDER, argumentos.includes("--permitir-prod"));
  const cliente = await obtenerCliente();
  try {
    const { recetas, imagenes } = await obtenerColecciones();
    const [docsRecetas, docsImagenes, archivos] = await Promise.all([
      recetas.find(conVisibilidad("admin"), { projection: { portadaId: 1, "pasos.id": 1, "pasos.imagenId": 1 } }).sort({ _id: 1 }).toArray(),
      imagenes.find({}, { projection: { proveedor: 1, fileId: 1, path: 1, recetaId: 1 } }).sort({ _id: 1 }).toArray(),
      listarArchivosDeImageKit(entorno.carpeta),
    ]);
    const incidencias = comprobarIntegridadImagenes(
      docsRecetas.map(receta => ({ _id: receta._id.toHexString(), portadaId: receta.portadaId?.toHexString() ?? null,
        pasos: receta.pasos.map(paso => ({ id: paso.id, imagenId: paso.imagenId?.toHexString() ?? null })) })),
      docsImagenes.map(imagen => ({ _id: imagen._id.toHexString(), proveedor: imagen.proveedor, fileId: imagen.fileId,
        path: imagen.path, recetaId: imagen.recetaId?.toHexString() ?? null })),
      archivos,
      entorno.carpeta,
    );
    const informe = { completo: true, ...entorno, comprobadoEn: new Date().toISOString(),
      totales: { recetas: docsRecetas.length, imagenes: docsImagenes.length, archivos: archivos.length }, incidencias };
    if (argumentos.includes("--json")) {
      console.log(JSON.stringify(informe, null, 2));
    } else {
      console.log(`Integridad de imágenes: ${entorno.base} / ${entorno.carpeta}`);
      console.log(`${informe.totales.recetas} recetas, ${informe.totales.imagenes} imágenes, ${informe.totales.archivos} archivos.`);
      const titulos: Record<keyof typeof incidencias, string> = {
        duplicados: "Archivos registrados varias veces",
        referenciasRotas: "Referencias a imágenes inexistentes",
        imagenesSinReferencias: "Imágenes sin referencias (candidatas a revisión, no a borrado automático)",
        archivosSinMetadatos: "Archivos de ImageKit sin metadatos",
        imagenesSinArchivo: "Metadatos cuyo archivo no aparece en ImageKit",
        rutasInconsistentes: "Rutas distintas del proveedor o fuera de la carpeta",
      };
      for (const tipo of Object.keys(incidencias) as (keyof typeof incidencias)[]) {
        console.log(`\n${titulos[tipo]}: ${incidencias[tipo].length}`);
        for (const incidencia of incidencias[tipo]) console.log(`  ${JSON.stringify(incidencia)}`);
      }
      console.log("\nComprobación completada. No se ha modificado ni eliminado ningún dato.");
    }
    process.exitCode = Object.values(incidencias).some(lista => lista.length > 0) ? 1 : 0;
  } finally {
    await cliente.close();
  }
}

principal().catch(error => {
  console.error("Comprobación incompleta. No interpretar la ausencia de informe como ausencia de incidencias.");
  console.error(error instanceof Error ? error.message : "Revisa la configuración y el acceso a MongoDB e ImageKit.");
  process.exitCode = 2;
});
