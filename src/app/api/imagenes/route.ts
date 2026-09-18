import { ObjectId } from "mongodb";
import { comprobarOrigen } from "@/lib/origen";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { detallesDeImageKit } from "@/lib/imagekit";
import { imagenADoc } from "@/lib/imagenes";
import { sesionActual } from "@/lib/sesion";
import { rolDeSesion } from "@/models/usuario";
import { imagenEntradaSchema, imagenSchema } from "@/models/imagen";
import { rutaImagen } from "@/lib/entrega-imagenes";

// Alta de los METADATOS de una imagen que el navegador ya subio a ImageKit con
// la firma de /api/imagenes/firma. Los bytes nunca pasan por aqui.
export async function POST(peticion: Request) {
  const origenInvalido = comprobarOrigen(peticion);
  if (origenInvalido) return origenInvalido;
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

  const { recetas, imagenes: coleccion } = await obtenerColecciones();
  if (cuerpo.data.recetaId && !await recetas.findOne(conVisibilidad("admin", { _id: new ObjectId(cuerpo.data.recetaId) }), { projection: { _id: 1 } })) {
    return Response.json({ error: "No existe esa receta." }, { status: 404 });
  }
  let archivo;
  try { archivo = await detallesDeImageKit(cuerpo.data.fileId); }
  catch { return Response.json({ error: "No se pudo verificar la foto. Vuelve a intentarlo." }, { status: 502 }); }
  if (!archivo.isPrivateFile) {
    return Response.json({ error: "La foto debe subirse como privada. Vuelve a subirla." }, { status: 400 });
  }
  const carpeta = `/${process.env.IMAGEKIT_FOLDER?.replace(/^\/+|\/+$/g, "") ?? ""}/`;
  const origen = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
  if (archivo.mime === "image/svg+xml" || archivo.filePath?.toLowerCase().endsWith(".svg")) {
    return Response.json({ error: "Usa una fotografía JPG, PNG, WebP o AVIF, no SVG." }, { status: 400 });
  }
  if (!origen || carpeta === "//" || archivo.fileType !== "image" || !archivo.url || new URL(archivo.url).origin !== new URL(origen).origin || !archivo.filePath?.startsWith(carpeta) || !archivo.width || !archivo.height || !archivo.size || archivo.size > 20 * 1024 * 1024) {
    return Response.json({ error: "La foto no pertenece a este espacio o supera los 20 MB." }, { status: 400 });
  }
  const imagen = imagenSchema.parse({
    ...cuerpo.data,
    url: archivo.url,
    path: archivo.filePath,
    ancho: archivo.width,
    alto: archivo.height,
    bytes: archivo.size,
    _id: new ObjectId().toHexString(),
    subidaEn: new Date(),
    subidaPor: sesion.user.id,
  });

  await coleccion.insertOne(imagenADoc(imagen));

  return Response.json({ ...imagen, url: rutaImagen(imagen._id) }, { status: 201 });
}
