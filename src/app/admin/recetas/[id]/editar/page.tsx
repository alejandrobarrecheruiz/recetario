import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { docAReceta } from "@/lib/recetas";
import { docAImagen } from "@/lib/imagenes";
import { rolActual } from "@/lib/sesion";
import { idSchema } from "@/models/receta";
import { EditorReceta } from "@/components/editor-receta";

// El editor de una receta: se escribe sobre la receta tal como se va
// a ver. La consulta pasa por `conVisibilidad` con el rol de la sesion, como
// todas: para cualquiera que no sea admin, un borrador es inexistente
// (notFound), no prohibido. Guardar y borrar van contra /api/recetas/[id], que
// comprueba el rol por su cuenta.
export default async function PaginaEditarReceta({
  params,
}: PageProps<"/admin/recetas/[id]/editar">) {
  const { id } = await params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) notFound();

  const rol = await rolActual();
  const { recetas, imagenes } = await obtenerColecciones();
  const doc = await recetas.findOne(
    conVisibilidad(rol, { _id: new ObjectId(idValido.data) }),
  );
  if (!doc) notFound();

  // Las imagenes de la receta, para que el editor pinte las miniaturas.
  const docsImagenes = await imagenes.find({ recetaId: doc._id }).toArray();

  return (
    <EditorReceta receta={docAReceta(doc)} imagenes={docsImagenes.map(docAImagen)} />
  );
}
