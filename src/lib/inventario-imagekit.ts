import type { AssetListResponse } from "@imagekit/nodejs/resources/assets";

export type ArchivoInventariado = { fileId: string; path: string };
type ListarPagina = (parametros: {
  path: string; skip: number; limit: number; type: "all"; sort: "ASC_CREATED";
}) => Promise<AssetListResponse>;

/** Lista completa, incluidas subcarpetas. Un fallo invalida todo el inventario. */
export async function inventariarArchivosImageKit(carpeta: string, listar: ListarPagina): Promise<ArchivoInventariado[]> {
  const raiz = `/${carpeta.replace(/^\/+|\/+$/g, "")}`;
  if (raiz === "/" || /[?#\\]/.test(raiz) || raiz.split("/").some(parte => parte === "." || parte === "..")) {
    throw new Error("Carpeta de ImageKit no válida para el inventario.");
  }
  const pendientes = [raiz];
  const carpetas = new Set(pendientes);
  const archivos = new Map<string, ArchivoInventariado>();
  const limite = 1000;

  for (const ruta of pendientes) {
    for (let salto = 0; ; salto += limite) {
      const pagina = await listar({ path: `${ruta}/`, skip: salto, limit: limite, type: "all", sort: "ASC_CREATED" });
      for (const recurso of pagina) {
        if (recurso.type === "folder" && recurso.folderPath) {
          const subcarpeta = recurso.folderPath.replace(/\/+$/g, "");
          if (!subcarpeta.startsWith(`${ruta}/`) || carpetas.has(subcarpeta)) {
            throw new Error("El listado de carpetas es inconsistente. Repite el inventario sin subidas concurrentes.");
          }
          carpetas.add(subcarpeta);
          pendientes.push(subcarpeta);
        } else if (recurso.type === "file" && recurso.fileId && recurso.filePath) {
          if (!recurso.filePath.startsWith(`${ruta}/`) || archivos.has(recurso.fileId)) {
            throw new Error("El listado de archivos es inconsistente. Repite el inventario sin subidas concurrentes.");
          }
          archivos.set(recurso.fileId, { fileId: recurso.fileId, path: recurso.filePath });
        } else {
          throw new Error("ImageKit devolvió metadatos incompletos; no se puede certificar el inventario.");
        }
      }
      if (pagina.length < limite) break;
    }
  }
  return [...archivos.values()].sort((a, b) => a.fileId.localeCompare(b.fileId));
}
