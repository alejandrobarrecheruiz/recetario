import { MongoServerError, ObjectId } from "mongodb";
import { comprobarOrigen } from "@/lib/origen";
import { sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";
import { obtenerColecciones } from "@/lib/mongo";
import { alimentoADoc } from "@/lib/alimentos";
import { alimentoEntradaSchema, alimentoSchema, claveDeAlimento, revisarCompras } from "@/models/alimento";

export async function POST(peticion: Request) {
  const origenInvalido = comprobarOrigen(peticion);
  if (origenInvalido) return origenInvalido;
  const sesion = await sesionActual();
  if (!sesion || rolDeSesion(sesion.user.role) !== "admin") return Response.json({ error: "Solo el admin edita la despensa." }, { status: 403 });
  const entrada = alimentoEntradaSchema.safeParse(await peticion.json().catch(() => null));
  if (!entrada.success) return Response.json({ error: entrada.error.issues[0].message }, { status: 400 });
  const { alimentos, imagenes } = await obtenerColecciones();
  if (entrada.data.fotoId && !await imagenes.findOne({ _id: new ObjectId(entrada.data.fotoId) })) {
    return Response.json({ error: "La foto ya no existe. Revisa la imagen antes de guardar." }, { status: 400 });
  }
  const ahora = new Date();
  const alimento = alimentoSchema.parse({ ...entrada.data, _id: new ObjectId().toHexString(),
    claveNombre: claveDeAlimento(entrada.data.nombre), autorId: sesion.user.id, actualizadaEn: ahora,
    publicadaEn: entrada.data.estado === "publicado" ? ahora : null, compras: revisarCompras(entrada.data.compras, [], ahora) });
  try { await alimentos.insertOne(alimentoADoc(alimento)); }
  catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) return Response.json({ error: "Ya hay un alimento con ese nombre. Puedes editarlo desde Despensa." }, { status: 409 });
    throw error;
  }
  return Response.json({ alimento, imagenesConFallo: 0 }, { status: 201 });
}
