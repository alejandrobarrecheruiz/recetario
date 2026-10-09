import type { Alimento } from "@/models/alimento";
import type { Imagen } from "@/models/imagen";
import { fechaDePublicacion, urlConAncho } from "@/lib/formato";

export function TarjetaAlimento({ alimento, foto }: {
  alimento: Pick<Alimento, "_id" | "nombre" | "recomendacion" | "indispensable" | "compras">;
  foto?: Pick<Imagen, "url" | "alt" | "ancho" | "alto">;
}) {
  return <article id={`alimento-${alimento._id}`} className="tarjeta-alimento" aria-labelledby={`nombre-${alimento._id}`}>
    {foto && <div className="tarjeta-alimento-foto">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={urlConAncho(foto.url, 640)} srcSet={[240, 640, 960, 1200].map(ancho => `${urlConAncho(foto.url, ancho)} ${ancho}w`).join(", ")}
        sizes="(max-width: 679px) calc(100vw - 36px), (max-width: 1079px) 50vw, 33vw"
        alt={foto.alt} width={foto.ancho} height={foto.alto} loading="lazy" decoding="async" />
    </div>}
    <div className="tarjeta-alimento-cuerpo">
      {alimento.indispensable && <p className="text-sm text-acento">Indispensable</p>}
      <h2 id={`nombre-${alimento._id}`}>{alimento.nombre}</h2>
      <p className="whitespace-pre-line leading-relaxed text-tinta/75">{alimento.recomendacion}</p>
      {alimento.compras.length > 0 && <section className="alimento-compras" aria-labelledby={`compras-${alimento._id}`}>
        <h3 id={`compras-${alimento._id}`} className="mb-2 text-sm font-semibold">Dónde comprarlo</h3>
        <ul role="list" className="flex flex-col gap-4">
          {alimento.compras.map(compra => <li key={compra.id}>
            {compra.url ? <a href={compra.url} className="enlace-compra" target="_blank" rel="noopener noreferrer">{compra.tienda}<span aria-hidden="true"> ↗</span><span className="sr-only"> (abre otra pestaña)</span></a> : <p className="font-medium">{compra.tienda}</p>}
            {compra.nota && <p className="mt-1 text-sm leading-relaxed text-tinta/70">{compra.nota}</p>}
            {compra.revisadoEn && <p className="mt-1 text-xs text-tinta/60">Revisado el <time dateTime={compra.revisadoEn.toISOString()}>{fechaDePublicacion(compra.revisadoEn)}</time></p>}
          </li>)}
        </ul>
      </section>}
    </div>
  </article>;
}
