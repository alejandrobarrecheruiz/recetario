import Link from "next/link";
import type { Filter } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual } from "@/lib/sesion";
import { duracion, urlConAncho } from "@/lib/formato";
import type { RecetaDoc } from "@/models/receta";
import type { ImagenDoc } from "@/models/imagen";
import { Revelado } from "@/components/revelado";
import { Marquesina } from "@/components/marquesina";
import { CapaParallax } from "@/components/parallax";

// La portada del rediseño «Mi libro de recetas» (fase 10): cubierta a sangre
// con el rótulo en Pinyon Script, las dos entradas grandes, la marquesina, la
// rejilla de recetas con filtros por categoría y la nota «Quién cocina aquí».
// El rol se resuelve EN EL SERVIDOR y toda consulta pasa por conVisibilidad:
// nada de filtrar en el JSX.

// La imagen fija de la cubierta vive en /public. Para probar otra opción basta
// con cambiar aquí el nombre (Portada.png, Portada-2.png, Portada-3.png);
// Portada-V.png es la vertical, para pantallas estrechas.
const imagenDeCubierta = "/Portada.png";
const imagenDeCubiertaVertical = "/Portada-V.png";

/** La cubierta a sangre: horizontal en pantalla ancha, vertical en el móvil. */
function ImagenDeCubierta() {
  return (
    <picture className="block h-full w-full">
      <source media="(max-width: 768px)" srcSet={imagenDeCubiertaVertical} />
      <img src={imagenDeCubierta} alt="" className="h-full w-full object-cover" />
    </picture>
  );
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * El rótulo de la casa: el nombre en Pinyon Script y la firma debajo. Sobre la
 * foto de la cubierta va dentro de una píldora traslúcida para que se lea, y
 * en el móvil se compacta (la firma se esconde: el nombre grande ya está en el
 * centro de la cubierta).
 */
function Marca({
  enlazada = false,
  sobreFoto = false,
}: {
  enlazada?: boolean;
  sobreFoto?: boolean;
}) {
  const contenido = (
    <span
      className={`flex flex-col gap-0.5 ${
        sobreFoto ? "rounded-full bg-papel/85 px-4.5 py-2 backdrop-blur-md" : ""
      }`}
    >
      <span
        className={`font-[family-name:var(--font-pinyon)] leading-[0.9] tracking-[0.01em] ${
          sobreFoto ? "text-[24px] sm:text-[31px]" : "text-[31px]"
        }`}
      >
        Mi libro de recetas
      </span>
      <span
        className={`pl-0.5 font-[family-name:var(--font-dm-mono)] text-[8.5px] uppercase tracking-[0.42em] text-tinta/50 ${
          sobreFoto ? "hidden sm:block" : ""
        }`}
      >
        Alejandro
      </span>
    </span>
  );
  return enlazada ? <Link href="/">{contenido}</Link> : contenido;
}

/**
 * La navegación de la portada. En pantallas estrechas las palabras se cambian
 * por iconos (toques de 44 px); con `sobreFoto`, todo va en una píldora
 * traslúcida para leerse encima de la imagen.
 */
function Navegacion({ sobreFoto = false }: { sobreFoto?: boolean }) {
  const claseEnlace =
    "flex h-11 items-center justify-center rounded-full sm:h-auto sm:px-3.5 sm:py-2";
  return (
    <nav
      className={`flex items-center font-[family-name:var(--font-dm-mono)] text-xs uppercase tracking-[0.14em] ${
        sobreFoto ? "gap-1 rounded-full bg-papel/85 p-1 backdrop-blur-md" : "gap-2"
      }`}
    >
      <Link href="/#recetas" aria-label="Recetas" className={`${claseEnlace} w-11 sm:w-auto`}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          className="sm:hidden"
          aria-hidden="true"
        >
          <rect x="4" y="4" width="7" height="7" />
          <rect x="13" y="4" width="7" height="7" />
          <rect x="4" y="13" width="7" height="7" />
          <rect x="13" y="13" width="7" height="7" />
        </svg>
        <span className="hidden sm:inline">Recetas</span>
      </Link>
      <Link
        href="/#nota"
        aria-label="Quién cocina"
        className={`${claseEnlace} w-11 sm:w-auto`}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="sm:hidden"
          aria-hidden="true"
        >
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-4 4-6 7-6s5.5 2 7 6" />
        </svg>
        <span className="hidden sm:inline">Quién cocina</span>
      </Link>
    </nav>
  );
}

function Pildoras({
  categorias,
  activa,
}: {
  categorias: string[];
  activa: string;
}) {
  const base =
    "rounded-full px-4 py-[9px] font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em]";
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href="/#recetas"
        className={
          activa === ""
            ? `${base} bg-tinta text-papel hover:text-papel`
            : `${base} border border-tinta/20 text-tinta/60`
        }
      >
        Todas
      </Link>
      {categorias.map((categoria) => (
        <Link
          key={categoria}
          href={`/?categoria=${encodeURIComponent(categoria)}#recetas`}
          className={
            categoria === activa
              ? `${base} bg-tinta text-papel hover:text-papel`
              : `${base} border border-tinta/20 text-tinta/60`
          }
        >
          {categoria}
        </Link>
      ))}
    </div>
  );
}

