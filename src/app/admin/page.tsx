// TODO(fase 5): listado de recetas del panel.
//
// El admin ve todo, borradores incluidos: `conVisibilidad("admin")` devuelve un
// filtro vacio. Aun asi hay que pasar por el helper, para que no haya ni una
// consulta de recetas que lo esquive.

export default function PaginaAdmin() {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-medium">Recetas</h2>
      <p className="text-sm opacity-70">
        Andamiaje. El listado y la edicion llegan en la fase 5.
      </p>
    </section>
  );
}
