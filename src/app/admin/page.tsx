import Link from "next/link";
import { obtenerRecetas } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual } from "@/lib/sesion";
import { CabeceraPanel } from "@/components/cabecera-panel";

// Listado de recetas del panel. El admin ve todo, borradores incluidos:
// `conVisibilidad("admin")` devuelve un filtro vacio. Aun asi la consulta pasa
// por el helper con el rol de la sesion, para que no haya ni una consulta de
// recetas que lo esquive. (La navegacion ya la corta el guard del layout.)
export default async function PaginaAdmin({ searchParams }: { searchParams: Promise<{ limpieza?: string }> }) {
  const { limpieza } = await searchParams;
  const rol = await rolActual();
  const coleccion = await obtenerRecetas();
  const recetas = await coleccion
    .find(conVisibilidad(rol))
    .sort({ actualizadaEn: -1 })
    .toArray();

  return (
    <main className="pagina-panel">
      <CabeceraPanel />
      {limpieza === "pendiente" && <p role="alert" className="rounded border border-acento/40 p-4 text-sm">La receta se ha borrado, pero algunas fotos no pudieron eliminarse de ImageKit. Sus metadatos se han conservado para poder localizarlas y reintentar la limpieza.</p>}

      <section className="panel-listado" aria-labelledby="titulo-panel">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 id="titulo-panel" className="panel-titulo">
            Las recetas
          </h1>
          <Link
            href="/admin/recetas/nueva"
            className="boton-panel"
          >
            Nueva receta
          </Link>
        </div>

        {recetas.length === 0 ? (
          <p className="panel-introduccion">La primera está al fuego. Empieza con «Nueva receta».</p>
        ) : (
          <ul role="list" className="flex flex-col">
            {recetas.map((receta) => (
              <li key={receta._id.toHexString()}>
                <Link
                  href={`/admin/recetas/${receta._id.toHexString()}/editar`}
                  className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-t border-tinta/10 py-3.5 text-tinta"
                >
                  <span className="min-w-0 break-words text-lg font-medium tracking-tight">
                    {receta.titulo}
                  </span>
                  <span
                    className="editor-estado"
                  >
                    {receta.estado === "publicada" ? "Publicada" : "Borrador"}
                  </span>
                  {receta.visibilidad === "registrada" && (
                    <span className="editor-estado">
                      Lectores registrados
                    </span>
                  )}
                  <span className="ml-auto text-sm text-tinta/60">
                    actualizada el {receta.actualizadaEn.toLocaleDateString("es-ES")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
