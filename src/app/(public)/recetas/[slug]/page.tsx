import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ObjectId } from "mongodb";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidad } from "@/lib/visibilidad";
import { rolActual, sesionActual } from "@/lib/sesion";
import { fechaDePublicacion, medida, urlConAncho } from "@/lib/formato";
import type { Ingrediente, RecetaDoc } from "@/models/receta";
import type { ImagenDoc } from "@/models/imagen";
import { CorazonGuardar } from "@/components/corazon-guardar";
import { IngredientesEscalables } from "@/components/ingredientes-escalables";
import { DatosFichaReceta } from "@/components/datos-ficha-receta";
import { CabeceraPublica } from "@/components/cabecera-publica";
import { PreparacionReceta } from "@/components/progreso-cocina";
import { ModoCocina } from "@/components/modo-cocina";
import { Revelado } from "@/components/revelado";
import { rutaImagen } from "@/lib/entrega-imagenes";
import { datosParaTarjetas, resumenParaTarjeta } from "@/lib/datos-tarjetas";
import { TarjetaReceta } from "@/components/tarjeta-receta";

// La ficha: lectura vertical, fotografía enmarcada, ingredientes con escalador
// compartido con el modo cocina, pasos con rotulillo, nota
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
    (await imagenes.find({ _id: { $in: [receta.portadaId, ...receta.pasos.map((paso) => paso.imagenId)].filter((id): id is ObjectId => id !== null) } }).toArray()).map((foto) => [
      foto._id.toHexString(),
      { ...foto, url: rutaImagen(foto._id.toHexString()) },
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
    description: receta.seo.descripcion || receta.resumen || receta.titulo,
    alternates: { canonical: `/recetas/${receta.slug}` },
    // Un borrador solo lo ve el admin, pero por si acaso: fuera de los indices.
    robots: receta.estado === "borrador" || receta.visibilidad !== "publica" ? { index: false, follow: false } : undefined,
    openGraph: {
      title: receta.titulo,
      description: receta.seo.descripcion || receta.resumen || receta.titulo,
      type: "article",
      images: portada ? [{ url: urlConAncho(portada.url, 1200), alt: portada.alt }] : undefined,
    },
  };
}

/** "150 g de harina", "6 huevo", "sal (al gusto)". Para el JSON-LD. */
function ingredienteATexto(ingrediente: Ingrediente): string {
  const cantidad = medida(ingrediente.cantidad, ingrediente.unidad);
  if (cantidad === null) {
    return ingrediente.nota ? `${ingrediente.nombre} (${ingrediente.nota})` : ingrediente.nombre;
  }
  if (ingrediente.unidad === "" || ingrediente.unidad === "unidad") {
    return `${cantidad} ${ingrediente.nombre}`;
  }
  return `${cantidad} de ${ingrediente.nombre}`;
}

