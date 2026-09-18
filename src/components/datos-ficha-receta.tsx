"use client";

import type { Receta } from "@/models/receta";
import { duracion } from "@/lib/formato";
import { DatosReceta } from "@/components/datos-receta";
import { usePreparacionReceta } from "@/components/progreso-cocina";

/** Las raciones reflejan el escalador; los tiempos conservan su valor original. */
export function DatosFichaReceta({ tiempo, dificultad }: Pick<Receta, "tiempo" | "dificultad">) {
  const { estado } = usePreparacionReceta();
  return (
    <div className="ficha-datos">
      <DatosReceta minutos={tiempo.total} raciones={estado.raciones} dificultad={dificultad} variante="ficha" />
      {(tiempo.preparacion > 0 || tiempo.coccion > 0) && (
        <dl className="ficha-desglose-tiempo">
          {tiempo.preparacion > 0 && <div><dt>Preparación</dt><dd>{duracion(tiempo.preparacion)}</dd></div>}
          {tiempo.coccion > 0 && <div><dt>Cocción</dt><dd>{duracion(tiempo.coccion)}</dd></div>}
        </dl>
      )}
    </div>
  );
}
