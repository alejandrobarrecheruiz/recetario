import Link from "next/link";
import type { Filter } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual } from "@/lib/sesion";
import { urlConAncho } from "@/lib/imagenes";
import { fechaDePublicacion } from "@/lib/formato";
import type { RecetaDoc } from "@/models/receta";
import type { ImagenDoc } from "@/models/imagen";

// La portada especial (fase 7, sección 14 de CLAUDE.md): cubierta a pantalla
// completa con la foto de la semana y, al hacer scroll, la receta, el buscador
// y las anteriores. El rol se resuelve EN EL SERVIDOR y toda consulta pasa por
// conVisibilidad: nada de filtrar en el JSX.

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Chevron que invita a bajar. */
function FlechaAbajo() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function Lupa({ tamano }: { tamano: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function EtiquetaDeSeccion({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-filo pb-3 text-xs font-[family-name:var(--font-literata)] uppercase tracking-[2px] text-apagado">
      {children}
    </h2>
  );
}

function Buscador({
  q,
  categorias,
  categoriaActiva,
  mostrarTodas,
}: {
  q: string;
  categorias: string[];
  categoriaActiva: string;
  mostrarTodas: boolean;
}) {
  return (
    <div className="flex flex-col gap-3">
      <form action="/" className="flex items-center gap-3 rounded-full border border-filo bg-superficie px-5 py-3.5 text-apagado-medio focus-within:border-celeste-borde">
        <Lupa tamano={18} />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="¿Qué te apetece cocinar?"
          className="min-w-0 flex-1 bg-transparent text-base text-tinta outline-none placeholder:text-apagado-suave"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        {categorias.map((categoria) => (
          <Link
            key={categoria}
            href={`/?categoria=${encodeURIComponent(categoria)}`}
            className={
              categoria === categoriaActiva
                ? "rounded-full border border-celeste-borde bg-celeste-relleno px-4 py-2 text-sm text-tinta"
                : "rounded-full border border-filo px-4 py-2 text-sm text-apagado"
            }
          >
            {categoria}
          </Link>
        ))}
        {mostrarTodas && (
          <Link
            href="/"
            className="rounded-full border border-celeste-borde bg-celeste-relleno px-4 py-2 text-sm text-tinta"
          >
            todas las recetas
          </Link>
        )}
      </div>
    </div>
  );
}

function TarjetaPequena({
  receta,
  foto,
}: {
  receta: RecetaDoc;
  foto: ImagenDoc | undefined;
}) {
  const fecha = fechaDePublicacion(receta.publicadaEn);
  return (
    <Link href={`/recetas/${receta.slug}`} className="flex flex-col gap-2">
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlConAncho(foto.url, 480)}
          alt={foto.alt}
          loading="lazy"
          className="aspect-[4/3] w-full border border-filo object-cover"
        />
      ) : (
        <div className="aspect-[4/3] w-full border border-filo bg-filo-fino" />
      )}
      <span className="font-[family-name:var(--font-newsreader)] text-lg font-medium leading-snug">
        {receta.titulo}
      </span>
      <span className="text-[11px] uppercase tracking-[1px] text-apagado-medio">
        {receta.estado === "borrador" ? "borrador" : fecha}
      </span>
    </Link>
  );
}

/** El arranque del blog, sin recetas todavia: la olla con su vaho. */
function SinRecetasTodavia() {
  return (
    <div className="flex flex-col items-center gap-4 px-8 py-16 text-center">
      <svg width="72" height="72" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-apagado-suave" aria-hidden="true">
        <path d="M14 36h36v8a12 12 0 0 1-12 12H26a12 12 0 0 1-12-12z" />
        <path d="M10 36h44" />
        <path d="M25 28c0-4 4-5 4-9" className="vaho" />
        <path d="M35 28c0-4 4-5 4-9" className="vaho [animation-delay:0.8s]" />
      </svg>
      <p className="font-[family-name:var(--font-newsreader)] text-2xl font-medium">
        La primera está al fuego.
      </p>
      <p className="max-w-70 text-base leading-relaxed text-apagado">
        A partir de aquí, una receta cada semana.
      </p>
    </div>
  );
}

