import { ObjectId } from "mongodb";
import { comprobarOrigen } from "@/lib/origen";
import { conVisibilidad } from "@/lib/visibilidad";
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
  const origenInvalido = comprobarOrigen(peticion);
  if (origenInvalido) return origenInvalido;
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
  const existente = await coleccion.findOne(conVisibilidad("admin", { _id: new ObjectId(idValido.data) }));
  if (!existente) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }

  if (peticion.headers.get("if-match") !== existente.actualizadaEn.toISOString()) {
    return Response.json({ error: "La receta ha cambiado en otra pestaña. Recarga para ver la última versión antes de editar." }, { status: 412 });
  }
  if (existente.publicadaEn && cuerpo.data.slug !== existente.slug) {
    return Response.json({ error: "La dirección de una receta publicada se conserva para que sus enlaces sigan funcionando." }, { status: 400 });
  }

  const idsImagenes = [...new Set([cuerpo.data.portadaId, ...cuerpo.data.pasos.map((paso) => paso.imagenId)].filter((id): id is string => id !== null))];
  if (idsImagenes.length) {
    const { imagenes } = await obtenerColecciones();
    const disponibles = await imagenes.countDocuments({ _id: { $in: idsImagenes.map((id) => new ObjectId(id)) } });
    if (disponibles !== idsImagenes.length) {
      return Response.json({ error: "Alguna foto ya no existe. Revisa las imágenes antes de guardar." }, { status: 400 });
    }
  }

  // `autorId` se conserva: quien la escribio no cambia por editarla.
  const receta = recetaSchema.parse({
    ...cuerpo.data,
    _id: idValido.data,
    autorId: existente.autorId.toHexString(),
    actualizadaEn: new Date(Math.max(Date.now(), existente.actualizadaEn.getTime() + 1)),
    publicadaEn: resolverPublicadaEn({ ...cuerpo.data, publicadaEn: existente.publicadaEn }),
  });

  try {
    const resultado = await coleccion.replaceOne(
      conVisibilidad("admin", { _id: existente._id, actualizadaEn: existente.actualizadaEn }), recetaADoc(receta),
    );
    if (resultado.matchedCount === 0) {
      return Response.json({ error: "La receta acaba de cambiar. Recarga antes de volver a guardarla." }, { status: 412 });
    }
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
  const origenInvalido = comprobarOrigen(_peticion);
  if (origenInvalido) return origenInvalido;
  if ((await rolActual()) !== "admin") {
    return Response.json({ error: "Solo el admin borra recetas." }, { status: 403 });
  }

  const { id } = await contexto.params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) {
    return Response.json({ error: "Identificador no valido." }, { status: 404 });
  }

  const { recetas, imagenes, guardadas } = await obtenerColecciones();
  const resultado = await recetas.findOneAndDelete(conVisibilidad("admin", { _id: new ObjectId(idValido.data) }));
  if (!resultado) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }
  await guardadas.deleteMany({ recetaId: resultado._id });

  // Limpieza de sus imagenes: primero el fichero en ImageKit y solo despues los
  // metadatos. Si ImageKit falla, el documento conserva su fileId y se puede
  // reintentar; el fallo se cuenta en la respuesta, no se esconde.
  const deLaReceta = await imagenes.find({ recetaId: resultado._id }).toArray();
  let imagenesBorradas = 0;
  let imagenesConFallo = 0;
  for (const imagen of deLaReceta) {
    const referencia = await recetas.findOne(conVisibilidad("admin", {
      $or: [{ portadaId: imagen._id }, { "pasos.imagenId": imagen._id }],
    }), { projection: { _id: 1 } });
    if (referencia) {
      await imagenes.updateOne({ _id: imagen._id }, { $set: { recetaId: referencia._id } });
      continue;
    }
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
