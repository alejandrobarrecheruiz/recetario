import Link from "next/link";
import { obtenerRecetas } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual } from "@/lib/sesion";

// Listado de recetas del panel. El admin ve todo, borradores incluidos:
// `conVisibilidad("admin")` devuelve un filtro vacio. Aun asi la consulta pasa
// por el helper con el rol de la sesion, para que no haya ni una consulta de
// recetas que lo esquive. (La navegacion ya la corta el guard del layout.)
export default async function PaginaAdmin() {
  const rol = await rolActual();
  const coleccion = await obtenerRecetas();
  const recetas = await coleccion
    .find(conVisibilidad(rol))
    .sort({ actualizadaEn: -1 })
    .toArray();

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium">Recetas</h2>
        <Link
          href="/admin/recetas/nueva"
          className="rounded border px-3 py-1.5 text-sm font-medium"
        >
          Nueva receta
        </Link>
      </div>

      {recetas.length === 0 ? (
        <p className="text-sm opacity-70">
          No hay recetas todavia. Crea la primera, o siembra ejemplos con{" "}
          <code>npm run seed:dev</code>.
        </p>
      ) : (
        <ul className="flex flex-col divide-y">
          {recetas.map((receta) => (
            <li key={receta._id.toHexString()}>
              <Link
                href={`/admin/recetas/${receta._id.toHexString()}/editar`}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-3"
              >
                <span className="font-medium">{receta.titulo}</span>
                <span className="rounded border px-1.5 text-xs opacity-70">
                  {receta.estado}
                </span>
                {receta.visibilidad === "registrada" && (
                  <span className="rounded border px-1.5 text-xs opacity-70">
                    solo registrados
                  </span>
                )}
                <span className="ml-auto text-xs opacity-60">
                  actualizada el {receta.actualizadaEn.toLocaleDateString("es-ES")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
