import { MongoServerError, ObjectId } from "mongodb";
import { comprobarOrigen } from "@/lib/origen";
import { rolActual } from "@/lib/sesion";
import { obtenerColecciones } from "@/lib/mongo";
import { alimentoADoc, conVisibilidadAlimentos, docAAlimento } from "@/lib/alimentos";
import { limpiarImagenesAsociadas } from "@/lib/usos-imagenes";
import { alimentoEntradaSchema, alimentoSchema, claveDeAlimento, revisarCompras } from "@/models/alimento";
import { idSchema } from "@/models/receta";

type Contexto = { params: Promise<{ id: string }> };
const noExiste = () => Response.json({ error: "No existe ese alimento." }, { status: 404, headers: { "Cache-Control": "private, no-store" } });

export async function GET(_peticion: Request, contexto: Contexto) {
  const { id } = await contexto.params;
  if (!idSchema.safeParse(id).success) return noExiste();
  const { alimentos } = await obtenerColecciones();
  const alimento = await alimentos.findOne(conVisibilidadAlimentos(await rolActual(), { _id: new ObjectId(id) }));
  if (!alimento) return noExiste();
  return Response.json(docAAlimento(alimento), { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

export async function PUT(peticion: Request, contexto: Contexto) {
  const origenInvalido = comprobarOrigen(peticion);
  if (origenInvalido) return origenInvalido;
  if (await rolActual() !== "admin") return Response.json({ error: "Solo el admin edita la despensa." }, { status: 403 });
  const { id } = await contexto.params;
  if (!idSchema.safeParse(id).success) return noExiste();
  const entrada = alimentoEntradaSchema.safeParse(await peticion.json().catch(() => null));
  if (!entrada.success) return Response.json({ error: entrada.error.issues[0].message }, { status: 400 });
  const { alimentos, imagenes } = await obtenerColecciones();
  const existente = await alimentos.findOne(conVisibilidadAlimentos("admin", { _id: new ObjectId(id) }));
  if (!existente) return noExiste();
  if (peticion.headers.get("if-match") !== existente.actualizadaEn.toISOString()) {
    return Response.json({ error: "El alimento ha cambiado en otra pestaña. Tus cambios siguen aquí; descarga una copia antes de recargar." }, { status: 412 });
  }
  if (entrada.data.fotoId && !await imagenes.findOne({ _id: new ObjectId(entrada.data.fotoId) })) {
    return Response.json({ error: "La foto ya no existe. Revisa la imagen antes de guardar." }, { status: 400 });
  }
  const ahora = new Date(Math.max(Date.now(), existente.actualizadaEn.getTime() + 1));
  const alimento = alimentoSchema.parse({ ...entrada.data, _id: id, autorId: existente.autorId.toHexString(),
    claveNombre: claveDeAlimento(entrada.data.nombre), actualizadaEn: ahora,
    publicadaEn: existente.publicadaEn ?? (entrada.data.estado === "publicado" ? ahora : null),
    compras: revisarCompras(entrada.data.compras, existente.compras, ahora) });
  try {
    const resultado = await alimentos.replaceOne(conVisibilidadAlimentos("admin", { _id: existente._id, actualizadaEn: existente.actualizadaEn }), alimentoADoc(alimento));
    if (!resultado.matchedCount) return Response.json({ error: "El alimento acaba de cambiar. Descarga una copia antes de recargar." }, { status: 412 });
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return Response.json({ error: "Ya hay un alimento con ese nombre." }, { status: 409 });
    throw error;
  }
  // Limpiar solo la foto sustituida: otras subidas pueden estar pendientes en otra pestaña.
  const limpieza = existente.fotoId && existente.fotoId.toHexString() !== alimento.fotoId
    ? await limpiarImagenesAsociadas({ _id: existente.fotoId })
    : { imagenesBorradas: 0, imagenesConFallo: 0 };
  return Response.json({ alimento, ...limpieza });
}

export async function DELETE(peticion: Request, contexto: Contexto) {
  const origenInvalido = comprobarOrigen(peticion);
  if (origenInvalido) return origenInvalido;
  if (await rolActual() !== "admin") return Response.json({ error: "Solo el admin elimina alimentos." }, { status: 403 });
  const { id } = await contexto.params;
  if (!idSchema.safeParse(id).success) return noExiste();
  const { alimentos } = await obtenerColecciones();
  const existente = await alimentos.findOne(conVisibilidadAlimentos("admin", { _id: new ObjectId(id) }));
  if (!existente) return noExiste();
  if (peticion.headers.get("if-match") !== existente.actualizadaEn.toISOString()) return Response.json({ error: "El alimento ha cambiado. Recarga antes de eliminarlo." }, { status: 412 });
  const resultado = await alimentos.deleteOne(conVisibilidadAlimentos("admin", { _id: existente._id, actualizadaEn: existente.actualizadaEn }));
  if (!resultado.deletedCount) return Response.json({ error: "El alimento acaba de cambiar. Recarga antes de eliminarlo." }, { status: 412 });
  return Response.json(await limpiarImagenesAsociadas({ alimentoId: existente._id }));
}
