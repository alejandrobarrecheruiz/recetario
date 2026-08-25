"use client";

import { useState } from "react";
import type { Ingrediente } from "@/models/receta";
import { formatearCantidad } from "@/lib/formato";

/**
 * La lista de ingredientes de la ficha: el escalador de raciones (la razón por
 * la que `cantidad`, `unidad` y `nombre` van separados en el modelo) más el
 * checklist del rediseño — cada fila se marca al tocarla y queda tachada, con
 * el contador «n de m listos» abajo.
 *
 * Es el único trozo de la ficha que necesita ser componente de cliente aparte
 * del modo cocina. Los datos ya llegaron filtrados del servidor; aquí solo se
 * multiplican y se tachan.
 */
export function IngredientesEscalables({
  ingredientes,
  racionesBase,
}: {
  ingredientes: Ingrediente[];
  racionesBase: number;
}) {
  const [raciones, setRaciones] = useState(racionesBase);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const factor = raciones / racionesBase;
  const listos = ingredientes.filter((ingrediente) => marcados[ingrediente.id]).length;

  const claseBotonEscala =
    "flex h-6.5 w-6.5 items-center justify-center rounded-full text-base leading-none text-tinta hover:bg-tinta/10 disabled:opacity-40";

  function medidaDe(ingrediente: Ingrediente): string {
    if (ingrediente.cantidad === 0) return "al gusto";
    return `${formatearCantidad(ingrediente.cantidad * factor)} ${ingrediente.unidad}`.trim();
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <span className="font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.18em] text-tinta/60">
          Ingredientes
        </span>
        <div className="flex items-center gap-0.5 rounded-full border border-tinta/20 p-[3px]">
          <button
            type="button"
            aria-label="Una ración menos"
            disabled={raciones <= 1}
            onClick={() => setRaciones((valor) => Math.max(1, valor - 1))}
            className={claseBotonEscala}
          >
            &minus;
          </button>
          <span className="min-w-9.5 text-center font-[family-name:var(--font-dm-mono)] text-xs">
            {raciones} p.
          </span>
          <button
            type="button"
            aria-label="Una ración más"
            onClick={() => setRaciones((valor) => valor + 1)}
            className={claseBotonEscala}
          >
            +
          </button>
        </div>
      </div>

      <ul className="flex flex-col">
        {ingredientes.map((ingrediente) => {
          const hecho = marcados[ingrediente.id] === true;
          return (
            <li key={ingrediente.id}>
              <button
                type="button"
                onClick={() =>
                  setMarcados((estado) => ({
                    ...estado,
                    [ingrediente.id]: !estado[ingrediente.id],
                  }))
                }
                className="flex w-full items-start gap-3 border-t border-tinta/10 py-2.75 text-left hover:bg-tinta/3"
              >
                <span
                  aria-hidden="true"
                  className={`mt-1.25 h-3 w-3 shrink-0 rounded-[2px] border border-tinta/40 ${
                    hecho ? "bg-acento" : "bg-transparent"
                  }`}
                />
                <span
                  className={`min-w-0 flex-1 text-base leading-[1.4] ${
                    hecho ? "line-through opacity-40" : ""
                  }`}
                >
                  <span className="font-semibold [font-variant-numeric:tabular-nums]">
                    {medidaDe(ingrediente)}
                  </span>{" "}
                  {ingrediente.nombre}
                  {ingrediente.nota && (
                    <span className="text-tinta/45"> — {ingrediente.nota}</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-tinta/15 pt-4 font-[family-name:var(--font-dm-mono)] text-[11px] uppercase tracking-[0.12em]">
        <span className="text-tinta/55">
          {listos === 0 ? "tócalos al tenerlos" : `${listos} de ${ingredientes.length} listos`}
        </span>
        {listos > 0 && (
          <button
            type="button"
            onClick={() => setMarcados({})}
            className="whitespace-nowrap text-acento"
          >
            Desmarcar
          </button>
        )}
      </div>
    </div>
  );
}
