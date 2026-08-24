import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { obtenerRecetas } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { docAReceta } from "@/lib/recetas";
import { rolActual } from "@/lib/sesion";
import { idSchema } from "@/models/receta";
import { FormularioReceta } from "@/components/formulario-receta";

// Edicion de una receta. La consulta pasa por `conVisibilidad` con el rol de
// la sesion, como todas: para cualquiera que no sea admin, un borrador es
// inexistente (notFound), no prohibido. Guardar y borrar van contra
// /api/recetas/[id], que comprueba el rol por su cuenta.
export default async function PaginaEditarReceta({
  params,
}: PageProps<"/admin/recetas/[id]/editar">) {
  const { id } = await params;
  const idValido = idSchema.safeParse(id);
  if (!idValido.success) notFound();

  const rol = await rolActual();
  const coleccion = await obtenerRecetas();
  const doc = await coleccion.findOne(
    conVisibilidad(rol, { _id: new ObjectId(idValido.data) }),
  );
  if (!doc) notFound();

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Editar receta</h2>
      <FormularioReceta receta={docAReceta(doc)} />
    </section>
  );
}
