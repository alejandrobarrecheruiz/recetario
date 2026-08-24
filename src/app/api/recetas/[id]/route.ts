import { ObjectId } from "mongodb";
import { MongoServerError } from "mongodb";
import { obtenerColecciones, obtenerRecetas } from "@/lib/mongo";
import { borrarDeImageKit } from "@/lib/imagekit";
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

  const { recetas, imagenes } = await obtenerColecciones();
  const resultado = await recetas.findOneAndDelete({ _id: new ObjectId(idValido.data) });
  if (!resultado) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }

  // Limpieza de sus imagenes: primero el fichero en ImageKit y solo despues los
  // metadatos. Si ImageKit falla, el documento conserva su fileId y se puede
  // reintentar; el fallo se cuenta en la respuesta, no se esconde.
  const deLaReceta = await imagenes.find({ recetaId: resultado._id }).toArray();
  let imagenesBorradas = 0;
  let imagenesConFallo = 0;
  for (const imagen of deLaReceta) {
    try {
      await borrarDeImageKit(imagen.fileId);
      await imagenes.deleteOne({ _id: imagen._id });
      imagenesBorradas += 1;
    } catch {
      imagenesConFallo += 1;
    }
  }

  return Response.json({
    receta: docAReceta(resultado),
    imagenesBorradas,
    imagenesConFallo,
  });
}
