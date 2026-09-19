import { getImageProps } from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { obtenerColecciones } from "@/lib/mongo";
import { rolActual, sesionActual } from "@/lib/sesion";
import { filtroCatalogo, LIMITE_INICIO, normalizarFiltrosCatalogo, ORDEN_CATALOGO, rutaCatalogo } from "@/lib/catalogo";
import { datosParaTarjetas, resumenParaTarjeta } from "@/lib/datos-tarjetas";
import { TarjetaReceta } from "@/components/tarjeta-receta";
import { ContinuarRecetas } from "@/components/continuar-recetas";
import { CabeceraPublica } from "@/components/cabecera-publica";
import { RetomarPreparacion } from "@/components/progreso-cocina";
import { Marquesina } from "@/components/marquesina";
import { CapaParallax } from "@/components/parallax";

export const metadata: Metadata = { alternates: { canonical: "/" } };

/** La ilustración original: horizontal en escritorio, vertical en móvil. */
function ImagenDeCubierta() {
  const { props: horizontal } = getImageProps({ src: "/Portada.jpg", alt: "", width: 1536, height: 1024, sizes: "100vw", quality: 60, loading: "eager", fetchPriority: "high" });
  const { props: vertical } = getImageProps({ src: "/Portada-V.jpg", alt: "", width: 1024, height: 1536, sizes: "100vw", quality: 60 });
  return (
    <picture className="block h-full w-full">
      <source media="(max-width: 700px)" srcSet={vertical.srcSet} sizes={vertical.sizes} />
      <img {...horizontal} className="h-full w-full object-cover object-center" alt="" />
    </picture>
  );
}

function Cubierta() {
  return (
    <section className="cubierta-portada" aria-labelledby="titulo-portada">
      <CapaParallax factor={0.12} className="absolute inset-x-0 -inset-y-[10%]"><ImagenDeCubierta /></CapaParallax>
      <div className="cubierta-portada-contenido relative">
        <div className="cubierta-portada-rotulo text-center">
          <h1 id="titulo-portada" className="cubierta-portada-titulo mb-6 px-2 pt-2">Mi libro<br />de recetas</h1>
          <p className="flex items-center justify-center gap-3.5 font-rotulo text-[10px] uppercase tracking-[0.32em]">
            <span className="h-px w-7 bg-tinta/45" aria-hidden="true" />Alejandro<span className="h-px w-7 bg-tinta/45" aria-hidden="true" />
          </p>
        </div>
      </div>
    </section>
  );
}

export default async function PaginaPortada({ searchParams }: PageProps<"/">) {
  const parametros = await searchParams;
  const { q, categoria } = normalizarFiltrosCatalogo(parametros);
  // Conserva los enlaces anteriores: las búsquedas viven ahora en /recetas.
  if (parametros.q !== undefined || parametros.categoria !== undefined || parametros.buscar === "1") {
    redirect(rutaCatalogo(q, categoria, parametros.buscar === "1"));
  }

  const rol = await rolActual();
  const sesion = await sesionActual();
  const { recetas } = await obtenerColecciones();
  // El límite ocurre en Mongo, después de visibilidad y estado publicada.
  const [docs, total] = await Promise.all([
    recetas.find(filtroCatalogo(rol)).sort(ORDEN_CATALOGO).limit(LIMITE_INICIO).toArray(),
    recetas.countDocuments(filtroCatalogo(rol)),
  ]);
  const { fotos, guardadas } = await datosParaTarjetas(docs, sesion?.user.id);

  return (
    <>
      <CabeceraPublica />
      <main id="contenido" tabIndex={-1} className="bg-superficie">
        <Cubierta />
        <Marquesina frases={["Cocina de casa", "Una receta a la semana", "Mi libro de recetas"]} />
        <section id="recetas" className="pagina-catalogo scroll-mt-24 py-10 sm:py-14" aria-labelledby="titulo-recetas">
          <h2 id="titulo-recetas" className="sr-only">Recetas recientes</h2>
          {/* En inicio solo se puede retomar una de las tres recetas consultadas.
              El catálogo permite retomar cualquier receta visible de sus resultados. */}
          <RetomarPreparacion recetas={docs.map((receta) => ({ recetaId: receta._id.toHexString(), version: receta.actualizadaEn.toISOString(), titulo: receta.titulo, slug: receta.slug }))} />
          {docs.length === 0 ? (
            <div className="py-8">
              <p className="font-display text-3xl leading-tight tracking-tight">La primera está al fuego.</p>
              <p className="mt-3 text-base leading-relaxed text-tinta/65">A partir de aquí, una receta cada semana.</p>
            </div>
          ) : (
            <div className="seleccion-inicio">
              {docs.map((receta) => (
                <TarjetaReceta key={receta._id.toHexString()} receta={resumenParaTarjeta(receta)} foto={receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined} guardada={guardadas.has(receta._id.toHexString())} haySesion={sesion !== null} volverA="/#recetas" nivelTitulo={3} />
              ))}
            </div>
          )}
          {docs.length > 0 && <ContinuarRecetas restantes={Math.max(0, total - docs.length)} />}
        </section>
      </main>
    </>
  );
}
