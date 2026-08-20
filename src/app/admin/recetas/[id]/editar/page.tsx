// TODO(fase 5): formulario de creacion y edicion de recetas.
//
// El formulario valida con `recetaEntradaSchema` de @/models/receta, el MISMO
// esquema que usa /api/recetas. Un solo Zod para los dos lados.
//
// Ingredientes y pasos se reordenan usando su campo `id` como key de React.
// Nunca el indice del array: al reordenar, las keys por indice hacen que React
// reutilice el nodo equivocado y el texto salta de fila.
//
// TODO(fase 6): subida de imagenes (portada y pasos). Hasta entonces el
// formulario funciona sin fotos, a proposito.

export default async function PaginaEditarReceta({
  params,
}: PageProps<"/admin/recetas/[id]/editar">) {
  const { id } = await params;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Editar receta</h2>
      <p className="text-sm opacity-70">
        Andamiaje para la receta <code>{id}</code>. El formulario llega en la
        fase 5.
      </p>
    </section>
  );
}