export default async function PaginaPortada({ searchParams }: PageProps<"/">) {
  const parametros = await searchParams;
  const q = typeof parametros.q === "string" ? parametros.q.trim() : "";
  const categoria = typeof parametros.categoria === "string" ? parametros.categoria : "";
  const buscando = q !== "" || categoria !== "";

  const rol = await rolActual();
  const { recetas, imagenes } = await obtenerColecciones();

  let filtroPropio: Filter<RecetaDoc> = {};
  if (q !== "") {
    const patron = { $regex: escaparRegex(q), $options: "i" };
    filtroPropio = {
      $or: [
        { titulo: patron },
        { resumen: patron },
        { categorias: patron },
        { etiquetas: patron },
        { "ingredientes.nombre": patron },
      ],
    };
  } else if (categoria !== "") {
    filtroPropio = { categorias: categoria };
  }

  const docs = await recetas
    .find(conVisibilidad(rol, filtroPropio))
    .sort({ publicadaEn: -1 })
    .toArray();
  const categorias = (await recetas.distinct("categorias", conVisibilidad(rol))).sort();

  const idsDePortada = docs.flatMap((doc) => (doc.portadaId ? [doc.portadaId] : []));
  const fotos = new Map(
    (await imagenes.find({ _id: { $in: idsDePortada } }).toArray()).map((foto) => [
      foto._id.toHexString(),
      foto,
    ]),
  );
  const fotoDe = (receta: RecetaDoc) =>
    receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;

  // --- Vista de busqueda o categoria: cabecera compacta y resultados. ---
  if (buscando) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col gap-8 px-6 pb-16">
        <header className="flex flex-col items-center gap-1 border-b border-filo pb-6 pt-10">
          <Link href="/" className="font-[family-name:var(--font-newsreader)] text-3xl font-medium">
            La cocina nos Une
          </Link>
        </header>

        <Buscador q={q} categorias={categorias} categoriaActiva={categoria} mostrarTodas={true} />

        {docs.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-4 py-10 text-center">
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="2" className="text-apagado-suave" aria-hidden="true">
              <circle cx="32" cy="32" r="24" />
              <circle cx="32" cy="32" r="13" strokeDasharray="3 6" strokeLinecap="round" />
            </svg>
            <p className="font-[family-name:var(--font-newsreader)] text-2xl font-medium">
              De eso aún no tenemos.
            </p>
            <p className="max-w-70 text-base leading-relaxed text-apagado">
              Pídenosla y puede que caiga la semana que viene.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3">
            {docs.map((receta) => (
              <TarjetaPequena key={receta.slug} receta={receta} foto={fotoDe(receta)} />
            ))}
          </section>
        )}
      </main>
    );
  }

  // --- El blog recien nacido, sin nada publicado. ---
  if (docs.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-col px-6">
        <header className="flex flex-col items-center gap-2 border-b border-filo pb-8 pt-14 text-center">
          <h1 className="font-[family-name:var(--font-newsreader)] text-4xl font-medium">
            La cocina nos Une
          </h1>
          <p className="font-[family-name:var(--font-newsreader)] italic text-apagado">
            de nuestra cocina a la tuya
          </p>
        </header>
        <SinRecetasTodavia />
      </main>
    );
  }

  // --- La portada completa: cubierta y, al bajar, el contenido. ---
  const semana = docs[0];
  const anteriores = docs.slice(1);
  const fotoDeSemana = fotoDe(semana);

  return (
    <main className="flex flex-col">
      <section className="relative flex min-h-svh flex-col items-center justify-end overflow-hidden bg-[#22333d]">
        {fotoDeSemana && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={urlConAncho(fotoDeSemana.url, 1080)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-black/0 via-black/20 to-black/60" />
        <div className="aparece relative flex flex-col items-center gap-3 px-8 pb-28 text-center">
          <h1 className="font-[family-name:var(--font-newsreader)] text-[40px] font-medium leading-tight text-[#fcfbf8]">
            La cocina nos Une
          </h1>
          <p className="font-[family-name:var(--font-newsreader)] italic text-[17px] text-[#fcfbf8]/75">
            de nuestra cocina a la tuya
          </p>
        </div>
        <a
          href="#semana"
          aria-label="Bajar al contenido"
          className="invita-a-bajar absolute bottom-6 flex h-11 w-11 items-center justify-center text-[#fcfbf8]"
        >
          <FlechaAbajo />
        </a>
      </section>

      <div className="mx-auto flex w-full max-w-lg flex-col gap-10 px-6 pb-16 pt-10">
        <section id="semana" className="flex flex-col gap-4 scroll-mt-6">
          <EtiquetaDeSeccion>La receta de esta semana</EtiquetaDeSeccion>
          <Link
            href={`/recetas/${semana.slug}`}
            className="flex flex-col gap-4 border border-filo bg-superficie p-3 pb-5"
          >
            {fotoDeSemana && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={urlConAncho(fotoDeSemana.url, 828)}
                alt={fotoDeSemana.alt}
                className="aspect-[4/3] w-full object-cover"
              />
            )}
            <div className="flex flex-col gap-2 px-2">
              <span className="font-[family-name:var(--font-newsreader)] text-[27px] font-semibold leading-tight">
                {semana.titulo}
              </span>
              <span className="text-base leading-relaxed text-apagado">{semana.resumen}</span>
              <span className="mt-1 text-xs uppercase tracking-[1.5px] text-apagado-medio">
                {semana.tiempo.total} min · {semana.dificultad}
                {semana.estado === "borrador"
                  ? " · borrador"
                  : ` · ${fechaDePublicacion(semana.publicadaEn)}`}
              </span>
            </div>
          </Link>
        </section>

        <section id="buscar" className="flex flex-col gap-4 scroll-mt-6">
          <EtiquetaDeSeccion>O busca entre las nuestras</EtiquetaDeSeccion>
          <Buscador q="" categorias={categorias} categoriaActiva="" mostrarTodas={false} />
        </section>

        {anteriores.length > 0 && (
          <section className="flex flex-col gap-4">
            <EtiquetaDeSeccion>Las anteriores</EtiquetaDeSeccion>
            <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3">
              {anteriores.map((receta) => (
                <TarjetaPequena key={receta.slug} receta={receta} foto={fotoDe(receta)} />
              ))}
            </div>
          </section>
        )}

        <footer className="border-t border-filo pt-6 text-center">
          <p className="font-[family-name:var(--font-newsreader)] italic text-apagado">
            una receta cada semana, hecha con cariño
          </p>
        </footer>
      </div>
    </main>
  );
}
