import Link from "next/link";
import type { Metadata } from "next";
import { obtenerColecciones } from "@/lib/mongo";
import { conVisibilidadAlimentos } from "@/lib/alimentos";
import { rutaImagen } from "@/lib/entrega-imagenes";
import { CabeceraPublica } from "@/components/cabecera-publica";
import { TarjetaAlimento } from "@/components/tarjeta-alimento";

export const metadata: Metadata = {
  title: "Despensa", description: "Alimentos que recomiendo, dónde comprarlos y los indispensables de mi despensa.",
  alternates: { canonical: "/despensa" },
};

export default async function PaginaDespensa({ searchParams }: { searchParams: Promise<{ indispensables?: string }> }) {
  const soloIndispensables = (await searchParams).indispensables === "1";
  const { alimentos, imagenes } = await obtenerColecciones();
  // La vista pública nunca muestra borradores, tampoco al administrador.
  const filtro = conVisibilidadAlimentos("publico", soloIndispensables ? { indispensable: true } : {});
  const docs = await alimentos.find(filtro).sort({ indispensable: -1, claveNombre: 1, _id: 1 }).toArray();
  const ids = docs.flatMap(alimento => alimento.fotoId ? [alimento.fotoId] : []);
  const fotos = new Map((ids.length ? await imagenes.find({ _id: { $in: ids } }).toArray() : [])
    .map(foto => [foto._id.toHexString(), { url: rutaImagen(foto._id.toHexString()), alt: foto.alt, ancho: foto.ancho, alto: foto.alto }]));
  return <>
    <CabeceraPublica />
    <main id="contenido" tabIndex={-1} className="min-h-svh bg-superficie py-8 sm:py-12">
      <div className="pagina-catalogo">
        <div className="catalogo-encabezado"><h1>Despensa</h1><p role="status">{docs.length} {docs.length === 1 ? "alimento" : "alimentos"}</p></div>
        <p className="despensa-introduccion">Alimentos que recomiendo, dónde encontrarlos y esos básicos que me gusta tener a mano.</p>
        <nav aria-label="Selección de alimentos" className="pestanas-despensa">
          <Link href="/despensa" aria-current={!soloIndispensables ? "page" : undefined} scroll={false}>Todos</Link>
          <Link href="/despensa?indispensables=1" aria-current={soloIndispensables ? "page" : undefined} scroll={false}>Indispensables</Link>
        </nav>
        {docs.length ? <div className="rejilla-despensa">
          {docs.map(alimento => <TarjetaAlimento key={alimento._id.toHexString()}
            alimento={{ _id: alimento._id.toHexString(), nombre: alimento.nombre, recomendacion: alimento.recomendacion, indispensable: alimento.indispensable, compras: alimento.compras }}
            foto={alimento.fotoId ? fotos.get(alimento.fotoId.toHexString()) : undefined} />)}
        </div> : <div className="py-8">
          <h2 className="text-3xl leading-tight tracking-tight">{soloIndispensables ? "Los indispensables están por llegar." : "La despensa está tomando forma."}</h2>
          <p className="mt-3 text-base leading-relaxed text-tinta/65">{soloIndispensables ? "Puedes explorar el resto de alimentos recomendados." : "Aquí iré compartiendo mis recomendaciones."}</p>
        </div>}
      </div>
    </main>
  </>;
}
