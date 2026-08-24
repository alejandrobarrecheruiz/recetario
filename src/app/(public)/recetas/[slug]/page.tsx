import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual } from "@/lib/sesion";
import { urlConAncho } from "@/lib/imagenes";
import { fechaDePublicacion } from "@/lib/formato";
import { IngredientesEscalables } from "@/components/ingredientes-escalables";

// TODO(fase 9): JSON-LD de schema.org/Recipe y metadatos de SEO desde `seo`.

// La ficha. La consulta pasa por conVisibilidad con el rol de la sesion: una
// receta que el visitante no puede ver responde notFound(), nunca "prohibida".
export default async function PaginaReceta({
  params,
}: PageProps<"/recetas/[slug]">) {
  const { slug } = await params;
  const rol = await rolActual();
  const { recetas, imagenes } = await obtenerColecciones();

  const receta = await recetas.findOne(conVisibilidad(rol, { slug }));
  if (!receta) notFound();

  const fotos = new Map(
    (await imagenes.find({ recetaId: receta._id }).toArray()).map((foto) => [
      foto._id.toHexString(),
      foto,
    ]),
  );
  const portada = receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;
  const pasos = [...receta.pasos].sort((a, b) => a.orden - b.orden);
  const fecha = fechaDePublicacion(receta.publicadaEn);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 pb-16">
      <header className="flex flex-col items-center border-b border-filo pb-5 pt-8">
        <Link href="/" className="font-[family-name:var(--font-newsreader)] text-xl font-medium">
          La cocina nos Une
        </Link>
      </header>

      {portada && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlConAncho(portada.url, 828)}
          alt={portada.alt}
          className="aspect-[4/3] w-full border border-filo object-cover"
        />
      )}

      <section className="flex flex-col gap-3">
        {receta.estado === "borrador" && (
          <span className="self-start rounded-full border border-filo px-3 py-1 text-xs uppercase tracking-[1.5px] text-apagado-medio">
            borrador · solo lo ves tú
          </span>
        )}
        <h1 className="font-[family-name:var(--font-newsreader)] text-[31px] font-semibold leading-tight">
          {receta.titulo}
        </h1>
        <p className="text-base leading-relaxed text-apagado">{receta.resumen}</p>
        <p className="text-xs uppercase tracking-[1.5px] text-apagado-medio">
          {receta.tiempo.preparacion} min de preparación · {receta.tiempo.coccion} de cocción ·{" "}
          {receta.dificultad}
          {fecha && ` · ${fecha}`}
        </p>
      </section>

      <IngredientesEscalables
        ingredientes={receta.ingredientes}
        racionesBase={receta.raciones}
      />

      <section className="flex flex-col gap-6">
        <h2 className="border-b border-filo pb-3 text-xs uppercase tracking-[2px] text-apagado">
          Pasos
        </h2>
        {pasos.map((paso, indice) => {
          const foto = paso.imagenId ? fotos.get(paso.imagenId.toHexString()) : undefined;
          return (
            <div key={paso.id} className="flex flex-col gap-3.5">
              <div className="flex gap-4">
                <span className="font-[family-name:var(--font-newsreader)] text-[46px] font-medium leading-none text-celeste-numero">
                  {indice + 1}
                </span>
                <p className="pt-2 text-lg leading-relaxed">{paso.texto}</p>
              </div>
              {foto && (
                <div className="ml-10.5 border border-filo bg-superficie p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlConAncho(foto.url, 828)}
                    alt={foto.alt}
                    loading="lazy"
                    className="w-full object-cover"
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      {receta.notas && (
        <section className="flex flex-col gap-3">
          <h2 className="border-b border-filo pb-3 text-xs uppercase tracking-[2px] text-apagado">
            Notas
          </h2>
          <p className="font-[family-name:var(--font-newsreader)] italic text-[17px] leading-relaxed text-apagado">
            {receta.notas}
          </p>
        </section>
      )}

      <footer className="flex flex-col items-center gap-4 border-t border-filo pt-6 text-center">
        <p className="font-[family-name:var(--font-newsreader)] italic text-apagado">
          una receta cada semana, hecha con cariño
        </p>
        <Link href="/" className="text-[15px] text-enlace">
          Volver a la portada
        </Link>
      </footer>
    </main>
  );
}
