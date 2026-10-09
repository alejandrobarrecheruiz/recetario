import type { Imagen } from "@/models/imagen";
import type { Paso } from "@/models/receta";
import type { ArchivoInventariado } from "@/lib/inventario-imagekit";

type RecetaInventariada = {
  _id: string;
  portadaId: string | null;
  pasos: Pick<Paso, "id" | "imagenId">[];
};
type ImagenInventariada = Pick<Imagen, "_id" | "proveedor" | "fileId" | "path" | "recetaId" | "alimentoId">;
type AlimentoInventariado = { _id: string; fotoId: string | null };

/** No comparar por accidente una base con la carpeta de otro entorno. */
export function entornoIntegridadImagenes(base?: string, carpeta?: string, permitirProduccion = false) {
  if (base !== "recetas_dev" && base !== "recetas_prod") {
    throw new Error("La comprobación requiere MONGODB_DB=recetas_dev o recetas_prod.");
  }
  if (base === "recetas_prod" && !permitirProduccion) {
    throw new Error("Para leer producción hace falta --permitir-prod explícito.");
  }
  const normalizada = carpeta?.replace(/^\/+|\/+$/g, "");
  if (normalizada !== (base === "recetas_dev" ? "dev" : "prod")) {
    throw new Error("MONGODB_DB e IMAGEKIT_FOLDER deben corresponder al mismo entorno (recetas_dev/dev o recetas_prod/prod).");
  }
  return { base, carpeta: normalizada };
}

/**
 * Cruza identificadores, no títulos ni URLs. Las recetas incluyen borradores
 * y restringidas: una imagen usada por cualquiera de ellas no está huérfana.
 * Los archivos deben ser el inventario COMPLETO de la carpeta y subcarpetas.
 */
export function comprobarIntegridadImagenes(
  recetas: RecetaInventariada[],
  imagenes: ImagenInventariada[],
  archivos: ArchivoInventariado[],
  carpeta: string,
  alimentos: AlimentoInventariado[] = [],
) {
  const porId = new Map(imagenes.map(imagen => [imagen._id, imagen]));
  const porArchivo = new Map<string, ImagenInventariada[]>();
  const archivosPorId = new Map(archivos.map(archivo => [archivo.fileId, archivo]));
  const usadas = new Set<string>();
  const referenciasRotas: { recetaId?: string; alimentoId?: string; imagenId: string; ubicacion: string }[] = [];

  for (const receta of recetas) {
    const referencias = [
      { imagenId: receta.portadaId, ubicacion: "portada" },
      ...receta.pasos.map(paso => ({ imagenId: paso.imagenId, ubicacion: `paso:${paso.id}` })),
    ];
    for (const { imagenId, ubicacion } of referencias) {
      if (imagenId === null) continue;
      usadas.add(imagenId);
      if (!porId.has(imagenId)) referenciasRotas.push({ recetaId: receta._id, imagenId, ubicacion });
    }
  }

  for (const alimento of alimentos) {
    if (!alimento.fotoId) continue;
    usadas.add(alimento.fotoId);
    if (!porId.has(alimento.fotoId)) referenciasRotas.push({ alimentoId: alimento._id, imagenId: alimento.fotoId, ubicacion: "foto" });
  }

  const imagenesSinReferencias: { imagenId: string; fileId: string; recetaId: string | null; alimentoId: string | null }[] = [];
  const imagenesSinArchivo: { imagenId: string; fileId: string }[] = [];
  const rutasInconsistentes: { imagenId: string; fileId: string; path: string; pathProveedor: string | null }[] = [];
  for (const imagen of imagenes) {
    const clave = JSON.stringify([imagen.proveedor, imagen.fileId]);
    const grupo = porArchivo.get(clave) ?? [];
    grupo.push(imagen);
    porArchivo.set(clave, grupo);
    if (!usadas.has(imagen._id)) {
      imagenesSinReferencias.push({ imagenId: imagen._id, fileId: imagen.fileId, recetaId: imagen.recetaId, alimentoId: imagen.alimentoId ?? null });
    }
    const archivo = archivosPorId.get(imagen.fileId);
    const dentroDeCarpeta = imagen.path.startsWith(`/${carpeta}/`);
    if (!dentroDeCarpeta || (archivo && archivo.path !== imagen.path)) {
      rutasInconsistentes.push({ imagenId: imagen._id, fileId: imagen.fileId, path: imagen.path, pathProveedor: archivo?.path ?? null });
    }
    // Fuera de la carpeta comprobada no sabemos si existe: no afirmar su ausencia.
    if (dentroDeCarpeta && !archivo) imagenesSinArchivo.push({ imagenId: imagen._id, fileId: imagen.fileId });
  }

  return {
    duplicados: [...porArchivo.values()].filter(grupo => grupo.length > 1).map(grupo => ({
      proveedor: grupo[0].proveedor, fileId: grupo[0].fileId, imagenIds: grupo.map(imagen => imagen._id),
    })),
    referenciasRotas,
    imagenesSinReferencias,
    archivosSinMetadatos: archivos.filter(archivo => !porArchivo.has(JSON.stringify(["imagekit", archivo.fileId]))),
    imagenesSinArchivo,
    rutasInconsistentes,
  };
}
