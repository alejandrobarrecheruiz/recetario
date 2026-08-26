import { MongoClient, type Collection, type Db } from "mongodb";
import type { RecetaDoc } from "@/models/receta";
import type { ImagenDoc } from "@/models/imagen";

/**
 * Cliente de MongoDB cacheado en `globalThis`: en serverless el modulo se puede
 * reevaluar y sin cache cada invocacion abriria una conexion nueva contra el
 * limite del cluster gratuito. Se cachea la PROMESA, no el cliente conectado,
 * para que dos peticiones simultaneas esperen el mismo `connect()`.
 *
 * Solo de servidor. No importarlo desde componentes de cliente.
 */

const COLECCIONES = {
  recetas: "recipes",
  imagenes: "images",
} as const;

const globalConCache = globalThis as typeof globalThis & {
  _promesaClienteMongo?: Promise<MongoClient>;
};

function conectar(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Falta MONGODB_URI. Copia .env.example a .env.local y rellenalo.",
    );
  }

  const cliente = new MongoClient(uri, {
    // Pool pequeno a proposito: muchas instancias serverless con pools grandes
    // agotan el limite de conexiones del cluster gratuito.
    maxPoolSize: 10,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    serverSelectionTimeoutMS: 10_000,
  });

  return cliente.connect();
}

/** Cliente conectado y compartido. Cachea la promesa en `globalThis`. */
export function obtenerCliente(): Promise<MongoClient> {
  globalConCache._promesaClienteMongo ??= conectar();
  return globalConCache._promesaClienteMongo;
}

/**
 * Base de datos del entorno actual. `MONGODB_DB` es lo UNICO que cambia entre
 * dev y prod: la cadena de conexion es la misma. Ver CLAUDE.md.
 */
export async function obtenerDb(): Promise<Db> {
  const nombre = process.env.MONGODB_DB;
  if (!nombre) {
    throw new Error(
      "Falta MONGODB_DB (recetas_dev en local y preview, recetas_prod solo en Production).",
    );
  }
  const cliente = await obtenerCliente();
  return cliente.db(nombre);
}

/** Colecciones tipadas. Es la forma recomendada de tocar la base. */
export async function obtenerColecciones(): Promise<{
  recetas: Collection<RecetaDoc>;
  imagenes: Collection<ImagenDoc>;
}> {
  const db = await obtenerDb();
  return {
    recetas: db.collection<RecetaDoc>(COLECCIONES.recetas),
    imagenes: db.collection<ImagenDoc>(COLECCIONES.imagenes),
  };
}

export async function obtenerRecetas(): Promise<Collection<RecetaDoc>> {
  return (await obtenerColecciones()).recetas;
}

export async function obtenerImagenes(): Promise<Collection<ImagenDoc>> {
  return (await obtenerColecciones()).imagenes;
}

/** Nombre de la base de produccion. Ver la regla dev/prod en CLAUDE.md. */
export const BASE_PRODUCCION = "recetas_prod";

/**
 * `true` si el entorno actual apunta a la base de produccion. Los scripts de
 * `scripts/` lo usan para negarse a correr contra prod salvo permiso explicito.
 */
export function esBaseDeProduccion(): boolean {
  return process.env.MONGODB_DB === BASE_PRODUCCION;
}

/** Crea los indices. Idempotente; se ejecuta con `npm run indices`. */
export async function crearIndices(): Promise<string[]> {
  const { recetas, imagenes } = await obtenerColecciones();

  const creados = await Promise.all([
    // El slug es la URL: tiene que ser unico.
    recetas.createIndex({ slug: 1 }, { unique: true, name: "slug_unico" }),
    // Cubre la consulta de portada: filtro de visibilidad + orden por fecha.
    recetas.createIndex(
      { estado: 1, visibilidad: 1, publicadaEn: -1 },
      { name: "estado_visibilidad_publicadaEn" },
    ),
    // Para resolver las imagenes de una receta de una sola pasada.
    imagenes.createIndex({ recetaId: 1 }, { name: "recetaId" }),
  ]);

  return creados;
}

export { COLECCIONES };
