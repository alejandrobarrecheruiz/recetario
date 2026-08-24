import { ObjectId } from "mongodb";
import { MongoServerError } from "mongodb";
import { obtenerRecetas } from "@/lib/mongo";
import { docAReceta, recetaADoc, resolverPublicadaEn } from "@/lib/recetas";
import { rolActual } from "@/lib/sesion";
import { idSchema, recetaEntradaSchema, recetaSchema } from "@/models/receta";

// Edicion y borrado de una receta. Solo admin, comprobado AQUI: el guard del
// layout de /admin no se ejecuta cuando alguien llama a la API a pelo.
//
// El 403 se devuelve uniforme y antes de tocar la base: asi no confirma si el
// identificador existe. Un 404 solo lo ve quien ya es admin.

type Contexto = { params: Promise<{ id: string }> };

export async function PUT(peticion: Request, contexto: Contexto) {
  if ((await rolActual()) !== "admin") {
    return Response.json({ error: "Solo el admin edita recetas." }, { status: 403 });
  }

  const { id } = await contexto.params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) {
    return Response.json({ error: "Identificador no valido." }, { status: 404 });
  }

  const cuerpo = recetaEntradaSchema.safeParse(await peticion.json().catch(() => null));
  if (!cuerpo.success) {
    return Response.json(
      { error: "Receta no valida.", detalles: cuerpo.error.issues },
      { status: 400 },
    );
  }

  const coleccion = await obtenerRecetas();
  const existente = await coleccion.findOne({ _id: new ObjectId(idValido.data) });
  if (!existente) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }

  // `autorId` se conserva: quien la escribio no cambia por editarla.
  const receta = recetaSchema.parse({
    ...cuerpo.data,
    _id: idValido.data,
    autorId: existente.autorId.toHexString(),
    actualizadaEn: new Date(),
    publicadaEn: resolverPublicadaEn(cuerpo.data),
  });

  try {
    await coleccion.replaceOne({ _id: existente._id }, recetaADoc(receta));
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return Response.json(
        { error: `Ya hay una receta con el slug "${receta.slug}".` },
        { status: 409 },
      );
    }
    throw error;
  }

  return Response.json(receta);
}

export async function DELETE(_peticion: Request, contexto: Contexto) {
  if ((await rolActual()) !== "admin") {
    return Response.json({ error: "Solo el admin borra recetas." }, { status: 403 });
  }

  const { id } = await contexto.params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) {
    return Response.json({ error: "Identificador no valido." }, { status: 404 });
  }

  // TODO(fase 6): al borrar una receta habra que borrar tambien sus imagenes
  // en ImageKit (via fileId) y en la coleccion `images`.
  const coleccion = await obtenerRecetas();
  const resultado = await coleccion.findOneAndDelete({ _id: new ObjectId(idValido.data) });
  if (!resultado) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }

  return Response.json(docAReceta(resultado));
}
