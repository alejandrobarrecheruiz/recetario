import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";
import { idSchema } from "@/models/receta";

// Guardar y quitar una receta. Sin sesion no hay guardadas (401 uniforme,
// antes de mirar nada); una receta que el rol no puede ver es inexistente
// (404), nunca prohibida.

type Contexto = { params: Promise<{ recetaId: string }> };

async function contextoDeSesion(contexto: Contexto) {
  const sesion = await sesionActual();
  if (!sesion) return { fallo: Response.json({ error: "Hace falta una cuenta." }, { status: 401 }) };

  const { recetaId } = await contexto.params;
  const idValido = idSchema.safeParse(recetaId);
  if (!idValido.success) {
    return { fallo: Response.json({ error: "No existe esa receta." }, { status: 404 }) };
  }

  return {
    usuarioId: new ObjectId(sesion.user.id),
    recetaId: new ObjectId(idValido.data),
    rol: rolDeSesion(sesion.user.role),
  };
}

/** Guarda. Idempotente: el upsert sobre el indice unico no duplica. */
export async function POST(_peticion: Request, contexto: Contexto) {
  const datos = await contextoDeSesion(contexto);
  if ("fallo" in datos) return datos.fallo;

  const { recetas, guardadas } = await obtenerColecciones();
  const receta = await recetas.findOne(conVisibilidad(datos.rol, { _id: datos.recetaId }), {
    projection: { _id: 1 },
  });
  if (!receta) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }

  await guardadas.updateOne(
    { usuarioId: datos.usuarioId, recetaId: datos.recetaId },
    { $setOnInsert: { _id: new ObjectId(), guardadaEn: new Date() } },
    { upsert: true },
  );
  return Response.json({ guardada: true });
}

/**
 * Quita. Sin comprobar visibilidad: quitar de tu lista algo que ya no puedes
 * ver tiene que funcionar igual.
 */
export async function DELETE(_peticion: Request, contexto: Contexto) {
  const datos = await contextoDeSesion(contexto);
  if ("fallo" in datos) return datos.fallo;

  const { guardadas } = await obtenerColecciones();
  await guardadas.deleteOne({ usuarioId: datos.usuarioId, recetaId: datos.recetaId });
  return Response.json({ guardada: false });
}
