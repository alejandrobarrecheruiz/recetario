"use client";

import type { Ingrediente } from "@/models/receta";
import { medida } from "@/lib/formato";
import { IconoRaciones } from "@/components/datos-receta";
import { usePreparacionReceta } from "@/components/progreso-cocina";

/** Lista de lectura con cantidades escaladas, compartida por ficha y cocina. */
export function IngredientesEscalables({ ingredientes, racionesBase }: {
  ingredientes: Ingrediente[];
  racionesBase: number;
}) {
  const { estado: { raciones }, enviar } = usePreparacionReceta();
  const factor = raciones / racionesBase;

  return (
    <div className="ingredientes-escalables">
      <div className="ingredientes-cabecera">
        <h2 className="ficha-titulo-seccion">Ingredientes</h2>
        <div className="control-raciones" role="group" aria-label="Ajustar raciones">
          <button type="button" aria-label="Una ración menos" disabled={raciones <= 1} onClick={() => enviar({ tipo: "raciones", cambio: -1 })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14" /></svg>
          </button>
          <output aria-label="Raciones" aria-live="polite" aria-atomic="true">
            <IconoRaciones />{raciones}<span className="sr-only"> {raciones === 1 ? "ración" : "raciones"}</span>
          </output>
          <button type="button" aria-label="Una ración más" disabled={raciones >= Math.max(12, racionesBase)} onClick={() => enviar({ tipo: "raciones", cambio: 1 })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M12 5v14" /></svg>
          </button>
        </div>
      </div>
      <ul role="list" className="ingredientes-lista">
        {ingredientes.map((ingrediente) => {
          const cantidad = medida(ingrediente.cantidad * factor, ingrediente.unidad);
          return (
            <li key={ingrediente.id}>
              <span className="ingrediente-cantidad">{cantidad ?? "Al gusto"}</span>
              <span className="ingrediente-nombre">{ingrediente.nombre}
                {ingrediente.nota && (cantidad !== null || ingrediente.nota.trim().toLocaleLowerCase("es") !== "al gusto") && <span className="ingrediente-nota">{ingrediente.nota}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
