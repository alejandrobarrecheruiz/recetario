import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual, sesionActual } from "@/lib/sesion";
import { duracion, fechaDePublicacion, formatearCantidad, urlConAncho } from "@/lib/formato";
import type { Ingrediente, RecetaDoc } from "@/models/receta";
import type { ImagenDoc } from "@/models/imagen";
import { CorazonGuardar } from "@/components/corazon-guardar";
import { IngredientesEscalables } from "@/components/ingredientes-escalables";
import { Logo } from "@/components/logo";
import { PersonaCuenta } from "@/components/persona-cuenta";
import { ModoCocina } from "@/components/modo-cocina";
import { Revelado } from "@/components/revelado";
import { CapaParallax } from "@/components/parallax";

// La ficha: cubierta con parallax, ingredientes en
// tarjeta pegajosa con checklist y escalador, pasos con rotulillo, nota
// personal y «Sigue por aquí». La consulta pasa por conVisibilidad con el rol
// de la sesión: una receta que el visitante no puede ver responde notFound(),
// nunca "prohibida".
//
// `cache()` deduplica la consulta entre generateMetadata y la página: una sola
// ida a Mongo por petición.
const obtenerFicha = cache(async (slug: string) => {
  const rol = await rolActual();
  const { recetas, imagenes } = await obtenerColecciones();

  const receta = await recetas.findOne(conVisibilidad(rol, { slug }));
  if (!receta) return null;

  const fotos = new Map(
    (await imagenes.find({ recetaId: receta._id }).toArray()).map((foto) => [
      foto._id.toHexString(),
      foto,
    ]),
  );
  return { receta, fotos };
});

export async function generateMetadata({
  params,
}: PageProps<"/recetas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const ficha = await obtenerFicha(slug);
  if (!ficha) return {};

  const { receta, fotos } = ficha;
  const portada = receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;

  return {
    title: receta.titulo,
    description: receta.seo.descripcion,
    // Un borrador solo lo ve el admin, pero por si acaso: fuera de los indices.
    robots: receta.estado === "borrador" ? { index: false, follow: false } : undefined,
    openGraph: {
      title: receta.titulo,
      description: receta.seo.descripcion,
      type: "article",
      images: portada ? [{ url: urlConAncho(portada.url, 1200), alt: portada.alt }] : undefined,
    },
  };
}

/** "150 g de harina", "6 huevo", "sal (al gusto)". Para el JSON-LD. */
function ingredienteATexto(ingrediente: Ingrediente): string {
  if (ingrediente.cantidad === 0) {
    return ingrediente.nota ? `${ingrediente.nombre} (${ingrediente.nota})` : ingrediente.nombre;
  }
  const cantidad = formatearCantidad(ingrediente.cantidad);
  if (ingrediente.unidad === "" || ingrediente.unidad === "unidad") {
    return `${cantidad} ${ingrediente.nombre}`;
  }
  return `${cantidad} ${ingrediente.unidad} de ${ingrediente.nombre}`;
}

/** JSON-LD de schema.org/Recipe. Solo se emite para recetas publicadas. */
function datosEstructurados(receta: RecetaDoc, fotos: Map<string, ImagenDoc>) {
  const portada = receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;
  const pasos = [...receta.pasos].sort((a, b) => a.orden - b.orden);

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: receta.titulo,
    description: receta.seo.descripcion,
    ...(portada && { image: [urlConAncho(portada.url, 1200)] }),
    ...(receta.publicadaEn && { datePublished: receta.publicadaEn.toISOString() }),
    author: { "@type": "Person", name: "Alejandro" },
    inLanguage: "es",
    recipeYield: `${receta.raciones} raciones`,
    prepTime: `PT${receta.tiempo.preparacion}M`,
    cookTime: `PT${receta.tiempo.coccion}M`,
    totalTime: `PT${receta.tiempo.total}M`,
    ...(receta.categorias.length > 0 && { recipeCategory: receta.categorias }),
    ...(receta.etiquetas.length > 0 && { keywords: receta.etiquetas.join(", ") }),
    recipeIngredient: receta.ingredientes.map(ingredienteATexto),
    recipeInstructions: pasos.map((paso, indice) => {
      const foto = paso.imagenId ? fotos.get(paso.imagenId.toHexString()) : undefined;
      return {
        "@type": "HowToStep",
        position: indice + 1,
        ...(paso.titulo && { name: paso.titulo }),
        text: paso.texto,
        ...(foto && { image: urlConAncho(foto.url, 828) }),
      };
    }),
  };
}

