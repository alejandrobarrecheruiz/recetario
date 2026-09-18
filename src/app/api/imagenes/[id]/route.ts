import { ObjectId } from "mongodb";
import { comprobarOrigen } from "@/lib/origen";
import { conVisibilidad } from "@/lib/visibilidad";
import { obtenerColecciones } from "@/lib/mongo";
import { borrarDeImageKit, urlFirmadaDeImagen } from "@/lib/imagekit";
import { anchoImagen } from "@/lib/entrega-imagenes";
import { docAImagen } from "@/lib/imagenes";
import { rolActual } from "@/lib/sesion";
import { idSchema } from "@/models/receta";
import { imagenSchema } from "@/models/imagen";

type Contexto = { params: Promise<{ id: string }> };

const cabecerasPrivadas = {
  "Cache-Control": "private, no-store, max-age=0",
  "Vary": "Cookie",
  "X-Content-Type-Options": "nosniff",
};

export async function PATCH(peticion: Request, contexto: Contexto) {
  const origenInvalido = comprobarOrigen(peticion);
  if (origenInvalido) return origenInvalido;
  if (await rolActual() !== "admin") return Response.json({ error: "Solo el admin edita imágenes." }, { status: 403 });
  const { id } = await contexto.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "No existe esa imagen." }, { status: 404 });
  const datos = imagenSchema.pick({ alt: true }).strict().safeParse(await peticion.json().catch(() => null));
  if (!datos.success) return Response.json({ error: "La descripción admite hasta 1000 caracteres." }, { status: 400 });
  const { imagenes } = await obtenerColecciones();
  const resultado = await imagenes.updateOne({ _id: new ObjectId(id) }, { $set: { alt: datos.data.alt.trim() } });
  if (!resultado.matchedCount) return Response.json({ error: "No existe esa imagen." }, { status: 404 });
  return Response.json({ alt: datos.data.alt.trim() });
}

/** Autoriza cada descarga, incluidos thumbnails, originales de ficha y pasos. */
export async function GET(peticion: Request, contexto: Contexto) {
  const noExiste = () => new Response(null, { status: 404, headers: cabecerasPrivadas });
  const { id } = await contexto.params;
  if (!idSchema.safeParse(id).success) return noExiste();
  const ancho = anchoImagen(new URL(peticion.url).searchParams.get("ancho"));
  if (ancho === null) return new Response(null, { status: 400, headers: cabecerasPrivadas });
  try {
    const rol = await rolActual();
    const { recetas, imagenes } = await obtenerColecciones();
    const imagenId = new ObjectId(id);
    if (rol !== "admin") {
      const visible = await recetas.findOne(conVisibilidad(rol, {
        $or: [{ portadaId: imagenId }, { "pasos.imagenId": imagenId }],
      }), { projection: { _id: 1 } });
      if (!visible) return noExiste();
    }
    const imagen = await imagenes.findOne({ _id: imagenId });
    if (!imagen) return noExiste();
    const respuesta = await fetch(urlFirmadaDeImagen(imagen.path, ancho), {
      cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15_000),
    });
    if (respuesta.status === 404) return noExiste();
    const tipo = respuesta.headers.get("content-type")?.split(";")[0];
    if (!respuesta.ok || !tipo || !["image/webp", "image/jpeg", "image/png", "image/avif", "image/gif"].includes(tipo)) {
      await respuesta.body?.cancel();
      return new Response(null, { status: 502, headers: cabecerasPrivadas });
    }
    return new Response(respuesta.body, { headers: { ...cabecerasPrivadas, "Content-Type": tipo } });
  } catch {
    return new Response(null, { status: 503, headers: cabecerasPrivadas });
  }
}

/**
 * Borra fichero y metadatos únicamente si ninguna receta lo referencia.
 * El editor guarda primero la sustitución y después solicita esta limpieza.
 *
 * El orden importa: primero ImageKit y solo despues Mongo. Si el borrado
 * remoto falla, el documento se queda con su `fileId`, que es justo lo que
 * permite reintentarlo; al reves, el fichero quedaria huerfano alli para
 * siempre y sin forma de localizarlo.
 */
export async function DELETE(_peticion: Request, contexto: Contexto) {
  const origenInvalido = comprobarOrigen(_peticion);
  if (origenInvalido) return origenInvalido;
  if ((await rolActual()) !== "admin") {
    return Response.json({ error: "Solo el admin borra imagenes." }, { status: 403 });
  }

  const { id } = await contexto.params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) {
    return Response.json({ error: "Identificador no valido." }, { status: 404 });
  }

  const { recetas, imagenes } = await obtenerColecciones();
  const doc = await imagenes.findOne({ _id: new ObjectId(idValido.data) });
  if (!doc) {
    return Response.json({ error: "No existe esa imagen." }, { status: 404 });
  }

  const referencia = await recetas.findOne(conVisibilidad("admin", {
    $or: [{ portadaId: doc._id }, { "pasos.imagenId": doc._id }],
  }), { projection: { _id: 1 } });
  if (referencia) {
    return Response.json({ error: "Esta foto sigue en una receta. Guarda primero el cambio de foto." }, { status: 409 });
  }

  try {
    await borrarDeImageKit(doc.fileId);
  } catch {
    return Response.json(
      { error: "ImageKit no respondio al borrar. Vuelve a intentarlo." },
      { status: 502 },
    );
  }

  await imagenes.deleteOne({ _id: doc._id });

  return Response.json(docAImagen(doc));
}
