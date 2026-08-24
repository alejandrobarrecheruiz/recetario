import { ObjectId } from "mongodb";
import { obtenerImagenes } from "@/lib/mongo";
import { imagenADoc } from "@/lib/imagenes";
import { sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";
import { imagenEntradaSchema, imagenSchema } from "@/models/imagen";

// Alta de los METADATOS de una imagen que el navegador ya subio a ImageKit con
// la firma de /api/imagenes/firma. Los bytes nunca pasan por aqui.
export async function POST(peticion: Request) {
  const sesion = await sesionActual();
  if (!sesion || rolDeSesion(sesion.user.role) !== "admin") {
    return Response.json({ error: "Solo el admin registra imagenes." }, { status: 403 });
  }

  const cuerpo = imagenEntradaSchema.safeParse(await peticion.json().catch(() => null));
  if (!cuerpo.success) {
    return Response.json(
      { error: "Imagen no valida.", detalles: cuerpo.error.issues },
      { status: 400 },
    );
  }

  const imagen = imagenSchema.parse({
    ...cuerpo.data,
    _id: new ObjectId().toHexString(),
    subidaEn: new Date(),
    subidaPor: sesion.user.id,
  });

  const coleccion = await obtenerImagenes();
  await coleccion.insertOne(imagenADoc(imagen));

  return Response.json(imagen, { status: 201 });
}