function TarjetaReceta({
  receta,
  foto,
  numero,
}: {
  receta: RecetaDoc;
  foto: ImagenDoc | undefined;
  numero: string;
}) {
  return (
    <Link
      href={`/recetas/${receta.slug}`}
      className="group relative block aspect-[4/5] overflow-hidden bg-raya-clara text-tinta"
    >
      {foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={urlConAncho(foto.url, 640)}
          alt={foto.alt}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]"
        />
      ) : (
        <div className="rayas-finas absolute inset-0 transition-transform duration-[1100ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.07]" />
      )}
      <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(222,230,233,0.96)_6%,rgba(222,230,233,0.7)_34%,rgba(222,230,233,0.04)_70%)]" />
      <div className="absolute left-5 top-4.5 flex items-center gap-2 font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[0.14em] text-tinta/50">
        <span>{numero}</span>
        {receta.estado === "borrador" && (
          <span className="rounded-full border border-tinta/30 px-2 py-0.5 text-[9px] uppercase tracking-[0.14em]">
            borrador
          </span>
        )}
      </div>
      <div className="absolute inset-x-5 bottom-5.5">
        <div className="mb-2.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[0.18em] text-acento">
          {receta.categorias[0] ?? "receta"} · {duracion(receta.tiempo.total)}
        </div>
        <div className="font-[family-name:var(--font-bricolage)] text-[29px] font-semibold leading-[1.02] tracking-[-0.032em]">
          {receta.titulo}
        </div>
        {receta.resumen !== "" && (
          <div className="mt-2 line-clamp-2 text-[14.5px] leading-[1.45] text-tinta/65">
            {receta.resumen}
          </div>
        )}
      </div>
    </Link>
  );
}

