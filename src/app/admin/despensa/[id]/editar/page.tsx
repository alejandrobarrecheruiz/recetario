import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidadAlimentos, docAAlimento } from "@/lib/alimentos";
import { imagenParaCliente } from "@/lib/imagenes";
import { rolActual } from "@/lib/sesion";
import { idSchema } from "@/models/receta";
import { EditorAlimento } from "@/components/editor-alimento";

export default async function EditarAlimento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success || await rolActual() !== "admin") notFound();
  const { alimentos, imagenes } = await obtenerColecciones();
  const doc = await alimentos.findOne(conVisibilidadAlimentos("admin", { _id: new ObjectId(id) }));
  if (!doc) notFound();
  const foto = doc.fotoId ? await imagenes.findOne({ _id: doc.fotoId }) : null;
  return <EditorAlimento alimento={docAAlimento(doc)} imagen={foto ? imagenParaCliente(foto) : undefined} />;
}