/** JSON-LD de schema.org/Recipe. Solo se emite para recetas publicadas. */
function datosEstructurados(receta: RecetaDoc, fotos: Map<string, ImagenDoc>) {
  const portada = receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined;
  const pasos = [...receta.pasos].sort((a, b) => a.orden - b.orden);

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: receta.titulo,
    description: receta.seo.descripcion || receta.resumen || receta.titulo,
    ...(portada && { image: [new URL(urlConAncho(portada.url, 1200), process.env.BETTER_AUTH_URL).href] }),
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
        ...(foto && { image: new URL(urlConAncho(foto.url, 828), process.env.BETTER_AUTH_URL).href }),
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
  const { fotos: fotosDeSiguientes, guardadas: siguientesGuardadas } = await datosParaTarjetas(siguientes, sesion?.user.id);

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
    <PreparacionReceta recetaId={receta._id.toHexString()} version={receta.actualizadaEn.toISOString()} racionesBase={receta.raciones} pasoIds={pasos.map((paso) => paso.id)}>
    <CabeceraPublica />
    <main className="flex flex-col overflow-x-clip bg-superficie">
      {receta.estado === "publicada" && (
        <script
          nonce={(await headers()).get("x-nonce") ?? undefined}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            // El escape de "<" evita que un texto de receta pueda cerrar el script.
            __html: JSON.stringify(datosEstructurados(receta, fotos)).replace(/</g, "\\u003c"),
          }}
        />
      )}

      <article className={`pagina-ficha${portada ? "" : " ficha-sin-foto"}`} aria-labelledby="titulo-receta">
        <section className="ficha-introduccion" aria-label="Información de la receta">
          {receta.estado === "borrador" && (
            <span className="mb-4 inline-block rounded-full border border-tinta/30 px-3.5 py-1.5 text-xs text-tinta/60">
              borrador · solo lo ves tú
            </span>
          )}
          {fecha && <p className="ficha-fecha">{fecha}</p>}
          <Revelado orden={1}>
            <h1 id="titulo-receta" className="ficha-titulo">{receta.titulo}</h1>
          </Revelado>
          <Revelado orden={2}>
            {receta.resumen !== "" && <p className="ficha-resumen">{receta.resumen}</p>}
            <DatosFichaReceta tiempo={receta.tiempo} dificultad={receta.dificultad} />
          </Revelado>
          <div className="ficha-acciones">
            <ModoCocina titulo={receta.titulo} pasos={pasosDeCocina} ingredientes={receta.ingredientes} raciones={receta.raciones} minutos={receta.tiempo.total} />
            <CorazonGuardar recetaId={receta._id.toHexString()} guardada={laTieneGuardada} haySesion={sesion !== null} volverA={`/recetas/${receta.slug}`} />
          </div>
        </section>

        {portada && (
          <figure className="ficha-portada">
            <div className="marco-foto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={urlConAncho(portada.url, 1200)}
                srcSet={[640, 960, 1600].map((ancho) => `${urlConAncho(portada.url, ancho)} ${ancho}w`).join(", ")}
                sizes="(max-width: 760px) calc(100vw - 40px), (max-width: 1600px) 52vw, 800px"
                alt={portada.alt}
                width={portada.ancho}
                height={portada.alto}
                fetchPriority="high"
              />
            </div>
          </figure>
        )}

        {/* Mantiene el destino de «Retomar preparación» junto al escalador. */}
        <section id="preparacion" className="ficha-ingredientes" aria-label="Ingredientes y raciones">
          <IngredientesEscalables ingredientes={receta.ingredientes} racionesBase={receta.raciones} />
        </section>

        <section className="ficha-preparacion" aria-labelledby="titulo-pasos">
          <h2 id="titulo-pasos" className="sr-only">Preparación</h2>
          <ol className="ficha-pasos">
            {pasos.map((paso, indice) => {
              const foto = paso.imagenId ? fotos.get(paso.imagenId.toHexString()) : undefined;
              return (
                <li key={paso.id}>
                  <Revelado orden={1} className="ficha-paso">
                    <span className="ficha-paso-numero" aria-hidden="true">{String(indice + 1).padStart(2, "0")}</span>
                    <div className="min-w-0">
                      <h3 className={paso.titulo ? "ficha-paso-titulo" : "sr-only"}>{paso.titulo || `Paso ${indice + 1}`}</h3>
                      <p className="ficha-paso-texto">{paso.texto}</p>
                      {foto && (
                        <figure className="marco-foto ficha-paso-foto">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={urlConAncho(foto.url, 1024)} alt={foto.alt} width={foto.ancho} height={foto.alto} loading="lazy" />
                        </figure>
                      )}
                    </div>
                  </Revelado>
                </li>
              );
            })}
          </ol>
          {receta.notas && <aside className="ficha-nota"><p>{receta.notas}</p></aside>}
        </section>
      </article>

      {siguientes.length > 0 && (
        <section className="pagina-amplia border-t border-tinta/15 pb-14 pt-8">
          <div className="mb-7 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.2em] text-tinta/50">
            Sigue por aquí
          </div>
          <div className="rejilla-recetas ficha-siguientes">
            {siguientes.map((otra) => {
              const fotoDeOtra = otra.portadaId
                ? fotosDeSiguientes.get(otra.portadaId.toHexString())
                : undefined;
              return (
                <TarjetaReceta key={otra._id.toHexString()} receta={resumenParaTarjeta(otra)} foto={fotoDeOtra}
                  guardada={siguientesGuardadas.has(otra._id.toHexString())} haySesion={sesion !== null}
                  volverA={`/recetas/${receta.slug}`} nivelTitulo={3} />
              );
            })}
          </div>
        </section>
      )}
    </main>
    </PreparacionReceta>
  );
}
