import { ObjectId } from "mongodb";
import { MongoServerError } from "mongodb";
import { obtenerRecetas } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { docAReceta, recetaADoc, resolverPublicadaEn } from "@/lib/recetas";
import { rolActual, sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";
import { recetaEntradaSchema, recetaSchema } from "@/models/receta";

// API de recetas. El guard de /admin/layout.tsx NO cubre esta ruta: cada
// handler resuelve la sesion y comprueba el rol por su cuenta. El rol nunca
// llega por query string ni por cabecera del cliente.

/** Listado. Lo que devuelve depende del rol, via filtro de consulta. */
export async function GET() {
  const rol = await rolActual();
  const coleccion = await obtenerRecetas();

  const docs = await coleccion
    .find(conVisibilidad(rol))
    .sort({ publicadaEn: -1 })
    .toArray();

  return Response.json(docs.map(docAReceta));
}

/** Alta. Solo admin. */
export async function POST(peticion: Request) {
  const sesion = await sesionActual();
  if (!sesion || rolDeSesion(sesion.user.role) !== "admin") {
    // 403 uniforme, antes de mirar nada: no revela si algo existe o no.
    return Response.json({ error: "Solo el admin crea recetas." }, { status: 403 });
  }

  const cuerpo = recetaEntradaSchema.safeParse(await peticion.json().catch(() => null));
  if (!cuerpo.success) {
    return Response.json(
      { error: "Receta no valida.", detalles: cuerpo.error.issues },
      { status: 400 },
    );
  }

  // Los campos que decide el servidor se completan aqui; el parse final con
  // recetaSchema garantiza que el documento entero es valido, venga de donde venga.
  const receta = recetaSchema.parse({
    ...cuerpo.data,
    _id: new ObjectId().toHexString(),
    autorId: sesion.user.id,
    actualizadaEn: new Date(),
    publicadaEn: resolverPublicadaEn(cuerpo.data),
  });

  const coleccion = await obtenerRecetas();
  try {
    await coleccion.insertOne(recetaADoc(receta));
  } catch (error) {
    // Indice unico de slug: es la URL y no puede repetirse.
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json(
        { error: `Ya hay una receta con el slug "${receta.slug}".` },
        { status: 409 },
      );
    }
    throw error;
  }

  return Response.json(receta, { status: 201 });
}