export default async function PaginaReceta({
  params,
}: PageProps<"/recetas/[slug]">) {
  const { slug } = await params;
  const ficha = await obtenerFicha(slug);
  if (!ficha) notFound();

  const { receta, fotos } = ficha;
  const rol = await rolActual();
  const sesion = await sesionActual();
  const { recetas, guardadas } = await obtenerColecciones();

  const laTieneGuardada =
    sesion !== null &&
    (await guardadas.findOne(
      { usuarioId: new ObjectId(sesion.user.id), recetaId: receta._id },
      { projection: { _id: 1 } },
    )) !== null;

  const portada = receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;
  const pasos = [...receta.pasos].sort((a, b) => a.orden - b.orden);
  const fecha = fechaDePublicacion(receta.publicadaEn);

  // «Sigue por aquí»: las dos publicadas más recientes que no son esta.
  const siguientes = await recetas
    .find(conVisibilidad(rol, { slug: { $ne: slug }, estado: "publicada" }))
    .sort({ publicadaEn: -1 })
    .limit(2)
    .toArray();
  const idsDeSiguientes = siguientes.flatMap((doc) => (doc.portadaId ? [doc.portadaId] : []));
  const { imagenes } = await obtenerColecciones();
  const fotosDeSiguientes = new Map(
    (await imagenes.find({ _id: { $in: idsDeSiguientes } }).toArray()).map((foto) => [
      foto._id.toHexString(),
      foto,
    ]),
  );

  // El modo cocina es un componente de cliente: recibe los pasos ya resueltos
  // (URL de foto en vez de imagenId) y los ingredientes para tenerlos a mano.
  const pasosDeCocina = pasos.map((paso) => {
    const foto = paso.imagenId ? fotos.get(paso.imagenId.toHexString()) : undefined;
    return {
      id: paso.id,
      titulo: paso.titulo,
      texto: paso.texto,
      fotoUrl: foto ? urlConAncho(foto.url, 828) : null,
      fotoAlt: foto?.alt ?? "",
    };
  });

  return (
    <main className="flex flex-col overflow-x-clip">
      {receta.estado === "publicada" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // El escape de "<" evita que un texto de receta pueda cerrar el script.
            __html: JSON.stringify(datosEstructurados(receta, fotos)).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-tinta/15 bg-papel/85 px-[clamp(20px,5vw,48px)] py-2.5 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.16em] backdrop-blur-xl">
        <Logo tamano={40} />
        <div className="flex items-center gap-1">
          <CorazonGuardar
            recetaId={receta._id.toHexString()}
            guardada={laTieneGuardada}
            haySesion={sesion !== null}
            volverA={`/recetas/${receta.slug}`}
          />
          <PersonaCuenta />
          <ModoCocina
            titulo={receta.titulo}
            pasos={pasosDeCocina}
            ingredientes={receta.ingredientes}
            raciones={receta.raciones}
            minutos={receta.tiempo.total}
          />
        </div>
      </header>

      <section className="relative flex h-[70svh] min-h-[440px] items-end overflow-hidden">
        <CapaParallax factor={0.3} className="absolute inset-x-0 -inset-y-[10%]">
          {portada ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={urlConAncho(portada.url, 1600)}
              alt={portada.alt}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="rayas h-full w-full" />
          )}
        </CapaParallax>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(222,230,233,0.96)_0%,rgba(222,230,233,0.7)_26%,rgba(222,230,233,0.14)_60%,rgba(222,230,233,0.45)_100%)]" />
        <div className="relative max-w-[1200px] px-[clamp(20px,5vw,48px)] pb-[clamp(36px,5vw,60px)]">
          {receta.estado === "borrador" && (
            <span className="mb-4 inline-block rounded-full border border-tinta/30 px-3.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[0.18em] text-tinta/60">
              borrador · solo lo ves tú
            </span>
          )}
          <Revelado orden={1}>
            <h1 className="max-w-[15ch] font-[family-name:var(--font-bricolage)] text-[clamp(46px,7.4vw,118px)] font-extrabold leading-[0.87] tracking-[-0.045em]">
              {receta.titulo}
            </h1>
          </Revelado>
          <Revelado orden={2}>
            {receta.resumen !== "" && (
              <p className="mt-5.5 max-w-[44ch] text-[clamp(16px,1.5vw,19px)] leading-[1.6] text-tinta/70">
                {receta.resumen}
              </p>
            )}
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 font-[family-name:var(--font-dm-mono)] text-[11.5px] uppercase tracking-[0.16em] text-tinta/65">
              <span>
                {duracion(receta.tiempo.total)} · {receta.tiempo.preparacion} prep
              </span>
              <span>{receta.dificultad}</span>
              <span>{receta.raciones} raciones</span>
              {fecha && <span className="text-acento">{fecha}</span>}
            </div>
          </Revelado>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[1440px] flex-wrap items-start gap-[clamp(32px,4vw,76px)] px-[clamp(20px,5vw,48px)] pb-[clamp(72px,9vw,116px)] pt-[clamp(44px,6vw,68px)]">
        {/* Pegajosa SOLO con dos columnas: en columna única (móvil) una tarjeta
            sticky se desliza sobre los pasos y los tapa con su fondo blanco. */}
        <Revelado
          orden={1}
          className="min-w-0 max-w-[420px] flex-1 basis-[300px] border border-tinta/15 bg-superficie p-6.5 lg:sticky lg:top-[92px]"
        >
          <IngredientesEscalables
            ingredientes={receta.ingredientes}
            racionesBase={receta.raciones}
          />
        </Revelado>

        <div className="flex min-w-0 flex-1 basis-[480px] flex-col gap-[clamp(40px,5vw,60px)]">
          {pasos.map((paso, indice) => {
            const foto = paso.imagenId ? fotos.get(paso.imagenId.toHexString()) : undefined;
            return (
              <Revelado key={paso.id} orden={1} className="flex flex-col gap-3.5">
                <div className="flex items-center gap-3.5 border-b border-tinta/15 pb-3">
                  <span className="font-[family-name:var(--font-bricolage)] text-[26px] font-extrabold leading-none tracking-[-0.04em] text-acento">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <span className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[0.2em] text-tinta/60">
                    {paso.titulo ?? `Paso ${indice + 1}`}
                  </span>
                </div>
                <div>
                  <p className="max-w-[58ch] text-[clamp(17px,1.35vw,20px)] leading-[1.68] text-tinta/85 [text-wrap:pretty]">
                    {paso.texto}
                  </p>
                  {foto && (
                    <div className="relative mt-6 aspect-[16/10] overflow-hidden bg-raya-clara">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={urlConAncho(foto.url, 1024)}
                        alt={foto.alt}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </div>
                  )}
                </div>
              </Revelado>
            );
          })}

          {receta.notas && (
            <Revelado orden={1} className="border-l-2 border-acento bg-superficie px-9.5 py-8.5">
              <div className="mb-3.5 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.2em] text-acento">
                Nota personal
              </div>
              <p className="max-w-[52ch] font-[family-name:var(--font-bricolage)] text-[23px] leading-[1.35] tracking-[-0.03em]">
                {receta.notas}
              </p>
            </Revelado>
          )}
        </div>
      </section>

      {siguientes.length > 0 && (
        <section className="mx-auto w-full max-w-[1440px] border-t border-tinta/15 px-[clamp(20px,5vw,48px)] pb-[clamp(80px,10vw,124px)] pt-[clamp(44px,6vw,66px)]">
          <div className="mb-7 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.2em] text-tinta/50">
            Sigue por aquí
          </div>
          <div className="grid gap-0.5 [grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr))]">
            {siguientes.map((otra) => {
              const fotoDeOtra = otra.portadaId
                ? fotosDeSiguientes.get(otra.portadaId.toHexString())
                : undefined;
              return (
                <Link
                  key={otra.slug}
                  href={`/recetas/${otra.slug}`}
                  className="group relative block aspect-video overflow-hidden bg-raya-clara text-tinta"
                >
                  {fotoDeOtra ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={urlConAncho(fotoDeOtra.url, 828)}
                      alt={fotoDeOtra.alt}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
                    />
                  ) : (
                    <div className="rayas-finas absolute inset-0 transition-transform duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]" />
                  )}
                  <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(222,230,233,0.95),rgba(222,230,233,0.5)_42%,transparent_76%)]" />
                  <div className="absolute bottom-6 left-6.5 font-[family-name:var(--font-bricolage)] text-3xl font-semibold tracking-[-0.035em]">
                    {otra.titulo}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
