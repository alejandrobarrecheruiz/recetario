import { Fragment } from "react";

/** Banda decorativa continua; CSS respeta la preferencia de movimiento reducido. */
export function Marquesina({ frases }: { frases: string[] }) {
  // Cada mitad idéntica cubre también un monitor ancho; el ciclo no deja un salto.
  const repetidas = Array.from({ length: 8 }, () => frases).flat();

  return (
    <div className="banda-frases">
      <div className="banda-frases-pista" aria-hidden="true">
        {[0, 1].map((copia) => (
          <div key={copia} className="banda-frases-grupo">
            {repetidas.map((frase, indice) => (
              <Fragment key={indice}>
                <span>{frase}</span>
                <span className="text-acento">/</span>
              </Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
