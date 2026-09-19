import Link from "next/link";
import type { ReactNode, Ref } from "react";
import type { Receta } from "@/models/receta";
import type { Imagen } from "@/models/imagen";
import { fechaDePublicacion, urlConAncho } from "@/lib/formato";
import { CorazonGuardar } from "@/components/corazon-guardar";
import { DatosReceta } from "@/components/datos-receta";

export type RecetaParaTarjeta = Pick<Receta, "_id" | "slug" | "titulo" | "resumen" | "publicadaEn" | "raciones" | "tiempo" | "dificultad" | "categorias">;

/** Tarjeta común, también en relacionadas; guardar nunca está dentro del enlace. */
export function TarjetaReceta({ receta, foto, guardada, haySesion, volverA, nivelTitulo = 2, accionGuardar, enlaceRef, variante = "normal" }: {
  receta: RecetaParaTarjeta;
  foto?: Pick<Imagen, "url" | "alt" | "ancho" | "alto">;
  guardada: boolean;
  haySesion: boolean;
  volverA: string;
  nivelTitulo?: 2 | 3;
  accionGuardar?: ReactNode;
  enlaceRef?: Ref<HTMLAnchorElement>;
  variante?: "normal" | "compacta";
}) {
  const Titulo = nivelTitulo === 2 ? "h2" : "h3";
  const compacta = variante === "compacta";
  return (
    <article className={`tarjeta-receta${foto ? "" : " tarjeta-receta-sin-foto"}${compacta ? " tarjeta-receta-compacta" : ""}`} aria-labelledby={`receta-${receta._id}`}>
      <Link ref={enlaceRef} href={`/recetas/${receta.slug}`} className="tarjeta-receta-enlace" aria-labelledby={`receta-${receta._id}`}>
        {foto && <span className="tarjeta-receta-foto">
          {/* ImageKit entrega el tamaño adecuado sin pasar por otro optimizador. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={urlConAncho(foto.url, 960)}
            srcSet={[240, 640, 960, 1200].map(ancho => `${urlConAncho(foto.url, ancho)} ${ancho}w`).join(", ")}
            sizes={compacta ? "auto, (max-width: 400px) 78vw, 280px" : "auto, (max-width: 679px) calc(100vw - 50px), (max-width: 1079px) 50vw, 33vw"}
            alt={foto.alt} width={foto.ancho} height={foto.alto} loading="lazy" decoding="async" />
        </span>}
        <div className="tarjeta-receta-cuerpo">
          {!compacta && <div className="tarjeta-receta-fecha" aria-hidden={receta.publicadaEn ? undefined : true}>
            {receta.publicadaEn && <time dateTime={receta.publicadaEn.toISOString()}>{fechaDePublicacion(receta.publicadaEn)}</time>}
          </div>}
          <Titulo id={`receta-${receta._id}`} className="tarjeta-receta-titulo">{receta.titulo}</Titulo>
          {!compacta && <p className="tarjeta-receta-resumen" aria-hidden={receta.resumen ? undefined : true}>{receta.resumen}</p>}
          <div className="tarjeta-receta-datos"><DatosReceta minutos={receta.tiempo.total} raciones={receta.raciones} dificultad={receta.dificultad} /></div>
        </div>
      </Link>
      <div className="tarjeta-receta-guardar">
        {accionGuardar ?? <CorazonGuardar recetaId={receta._id} guardada={guardada} haySesion={haySesion} volverA={volverA} conFondo={Boolean(foto)} />}
      </div>
    </article>
  );
}
