// TODO(fase 8): detalle de una receta.
//
// Busca por `slug` aplicando `conVisibilidad(rol, { slug })`. Si la consulta no
// devuelve nada -> notFound(). Una receta que el visitante no puede ver debe
// comportarse como inexistente, no como "prohibida".
//
// TODO(fase 9): JSON-LD de schema.org/Recipe y metadatos de SEO desde `seo`.

export default async function PaginaReceta({
  params,
}: PageProps<"/recetas/[slug]">) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Receta: {slug}</h1>
      <p className="text-sm opacity-70">
        Andamiaje. El detalle de la receta llega en la fase 8.
      </p>
    </main>
  );
}
