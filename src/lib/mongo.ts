import { MongoClient, type Collection, type Db } from "mongodb";
import type { RecetaDoc } from "@/models/receta";
import type { ImagenDoc } from "@/models/imagen";

/**
 * Cliente de MongoDB cacheado en una variable global.
 *
 * POR QUE LA GLOBAL: en Vercel cada invocacion en caliente reutiliza el mismo
 * proceso de Node, pero el modulo se puede reevaluar. Si el cliente se crea en
 * el ambito del modulo sin cachear, cada invocacion abre una conexion nueva y el
 * cluster gratuito de Atlas (M0, 500 conexiones) se agota en cuanto hay algo de
 * trafico o un par de despliegues seguidos. Guardarlo en `globalThis` hace que
 * sobreviva entre invocaciones y que el pool se reutilice. Es el fallo clasico
 * de Mongo + serverless.
 *
 * Se cachea la PROMESA, no el cliente ya conectado: si llegan dos peticiones a
 * la vez antes de que termine el primer `connect()`, ambas esperan la misma
 * promesa en lugar de abrir dos conexiones.
 *
 * Este modulo es solo de servidor. No importarlo desde componentes de cliente.
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

/**
 * Crea los indices. Es idempotente: `createIndex` no hace nada si el indice ya
 * existe con la misma definicion, asi que se puede llamar tantas veces como
 * haga falta. Se ejecuta con `npm run indices`.
 */
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
