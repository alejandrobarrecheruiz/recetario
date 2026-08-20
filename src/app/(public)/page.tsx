// TODO(fase 7): portada con el listado de recetas.
//
// Debe resolver el rol del visitante en el servidor y consultar `recipes` con
// `conVisibilidad(rol)` de @/lib/visibilidad. Nada de filtrar en el JSX.

export default function PaginaPortada() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Recetario</h1>
      <p className="text-sm opacity-70">
        Andamiaje. El listado de recetas llega en la fase 7.
      </p>
    </main>
  );
}
