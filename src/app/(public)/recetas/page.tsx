import Link from "next/link";
import Form from "next/form";
import type { Metadata } from "next";
import { obtenerColecciones } from "@/lib/mongo";
import { rolActual, sesionActual } from "@/lib/sesion";
import { filtroCatalogo, normalizarFiltrosCatalogo, ORDEN_CATALOGO, rutaCatalogo } from "@/lib/catalogo";
import { datosParaTarjetas, resumenParaTarjeta } from "@/lib/datos-tarjetas";
import { CabeceraPublica } from "@/components/cabecera-publica";
import { TarjetaReceta } from "@/components/tarjeta-receta";
import { RetomarPreparacion } from "@/components/progreso-cocina";
import { TiraCategorias } from "@/components/tira-categorias";
import { RecordarCatalogo } from "@/components/retorno-catalogo";

export const metadata: Metadata = { title: "Recetas", alternates: { canonical: "/recetas" } };

export default async function PaginaCatalogo({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parametros = await searchParams;
  const { q, categoria } = normalizarFiltrosCatalogo(parametros);
  const formularioVisible = parametros.buscar === "1";
  const filtrando = q !== "" || categoria !== "";
  const rol = await rolActual();
  const sesion = await sesionActual();
  const { recetas } = await obtenerColecciones();
  const [docs, categorias] = await Promise.all([
    recetas.find(filtroCatalogo(rol, q, categoria)).sort(ORDEN_CATALOGO).toArray(),
    recetas.distinct("categorias", filtroCatalogo(rol)),
  ]);
  const { fotos, guardadas } = await datosParaTarjetas(docs, sesion?.user.id);
  const volverA = rutaCatalogo(q, categoria, formularioVisible);

  return (
    <>
      <CabeceraPublica />
      <main id="recetas" className="min-h-svh bg-superficie">
        <RecordarCatalogo ruta={volverA}>
        <div className="pagina-catalogo py-8 sm:py-12">
          <div className="catalogo-encabezado"><h1>Recetas</h1><p role="status">{docs.length} {docs.length === 1 ? "receta" : "recetas"}</p></div>
          {/* La lupa es la entrada habitual. Esta ruta también funciona sin JS. */}
          {formularioVisible && (
            <Form action="/recetas" role="search" className="mt-6 flex max-w-xl flex-wrap items-end gap-3">
              <input type="hidden" name="buscar" value="1" />
              {categoria && <input type="hidden" name="categoria" value={categoria} />}
              <label htmlFor="buscar-catalogo" className="min-w-0 flex-1 basis-48 text-sm">
                Plato o ingrediente
                <input key={q} id="buscar-catalogo" name="q" type="search" maxLength={120} defaultValue={q} className="mt-2 block min-h-11 w-full min-w-0 border-b border-raya-oscura bg-transparent py-2 text-base" />
              </label>
              <button type="submit" className="min-h-11 px-3 text-sm text-acento">Buscar</button>
            </Form>
          )}
          {categorias.length > 0 && (
            <TiraCategorias categorias={categorias.filter(Boolean).sort((a, b) => a.localeCompare(b, "es"))} categoria={categoria} q={q} formularioVisible={formularioVisible} />
          )}
          {filtrando && <div className="catalogo-filtros-activos"><p>{q && `«${q}»`}{q && categoria && " · "}{categoria}</p><Link href={rutaCatalogo("", "", formularioVisible)} scroll={false}>Quitar filtros</Link></div>}
          <RetomarPreparacion recetas={docs.map((receta) => ({ recetaId: receta._id.toHexString(), version: receta.actualizadaEn.toISOString(), titulo: receta.titulo, slug: receta.slug }))} />
          {docs.length === 0 ? (
            <div className="py-8">
              <h2 className="font-display text-3xl leading-tight tracking-tight">{filtrando ? "De eso aún no tenemos." : "La primera está al fuego."}</h2>
              <p className="mt-3 text-base leading-relaxed text-tinta/65">{filtrando ? "Prueba con otro plato o ingrediente, o quita los filtros." : "A partir de aquí, una receta cada semana."}</p>
            </div>
          ) : (
            <div className="rejilla-recetas">
              {docs.map((receta) => (
                <TarjetaReceta key={receta._id.toHexString()} receta={resumenParaTarjeta(receta)} foto={receta.portadaId ? fotos.get(receta.portadaId.toHexString()) : undefined} guardada={guardadas.has(receta._id.toHexString())} haySesion={sesion !== null} volverA={volverA} />
              ))}
            </div>
          )}
        </div>
        </RecordarCatalogo>
      </main>
    </>
  );
}