/** La firma «— Alejandro —» de la cubierta. */
function Firma() {
  return (
    <div className="flex items-center gap-4 font-[family-name:var(--font-dm-mono)] text-[clamp(9px,0.85vw,11px)] uppercase tracking-[0.44em] text-tinta/60">
      <span className="h-px w-[clamp(20px,4vw,54px)] bg-tinta/30" />
      <span>Alejandro</span>
      <span className="h-px w-[clamp(20px,4vw,54px)] bg-tinta/30" />
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

  // Numeración de cuaderno: la receta más antigua es la 01. Se calcula sobre
  // todo lo visible para el rol, no sobre el subconjunto filtrado, para que
  // una receta conserve su número también en las vistas de categoría.
  const cronologia = await recetas
    .find(conVisibilidad(rol), { projection: { slug: 1 } })
    .sort({ publicadaEn: 1 })
    .toArray();
  const numeroDe = new Map(
    cronologia.map((doc, indice) => [doc.slug, String(indice + 1).padStart(2, "0")]),
  );

  const idsDePortada = docs.flatMap((doc) => (doc.portadaId ? [doc.portadaId] : []));
  const fotos = new Map(
    (await imagenes.find({ _id: { $in: idsDePortada } }).toArray()).map((foto) => [
      foto._id.toHexString(),
      foto,
    ]),
  );
  const fotoDe = (receta: RecetaDoc) =>
    receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;

  const rejilla = (
    <div className="mt-0.5 grid gap-0.5 [grid-template-columns:repeat(auto-fill,minmax(320px,1fr))]">
      {docs.map((receta) => (
        <Revelado key={receta.slug} orden={1}>
          <TarjetaReceta
            receta={receta}
            foto={fotoDe(receta)}
            numero={numeroDe.get(receta.slug) ?? "—"}
          />
        </Revelado>
      ))}
    </div>
  );

  // --- Vista de búsqueda o categoría: cabecera estática y la rejilla. ---
  if (buscando) {
    return (
      <main className="flex min-h-svh flex-col">
        <header className="flex flex-wrap items-center justify-between gap-4 px-[clamp(20px,5vw,48px)] py-[clamp(18px,3.4vw,32px)]">
          <Marca enlazada />
          <Navegacion />
        </header>
        <section className="mx-auto w-full max-w-[1440px] flex-1 px-[clamp(20px,5vw,48px)] pb-24 pt-[clamp(20px,3vw,40px)]">
          <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6 border-b border-tinta/20 pb-6">
            <h2 className="font-[family-name:var(--font-bricolage)] text-[clamp(30px,3.6vw,52px)] font-extrabold leading-[0.95] tracking-[-0.035em]">
              Las recetas
            </h2>
            <Pildoras categorias={categorias} activa={categoria} />
          </div>
          {q !== "" && (
            <p className="mt-6 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.16em] text-tinta/50">
              resultados para «{q}»
            </p>
          )}
          {docs.length === 0 ? (
            <div className="flex flex-col gap-4 py-20">
              <p className="font-[family-name:var(--font-bricolage)] text-[clamp(26px,3vw,40px)] font-semibold leading-tight tracking-[-0.035em]">
                De eso aún no tenemos.
              </p>
              <p className="max-w-[44ch] text-[17px] leading-relaxed text-tinta/65">
                Pídenosla y puede que caiga la semana que viene.
              </p>
            </div>
          ) : (
            rejilla
          )}
        </section>
      </main>
    );
  }

  // --- El blog recién nacido, sin nada publicado. ---
  if (docs.length === 0) {
    return (
      <main className="relative flex min-h-svh flex-col overflow-hidden">
        <div className="absolute inset-0">
          <ImagenDeCubierta />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(222,230,233,0.94)_0%,rgba(222,230,233,0.6)_22%,rgba(222,230,233,0)_48%)]" />
        <div className="relative flex flex-1 flex-col items-center justify-center gap-3.5 px-8 text-center">
          <h1 className="font-[family-name:var(--font-pinyon)] text-[clamp(40px,10vw,110px)] leading-[0.84] tracking-[0.01em] [text-shadow:0_2px_22px_rgba(222,230,233,0.7)]">
            Mi libro de recetas
          </h1>
          <Firma />
          <p className="mt-10 font-[family-name:var(--font-bricolage)] text-[26px] font-semibold tracking-[-0.03em]">
            La primera está al fuego.
          </p>
          <p className="text-[16px] text-tinta/65">A partir de aquí, una receta cada semana.</p>
        </div>
      </main>
    );
  }

  // --- La portada completa. ---
  const semana = docs[0];

  return (
    <main className="flex flex-col overflow-x-clip">
      <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-[clamp(16px,5vw,48px)] py-[clamp(14px,3.4vw,32px)]">
        <Marca sobreFoto />
        <Navegacion sobreFoto />
      </header>

      <section className="relative flex min-h-svh flex-col overflow-hidden">
        <CapaParallax factor={0.18} className="absolute inset-x-0 -inset-y-[6%]">
          <ImagenDeCubierta />
        </CapaParallax>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(222,230,233,0.94)_0%,rgba(222,230,233,0.6)_22%,rgba(222,230,233,0)_48%)]" />
        <Revelado
          orden={2}
          className="relative z-[2] flex min-h-0 flex-1 flex-col items-center justify-center gap-3.5 px-[clamp(20px,5vw,48px)] pb-[clamp(14px,3vh,30px)] pt-[clamp(78px,11vh,116px)] text-center"
        >
          <h1 className="max-w-[14ch] font-[family-name:var(--font-pinyon)] text-[clamp(40px,min(8.4vw,13vh),132px)] leading-[0.84] tracking-[0.01em] [text-shadow:0_2px_22px_rgba(222,230,233,0.7)]">
            Mi libro de recetas
          </h1>
          <Firma />
        </Revelado>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-wrap items-stretch justify-between gap-[clamp(24px,4vw,56px)] px-[clamp(20px,5vw,48px)] pb-[clamp(36px,6vw,68px)] pt-[clamp(28px,5vw,56px)]">
        <Revelado orden={1} className="min-w-0 flex-1 basis-[320px]">
          <Link
            href={`/recetas/${semana.slug}`}
            className="flex items-start gap-5 border-t-2 border-tinta py-[clamp(20px,2.4vw,30px)] text-tinta hover:opacity-60"
          >
            <span className="mt-1 h-8.5 w-8.5 shrink-0 rounded-full bg-acento" />
            <span className="flex min-w-0 flex-col gap-2">
              <span className="font-[family-name:var(--font-bricolage)] text-[clamp(24px,2.6vw,36px)] font-extrabold leading-[1.02] tracking-[-0.038em]">
                Lo último que hice
              </span>
              <span className="max-w-[34ch] text-[15.5px] leading-[1.55] text-tinta/60">
                La receta de esta semana, entera: cantidades, pasos y las fotos que salieron.
              </span>
            </span>
          </Link>
        </Revelado>
        <Revelado orden={2} className="min-w-0 flex-1 basis-[320px]">
          <a
            href="#recetas"
            className="flex items-start gap-5 border-t-2 border-tinta/20 py-[clamp(20px,2.4vw,30px)] text-tinta hover:opacity-60"
          >
            <span className="mt-1 grid shrink-0 grid-cols-2 gap-1">
              <span className="h-[15px] w-[15px] bg-tinta" />
              <span className="h-[15px] w-[15px] bg-tinta/30" />
              <span className="h-[15px] w-[15px] bg-tinta/30" />
              <span className="h-[15px] w-[15px] bg-tinta" />
            </span>
            <span className="flex min-w-0 flex-col gap-2">
              <span className="font-[family-name:var(--font-bricolage)] text-[clamp(24px,2.6vw,36px)] font-extrabold leading-[1.02] tracking-[-0.038em]">
                Todas las recetas
              </span>
              <span className="max-w-[34ch] text-[15.5px] leading-[1.55] text-tinta/60">
                Las {docs.length} que hay hasta hoy, de la más nueva a la primera.
              </span>
            </span>
          </a>
        </Revelado>
      </section>

      <Marquesina
        frases={["Cada semana algo nuevo", "Cantidades de verdad", "Cocina de casa"]}
      />

      <section
        id="recetas"
        className="mx-auto w-full max-w-[1440px] scroll-mt-6 px-[clamp(20px,5vw,48px)] pb-10 pt-[clamp(56px,9vw,104px)]"
      >
        <Revelado
          orden={1}
          className="flex flex-wrap items-end justify-between gap-x-8 gap-y-6 border-b border-tinta/20 pb-6"
        >
          <h2 className="font-[family-name:var(--font-bricolage)] text-[clamp(30px,3.6vw,52px)] font-extrabold leading-[0.95] tracking-[-0.035em]">
            Las recetas
          </h2>
          <Pildoras categorias={categorias} activa="" />
        </Revelado>
        {rejilla}
      </section>

      <section
        id="nota"
        className="mx-auto w-full max-w-[1440px] scroll-mt-6 px-[clamp(20px,5vw,48px)] pb-[clamp(72px,10vw,130px)] pt-[clamp(64px,9vw,118px)]"
      >
        <div className="flex flex-wrap items-center gap-[clamp(28px,4vw,60px)]">
          <Revelado orden={1} className="relative aspect-square min-w-0 flex-1 basis-[340px]">
            <div className="rayas absolute inset-0" />
            <div className="absolute inset-x-0 bottom-0 bg-papel/90 p-6 font-[family-name:var(--font-bricolage)] text-xl font-semibold leading-[1.25] tracking-[-0.025em] backdrop-blur-lg">
              Cocinar para alguien es la forma más lenta de decir algo.
            </div>
          </Revelado>
          <Revelado orden={2} className="min-w-0 flex-1 basis-[380px]">
            <div className="mb-5.5 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.2em] text-acento">
              Quién cocina aquí
            </div>
            <p className="font-[family-name:var(--font-bricolage)] text-[clamp(22px,2.4vw,33px)] leading-[1.3] tracking-[-0.03em] [text-wrap:pretty]">
              Esto no es una revista. Es un cuaderno: subo una receta cuando la hago, con la
              foto que salga y las cantidades que uso de verdad. Si algo sale mal, también lo
              cuento.
            </p>
            <div className="relative mt-7 aspect-video overflow-hidden bg-raya-clara">
              <div className="rayas-finas deriva absolute -inset-[6%]" />
              <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-tinta/90 px-3 py-1.5 font-[family-name:var(--font-dm-mono)] text-[9.5px] uppercase tracking-[0.18em] text-papel">
                <span className="parpadea h-1.5 w-1.5 rounded-full bg-acento" />
                gif · bucle
              </div>
            </div>
            <p className="mt-6.5 max-w-[48ch] text-[17px] leading-[1.65] text-tinta/65">
              Empecé esto por una persona concreta. Ella ya sabe cuál es la receta 01.
            </p>
          </Revelado>
        </div>
      </section>
    </main>
  );
}
