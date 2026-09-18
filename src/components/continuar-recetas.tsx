import Link from "next/link";

/** El desenfoque es decorativo: no anticipa ni oculta recetas restringidas. */
export function ContinuarRecetas({ restantes }: { restantes: number }) {
  const etiqueta = restantes > 0
    ? `${restantes} receta${restantes === 1 ? "" : "s"} más`
    : "Explorar recetas";

  return (
    <Link href="/recetas" className="continuar-recetas" aria-label={`${etiqueta}. Ir a todas las recetas`}>
      <span className="continuar-recetas-fondo" aria-hidden="true">
        <span /><span /><span /><span />
      </span>
      <span className="continuar-recetas-contenido">
        <span>{etiqueta}</span>
        <span className="continuar-recetas-flecha" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12h16m-7-7 7 7-7 7" />
          </svg>
        </span>
      </span>
    </Link>
  );
}
