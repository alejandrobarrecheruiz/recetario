import Link from "next/link";
import { obtenerRecetas } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual } from "@/lib/sesion";
import { CabeceraPanel } from "@/components/cabecera-panel";

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

  const pildora =
    "rounded-full border px-2.5 py-0.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.14em]";

  return (
    <div className="mx-auto flex min-h-svh w-full max-w-[1100px] flex-col gap-8 px-[clamp(20px,4vw,40px)] py-8">
      <CabeceraPanel />

      <section className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-[family-name:var(--font-bricolage)] text-[clamp(26px,3vw,40px)] font-extrabold leading-none tracking-[-0.035em]">
            Las recetas
          </h2>
          <Link
            href="/admin/recetas/nueva"
            className="rounded-full bg-tinta px-5 py-2.75 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.14em] text-papel hover:bg-acento hover:text-papel"
          >
            Nueva receta
          </Link>
        </div>

        {recetas.length === 0 ? (
          <p className="text-[15px] text-tinta/60">
            No hay recetas todavía. Crea la primera, o siembra ejemplos con{" "}
            <code className="font-[family-name:var(--font-dm-mono)] text-[13px]">
              npm run seed:dev
            </code>
            .
          </p>
        ) : (
          <ul className="flex flex-col">
            {recetas.map((receta) => (
              <li key={receta._id.toHexString()}>
                <Link
                  href={`/admin/recetas/${receta._id.toHexString()}/editar`}
                  className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border-t border-tinta/10 py-3.5 text-tinta"
                >
                  <span className="font-[family-name:var(--font-bricolage)] text-lg font-semibold tracking-[-0.02em]">
                    {receta.titulo}
                  </span>
                  <span
                    className={`${pildora} ${
                      receta.estado === "borrador"
                        ? "border-acento/40 text-acento"
                        : "border-tinta/25 text-tinta/60"
                    }`}
                  >
                    {receta.estado}
                  </span>
                  {receta.visibilidad === "registrada" && (
                    <span className={`${pildora} border-tinta/25 text-tinta/60`}>
                      solo registradas
                    </span>
                  )}
                  <span className="ml-auto font-[family-name:var(--font-dm-mono)] text-[11px] text-tinta/50">
                    actualizada el {receta.actualizadaEn.toLocaleDateString("es-ES")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
